'use client';
import {useEffect,useMemo,useState} from 'react';
import {ArrowUpRight,BookOpen,RefreshCw,Search,Target,CheckCircle2} from 'lucide-react';
import type {DigAccount,DigOpportunity} from '@/lib/dig-types';
import type {Signal} from '@/lib/growth-engine';
import {CASE_REQUEST_URL,type BenchmarkCase} from '@/lib/benchmark-types';
import {recommendGrowth} from '@/lib/growth-recommendations';
type Progress={state:'跟进中'|'暂不跟进'|'已确认需求';note:string;date:string};
const tabs=['优先跟进','标杆匹配','合作延伸','待重启机会','客户动态'] as const;
export default function OpportunityGrowth({customers,opportunities,signals,onCustomer,demo=false}:{customers:DigAccount[];opportunities:DigOpportunity[];signals:Signal[];onCustomer:(c:DigAccount)=>void;demo?:boolean}){
 const [cases,setCases]=useState<BenchmarkCase[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[tab,setTab]=useState<string>('优先跟进'),[query,setQuery]=useState(''),[owner,setOwner]=useState(''),[page,setPage]=useState(1),[progress,setProgress]=useState<Record<string,Progress>>({}),[loadedKey,setLoadedKey]=useState(''),[storageError,setStorageError]=useState(''),[showDeferred,setShowDeferred]=useState(false);
 const storageKey=`dig-growth-followup-${demo?'demo':'live'}`;
 useEffect(()=>{const valid:Record<string,Progress>={};try{const p=JSON.parse(localStorage.getItem(storageKey)||'{}');if(p&&typeof p==='object'&&!Array.isArray(p))for(const [id,value] of Object.entries(p)){const v=value as Progress;if(v&&['跟进中','暂不跟进','已确认需求'].includes(v.state)&&typeof v.note==='string'&&typeof v.date==='string')valid[id]=v;}}catch{setStorageError('本地跟进记录读取失败。');}setProgress(valid);setLoadedKey(storageKey);},[storageKey]);
 useEffect(()=>{if(loadedKey!==storageKey)return;try{localStorage.setItem(storageKey,JSON.stringify(progress));}catch{setStorageError('浏览器未能保存跟进记录，请保留备注后重试。');}},[progress,loadedKey,storageKey]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');setCases([]);if(demo){setLoading(false);return()=>controller.abort();}fetch('/api/dig/benchmarks',{signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.message);setCases(d.cases);}).catch(e=>{if(e.name!=='AbortError')setError(e.message||'案例读取失败');}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort();},[revision,demo]);
 const recommendations=useMemo(()=>recommendGrowth(customers,opportunities,cases,signals),[customers,opportunities,cases,signals]);
 const owners=[...new Set(recommendations.map(r=>r.owner).filter((v):v is string=>!!v))].sort();
 const filtered=recommendations.filter(r=>(tab==='优先跟进'||r.kind===tab)&&(!owner||r.owner===owner)&&(!query||[r.customer,r.title,r.reason,...r.matches.map(m=>m.item.name)].join(' ').toLowerCase().includes(query.toLowerCase()))&&(showDeferred||progress[r.id]?.state!=='暂不跟进'));
 const pageCount=Math.max(1,Math.ceil(filtered.length/12)),current=Math.min(page,pageCount);
 const update=(id:string,patch:Partial<Progress>)=>setProgress(old=>({...old,[id]:{...(old[id]||{state:'跟进中',note:'',date:''}),...patch}}));
 return <div className="og-workspace">
 <section className="og-banner"><div><span className="g-eyebrow">从成功案例，找到下一次合作</span><h2>让每次跟进，都有一个具体的切入点</h2><p>关联客户与商机，借鉴已成单标杆；先核实需求，再推进机会。</p></div><BookOpen size={40}/></section>
 <div className="og-metrics">{[['可跟进建议',recommendations.filter(r=>progress[r.id]?.state!=='暂不跟进').length],['有案例可借鉴',recommendations.filter(r=>r.matches.length).length],['已接入标杆案例',cases.length],['跟进中',recommendations.filter(r=>progress[r.id]?.state==='跟进中').length]].map(([label,value])=><div key={label}><span>{label}</span><strong>{loading&&label==='已接入标杆案例'?'…':error&&label==='已接入标杆案例'?'—':value}</strong></div>)}</div>
 {error&&<div className="og-notice" role="alert">{error} 其他已有资料仍可用于生成跟进建议。<button onClick={()=>setRevision(x=>x+1)}>重试案例读取</button></div>}
 {demo&&<p className="og-notice">演示模式：当前客户与商机为合成数据，不混入真实标杆案例。</p>}
 {storageError&&<p role="alert" className="og-notice">{storageError}</p>}
 <section className="g-card og-list"><div className="g-card-heading"><div><h2><Target size={20}/> 下一步，联系谁</h2><p>依据场景命中、商机状态和更新时效排序；排序分不代表成交概率或客户风险评分。</p></div><button className="g-text" onClick={()=>setRevision(x=>x+1)} disabled={loading}><RefreshCw size={14}/> {loading?'读取案例中':'刷新案例'}</button></div>
 <div className="og-tabs" role="tablist" aria-label="机会分类">{tabs.map(t=><button key={t} role="tab" aria-selected={tab===t} onClick={()=>{setTab(t);setPage(1)}}>{t}<span>{recommendations.filter(r=>(t==='优先跟进'||r.kind===t)&&(showDeferred||progress[r.id]?.state!=='暂不跟进')).length}</span></button>)}</div>
 <div className="og-filters"><label className="g-search"><Search size={16}/><input aria-label="搜索增长机会" placeholder="搜索客户、商机或标杆案例" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/></label><select aria-label="按销售员筛选" value={owner} onChange={e=>{setOwner(e.target.value);setPage(1)}}><option value="">全部销售员</option>{owners.map(o=><option key={o}>{o}</option>)}</select><label><input type="checkbox" checked={showDeferred} onChange={e=>{setShowDeferred(e.target.checked);setPage(1)}}/> 显示暂不跟进</label></div>
 {tab==='客户动态'&&!signals.length&&<div className="og-empty"><h3>当前尚无已接入的客户动态</h3><p>自动订阅源尚未提供数据。接入后，系统会按完整客户名称关联，销售无需粘贴招投标链接。</p></div>}
 {!filtered.length&&!(tab==='客户动态'&&!signals.length)&&<div className="og-empty"><h3>{loading?'正在匹配案例':'当前筛选下没有跟进建议'}</h3><p>{error?'案例源恢复后将重新匹配；可先查看合作延伸和待重启机会。':'建议只基于已有证据生成，可调整搜索或筛选条件。'}</p></div>}
 <div className="og-cards">{filtered.slice((current-1)*12,current*12).map(r=><article className="og-card" key={r.id}><div className="og-card-top"><span className="og-kind">{r.kind}</span>{r.owner&&<span>销售员：{r.owner}</span>}{progress[r.id]&&<span className="og-state">{progress[r.id].state}</span>}</div><button className="og-customer" onClick={()=>{const c=customers.find(c=>c.id===r.customerId);if(c)onCustomer(c)}} disabled={!r.customerId}>{r.customer}<ArrowUpRight size={14}/></button><h3>{r.title}</h3><div className="og-evidence"><b>为什么推荐</b><p>{r.reason}</p></div><div className="og-next"><b>建议下一步</b><p>{r.action}</p></div>
 {r.matches.length>0&&<div className="og-benchmarks"><h4><BookOpen size={15}/> 可借鉴的标杆案例 <small>场景规则匹配 · 需销售核实适用性</small></h4>{r.matches.map(m=><div className="og-case" key={m.item.id}><div><strong>{m.item.name}</strong><p>{[m.item.number,m.item.kind,m.item.unit].filter(Boolean).join(' · ')}</p><span>匹配依据：{m.terms.join('、')}</span></div><a href={CASE_REQUEST_URL} target="_blank" rel="noreferrer" className="g-btn">申请查看标杆案例 <ArrowUpRight size={13}/></a></div>)}</div>}
 <div className="og-actions">{r.sourceUrl&&<a href={r.sourceUrl} target="_blank" rel="noreferrer">查看原始依据 ↗</a>}<button onClick={()=>update(r.id,{state:'跟进中'})}>开始跟进</button><button onClick={()=>update(r.id,{state:'已确认需求'})}><CheckCircle2 size={14}/> 已确认需求</button><button onClick={()=>update(r.id,{state:'暂不跟进'})}>暂不跟进</button></div>
 {progress[r.id]&&<div className="og-followup"><label>下次跟进日期<input type="date" aria-label={`${r.customer}下次跟进日期`} value={progress[r.id].date} onChange={e=>update(r.id,{date:e.target.value})}/></label><label>沟通备注<textarea placeholder="记录已核实的需求、原有阻碍或下一步安排" aria-label={`${r.customer}沟通备注`} value={progress[r.id].note} onChange={e=>update(r.id,{note:e.target.value})}/></label></div>}
 </article>)}</div>
 {filtered.length>0&&<div className="og-pagination"><span>共 {filtered.length} 条建议 · {current} / {pageCount} 页</span><button disabled={current===1} onClick={()=>setPage(current-1)}>上一页</button><button disabled={current===pageCount} onClick={()=>setPage(current+1)}>下一页</button></div>}
 </section><p className="g-footnote">案例详情通过飞书表单申请，不自动提交申请。跟进状态、日期及备注保存在当前浏览器，不写回飞书；跟进日期仅作记录，不会自动发送提醒。客户动态只显示已接入数据。</p></div>;
}
