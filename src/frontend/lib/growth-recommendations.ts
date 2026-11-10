import type {DigAccount,DigOpportunity} from './dig-types';
import type {BenchmarkCase} from './benchmark-types';
import {capabilities,type Signal} from './growth-engine';
export type GrowthKind='标杆匹配'|'合作延伸'|'待重启机会'|'客户动态';
export type GrowthRecommendation={id:string;customer:string;customerId?:string;title:string;kind:GrowthKind;priority:number;reason:string;action:string;owner?:string;sourceUrl?:string;matches:{item:BenchmarkCase;terms:string[]}[]};
const domains=[['算力','智算','GPU','推理卡','服务器','数据中心'],['数据治理','大数据','数据平台','数据中台'],['政务','网格化','政务网'],['安全','防火墙','等保','网络安全'],['备份','容灾','灾备'],['运维','维保','迁移'],['资产管理','资产盘点','资产智管'],['云服务','云资源','云平台'],['智慧水务','水利','水务'],['人工智能','智能问数','经营分析']];
function norm(s:string){return s.normalize('NFKC').toLowerCase()}
export function matchBenchmarks(name:string,cases:BenchmarkCase[]){
 const n=norm(name);
 return cases.map(item=>{const c=norm(item.name);const terms=domains.flatMap(group=>{const left=group.filter(t=>n.includes(norm(t))),right=group.filter(t=>c.includes(norm(t)));return left.length&&right.length?[`${left.join('/')} ↔ ${right.join('/')}`]:[]});const exact=domains.flat().filter(t=>n.includes(norm(t))&&c.includes(norm(t))).length;return {item,terms,exact};}).filter(x=>x.terms.length).sort((a,b)=>b.terms.length-a.terms.length||b.exact-a.exact||a.item.id.localeCompare(b.item.id)).slice(0,3);
}
export function won(o:DigOpportunity){return (o.actualAmount??0)>0||/已成单|已签约|已成交|赢单/.test(o.status+' '+o.stage)}
export function recommendGrowth(customers:DigAccount[],opps:DigOpportunity[],cases:BenchmarkCase[],signals:Signal[],now=Date.now()):GrowthRecommendation[]{
 const rows:GrowthRecommendation[]=[];
 const ids=new Map(customers.map(c=>[c.id,c]));
 const history=new Map<string,DigOpportunity[]>();
 for(const o of opps.filter(won))for(const id of o.customerIds)history.set(id,[...(history.get(id)||[]),o]);
 for(const o of opps.filter(o=>!won(o))){
 const matches=matchBenchmarks(o.name,cases);const stopped=/暂停|搁置|丢单|失单|取消|终止|关闭|无效/.test(o.status+' '+o.stage);
 const stamp=o.updatedAt?Date.parse(o.updatedAt):NaN;const stale=Number.isFinite(stamp)&&stamp<=now&&now-stamp>90*86400000;
 if(!matches.length&&!stopped&&!stale)continue;
 const customer=o.customerIds.map(id=>ids.get(id)?.name).filter(Boolean).join('、')||o.customerName;
 rows.push({id:`opp-${o.id}`,customer,customerId:o.customerIds.find(id=>ids.has(id)),title:o.name,kind:stopped||stale?'待重启机会':'标杆匹配',priority:(matches.length?60+Math.min(15,matches[0].terms.length*5):35)+(stopped?0:10),reason:[`商机阶段：${o.stage}；状态：${o.status}`,matches.length?`与标杆案例命中同类场景：${matches[0].terms.join('、')}`:'可回顾历史推进记录',stopped?'原商机已暂停或关闭，先核实原有阻碍是否变化':stale?'来源最后更新时间已超过90天，需核实当前进度':'尚未发现已成单标识，需销售确认当前状态'].join('。'),action:stopped?'先核实失单或暂停原因是否解除，再决定是否重启；不要直接按活跃商机推进。':'申请相关案例，核实客户当前需求、预算及决策节点，再安排一次有针对性的沟通。',owner:o.owner,sourceUrl:o.sourceUrl,matches});
 }
 // Without an opportunity brief, only explicit scene terms in the customer name qualify.
 const linked=new Set(opps.flatMap(o=>o.customerIds));
 for(const c of customers){if(linked.has(c.id))continue;const matches=matchBenchmarks(c.name,cases);if(!matches.length)continue;
 rows.push({id:`customer-${c.id}`,customer:c.name,customerId:c.id,title:'从同类场景标杆，核实首次合作切入点',kind:'标杆匹配',priority:40,reason:`当前快照中没有该客户的关联商机。客户名称与案例出现同类场景词：${matches[0].terms.join('、')}；这仅是线索，不能据此判断真实采购需求或历史成交情况。`,action:'先确认客户业务场景和合作现状，再申请相关案例准备沟通；需求核实后建立商机。',matches});
 }
 for(const [id,done] of history){const c=ids.get(id);if(!c)continue;const active=opps.filter(o=>o.customerIds.includes(id)&&!won(o)&&!/暂停|搁置|丢单|失单|取消|终止|关闭|无效/.test(o.status+' '+o.stage));const historical=done.map(o=>o.name).join('；');
 const suggestions=capabilities.filter(cap=>cap.terms.some(t=>norm(historical).includes(norm(t)))&&!active.some(o=>cap.terms.some(t=>norm(o.name).includes(norm(t)))));
 for(const cap of suggestions.slice(0,1)){const project=done.find(o=>cap.terms.some(t=>norm(o.name).includes(norm(t))))!;
 rows.push({id:`extend-${id}-${cap.id}`,customer:c.name,customerId:id,title:`${cap.name} · 配套与后续服务核实`,kind:'合作延伸',priority:55,reason:`已有成单记录“${project.name}”与${cap.family}相关。历史项目名称只能说明合作线索，不能确定已购产品或新增采购需求。`,action:`联系客户核实原项目当前使用情况和后续需求；结合${cap.name}讨论适用范围。${cap.limits}`,owner:project.owner,sourceUrl:project.sourceUrl,matches:matchBenchmarks(project.name,cases)});}
 }
 for(const s of signals){const c=customers.find(c=>norm(c.name)===norm(s.customer));if(!c)continue;
 rows.push({id:`signal-${s.id}`,customer:c.name,customerId:c.id,title:s.title,kind:'客户动态',priority:65,reason:`已接入公开信息：${s.kind}${s.published?`，发布时间${s.published}`:''}。需核实与客户实际需求的关联。`,action:'查看原始动态，核实主体、有效期及需求范围，再联系客户确认。',sourceUrl:s.url,matches:matchBenchmarks(s.title+' '+s.text,cases)});}
 return rows.sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
}
