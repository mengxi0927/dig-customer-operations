'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,BookOpen,ChevronDown,RefreshCw,Search,ListChecks,CheckCircle2,Info} from 'lucide-react';
import type {DigAccount,DigOpportunity} from '@/lib/dig-types';
import type {Signal} from '@/lib/growth-engine';
import {CASE_REQUEST_URL,type BenchmarkCase} from '@/lib/benchmark-types';
import {recommendGrowth,type GrowthRecommendation} from '@/lib/growth-recommendations';
import Dropdown from './dropdown';
import {fadeSwap} from './fade-swap';
type Progress={state:'跟进中'|'暂不跟进'|'已确认需求';note:string;date:string};
const tabs=['优先跟进','标杆匹配','合作延伸','待重启机会','客户动态'] as const;
const pageSize = 4;
const kindTones = {
  '标杆匹配': 'blue',
  '合作延伸': 'blue',
  '待重启机会': 'rose',
  '客户动态': 'neutral',
} satisfies Record<GrowthRecommendation['kind'], string>;

function OpportunityCard({ recommendation: r, progress, update, openCustomer }: {
  recommendation: GrowthRecommendation;
  progress?: Progress;
  update: (patch: Partial<Progress>) => void;
  openCustomer: () => void;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  return (
    <article className="og-card" onClick={event => {
      if (!(event.target instanceof Element) ||
          event.target.closest('a, button, label, input, textarea, select, details') ||
          window.getSelection()?.toString()) return;
      if (details.current) details.current.open = !details.current.open;
    }}>
      <div className="og-card-top">
        <span className="og-kind" data-tone={kindTones[r.kind]}>{r.kind}</span>
        {progress && <span className="og-state" data-state={progress.state}>{progress.state}</span>}
      </div>
      <h3>{r.title}</h3>
      <div className="og-card-meta">
        <button className="og-customer" onClick={openCustomer} disabled={!r.customerId}>
          {r.customer}<ArrowUpRight size={13} aria-hidden="true" />
        </button>
        {r.owner && <span>销售员：{r.owner}</span>}
      </div>
      <div className="og-next">
        <h4>建议下一步</h4>
        <p>{r.action}</p>
      </div>
      <details className="og-details" ref={details}>
        <summary>
          <BookOpen size={15} aria-hidden="true" />
          <span>推荐依据{r.matches.length > 0 && '与标杆案例'}</span>
          {r.matches.length > 0 && <small>{r.matches.length} 个案例</small>}
          <ChevronDown size={15} aria-hidden="true" />
        </summary>
        <div className="og-evidence">
          <p>{r.reason}</p>
          {r.sourceUrl && <a className="g-text" href={r.sourceUrl} target="_blank" rel="noreferrer">
            查看原始依据 <ArrowUpRight size={13} aria-hidden="true" />
          </a>}
        </div>
        {r.matches.length > 0 && <div className="og-benchmarks">
          <h4>可借鉴的标杆案例 <small>场景规则匹配 · 需销售核实适用性</small></h4>
          {r.matches.map(m => <div className="og-case" key={m.item.id}>
            <div>
              <strong>{m.item.name}</strong>
              <p>{[m.item.number, m.item.kind, m.item.unit].filter(Boolean).join(' · ')}</p>
              <span>匹配依据：{m.terms.join('、')}</span>
            </div>
            <a href={CASE_REQUEST_URL} target="_blank" rel="noreferrer" className="g-btn og-case-request">
              <BookOpen size={14} aria-hidden="true" /> 申请查看标杆案例 <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          </div>)}
        </div>}
      </details>
      <div className="og-actions">
        <button className="og-start" type="button" onClick={() => update({ state: '跟进中' })}>
          开始跟进<span className="og-start-emoji" aria-hidden="true">💪</span>
        </button>
        <button type="button" onClick={() => update({ state: '已确认需求' })}>
          <CheckCircle2 size={14} aria-hidden="true" /> 已确认需求
        </button>
        <button type="button" onClick={() => update({ state: '暂不跟进' })}>暂不跟进</button>
      </div>
      {progress && <div className="og-followup">
        <label>下次跟进日期
          <input type="date" aria-label={`${r.customer}下次跟进日期`} value={progress.date}
            onChange={e => update({ date: e.target.value })} />
        </label>
        <label>沟通备注
          <textarea placeholder="记录已核实的需求、原有阻碍或下一步安排" aria-label={`${r.customer}沟通备注`}
            value={progress.note} onChange={e => update({ note: e.target.value })} />
        </label>
      </div>}
    </article>
  );
}

export default function OpportunityGrowth({customers,opportunities,signals,onCustomer,feedLabel,demo=false}:{customers:DigAccount[];opportunities:DigOpportunity[];signals:Signal[];onCustomer:(c:DigAccount)=>void;feedLabel:string;demo?:boolean}){
 const [cases,setCases]=useState<BenchmarkCase[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[tab,setTab]=useState<string>('优先跟进'),[query,setQuery]=useState(''),[owner,setOwner]=useState(''),[page,setPage]=useState(1),[progress,setProgress]=useState<Record<string,Progress>>({}),[loadedKey,setLoadedKey]=useState(''),[storageError,setStorageError]=useState(''),[showDeferred,setShowDeferred]=useState(false);
 const listContent=useRef<HTMLDivElement>(null);
 const storageKey=`dig-growth-followup-${demo?'demo':'live'}`;
 useEffect(()=>{const valid:Record<string,Progress>={};try{const p=JSON.parse(localStorage.getItem(storageKey)||'{}');if(p&&typeof p==='object'&&!Array.isArray(p))for(const [id,value] of Object.entries(p)){const v=value as Progress;if(v&&['跟进中','暂不跟进','已确认需求'].includes(v.state)&&typeof v.note==='string'&&typeof v.date==='string')valid[id]=v;}}catch{setStorageError('本地跟进记录读取失败。');}setProgress(valid);setLoadedKey(storageKey);},[storageKey]);
 useEffect(()=>{if(loadedKey!==storageKey)return;try{localStorage.setItem(storageKey,JSON.stringify(progress));}catch{setStorageError('浏览器未能保存跟进记录，请保留备注后重试。');}},[progress,loadedKey,storageKey]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');setCases([]);if(demo){setLoading(false);return()=>controller.abort();}fetch('/api/dig/benchmarks',{signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.message);setCases(d.cases);}).catch(e=>{if(e.name!=='AbortError')setError(e.message||'案例读取失败');}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return()=>controller.abort();},[revision,demo]);
 const recommendations=useMemo(()=>recommendGrowth(customers,opportunities,cases,signals),[customers,opportunities,cases,signals]);
 const owners=[...new Set(recommendations.map(r=>r.owner).filter((v):v is string=>!!v))].sort();
 const filtered=recommendations.filter(r=>(tab==='优先跟进'||r.kind===tab)&&(!owner||r.owner===owner)&&(!query||[r.customer,r.title,r.reason,...r.matches.map(m=>m.item.name)].join(' ').toLowerCase().includes(query.toLowerCase()))&&(showDeferred||progress[r.id]?.state!=='暂不跟进'));
 const pageCount=Math.max(1,Math.ceil(filtered.length/pageSize)),current=Math.min(page,pageCount);
 const update=(id:string,patch:Partial<Progress>)=>setProgress(old=>({...old,[id]:{...(old[id]||{state:'跟进中',note:'',date:''}),...patch}}));
 const start = (current - 1) * pageSize;
 const visible = filtered.slice(start, start + pageSize);

 function changePage(next: number) {
   fadeSwap(listContent.current, () => {
     setPage(next);
     const list = listContent.current;
     if (list && list.getBoundingClientRect().top < 12) list.scrollIntoView({ block: 'start', behavior: 'instant' });
   });
 }

 return (
   <div className="og-workspace">
     <div className="og-metrics">
       {[
         ['可跟进建议', recommendations.filter(r => progress[r.id]?.state !== '暂不跟进').length],
         ['有案例可借鉴', recommendations.filter(r => r.matches.length).length],
         ['已接入标杆案例', cases.length],
         ['跟进中', recommendations.filter(r => progress[r.id]?.state === '跟进中').length],
       ].map(([label, value]) => <div key={label}>
         <span>{label}</span>
         <strong>{loading && label === '已接入标杆案例' ? '…' : error && label === '已接入标杆案例' ? '—' : value}</strong>
       </div>)}
     </div>
     {error && <div className="og-notice" role="alert">
       {error} 其他已有资料仍可用于生成跟进建议。
       <button onClick={() => setRevision(x => x + 1)}>重试案例读取</button>
     </div>}
     {demo && <p className="og-notice">演示模式：当前客户与商机为合成数据，不混入真实标杆案例。</p>}
     {storageError && <p role="alert" className="og-notice">{storageError}</p>}
     <div className="og-layout">
       <section className="g-card og-list">
         <div className="g-card-heading">
           <div><h2><ListChecks size={19} aria-hidden="true" />跟进建议</h2><p>按场景匹配、商机状态和更新时间排序。</p></div>
           <button className="g-text" onClick={() => setRevision(x => x + 1)} disabled={loading}>
             <RefreshCw size={14} aria-hidden="true" /> {loading ? '读取案例中' : '刷新案例'}
           </button>
         </div>
         <div className="og-tabs" role="tablist" aria-label="机会分类">
           {tabs.map(t => <button key={t} role="tab" aria-selected={tab === t}
             onClick={() => {
               if (t !== tab) fadeSwap(listContent.current, () => { setTab(t); setPage(1); });
             }}>
             {t}<span>{recommendations.filter(r =>
               (t === '优先跟进' || r.kind === t) && (showDeferred || progress[r.id]?.state !== '暂不跟进')
             ).length}</span>
           </button>)}
         </div>
         <div className="og-filters">
           <label className="g-search">
             <Search size={16} aria-hidden="true" />
             <input aria-label="搜索增长机会" placeholder="搜索客户、商机或标杆案例" value={query}
               onChange={e => { setQuery(e.target.value); setPage(1); }} />
           </label>
           <Dropdown label="按销售员筛选" value={owner} inline searchable
             options={[{ value: '', label: '全部销售员' }, ...owners]}
             onChange={value => { setOwner(value); setPage(1); }} />
           <label className="g-check">
             <input type="checkbox" checked={showDeferred}
               onChange={e => { setShowDeferred(e.target.checked); setPage(1); }} /> 显示暂不跟进
           </label>
         </div>
         <div className="og-page-content" ref={listContent}>
           {tab === '客户动态' && !signals.length ? (
             <div className="og-empty"><h3>当前尚无已接入的客户动态</h3><p>自动订阅源尚未提供数据。接入后，系统会按完整客户名称关联，销售无需粘贴招投标链接。</p></div>
           ) : !filtered.length && (
             <div className="og-empty"><h3>{loading ? '正在匹配案例' : '当前筛选下没有跟进建议'}</h3>
               <p>{error ? '案例源恢复后将重新匹配；可先查看合作延伸和待重启机会。' : '建议只基于已有证据生成，可调整搜索或筛选条件。'}</p>
             </div>
           )}
           <div className="og-cards">
             {visible.map(r => <OpportunityCard key={r.id} recommendation={r} progress={progress[r.id]}
               update={patch => update(r.id, patch)}
               openCustomer={() => {
                 const customer = customers.find(c => c.id === r.customerId);
                 if (customer) onCustomer(customer);
               }} />)}
           </div>
         </div>
         {filtered.length > 0 && <nav className="og-pagination" aria-label="跟进建议分页">
           <span aria-live="polite">共 {filtered.length.toLocaleString('zh-CN')} 条 · 当前 {start + 1}–{start + visible.length} 条</span>
           <button type="button" disabled={current === 1} onClick={() => changePage(current - 1)}>上一页</button>
           <span>{current} / {pageCount}</span>
           <button type="button" disabled={current === pageCount} onClick={() => changePage(current + 1)}>下一页</button>
         </nav>}
       </section>
       <aside className="g-card og-context" aria-label="数据与跟进说明">
         <div className="g-card-heading"><div><h2>数据与跟进</h2><p>确认依据后再推进机会。</p></div><Info size={17} aria-hidden="true" /></div>
         <dl>
           <div><dt>① 客户动态</dt><dd>{demo ? '当前显示合成演示信号' : feedLabel}</dd></div>
           <div><dt>② 建议依据</dt><dd>排序反映线索和客户场景的匹配程度，销售可展开查看推荐依据。</dd></div>
           <div><dt>③ 标杆案例</dt><dd>场景匹配的案例可作为参考，详情通过飞书表单申请。</dd></div>
           <div><dt>④ 跟进记录</dt><dd>状态、日期与备注保存在当前浏览器。日期用于记录下一步安排。</dd></div>
         </dl>
       </aside>
     </div>
   </div>
 );
}
