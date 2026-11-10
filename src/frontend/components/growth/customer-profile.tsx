'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { Building2, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import type { ArchiveScore } from '@/lib/archive-score';
import { labels } from './profile-labels';
type Data = Record<string, unknown>;
type Archive = { id: string; name: string; creditCode: string; sourceUrl: string; observedAt: string; company: Data; summary: Data; records: Data[]; score: ArchiveScore };
const skip = new Set(['qccKey','sourceUrl','sourceImage','presentationAdmission']);
function shown(value: unknown) { return value !== null && value !== undefined && value !== ''; }
function pretty(value: unknown): string {
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (Array.isArray(value)) return value.map(pretty).join('、');
  if (value && typeof value === 'object') return Object.entries(value).map(([k,v]) => `${labels[k] || k}：${pretty(v)}`).join('；');
  return String(value ?? '');
}
function Fields({ data }: { data: Data }) {
  const entries = Object.entries(data).filter(([k,v]) => !skip.has(k) && shown(v));
  return <dl className="gp-fields">{entries.map(([key,value]) => <div key={key} className={pretty(value).length > 75 ? 'gp-field-wide' : ''}><dt>{labels[key] || key}</dt><dd>{pretty(value)}</dd></div>)}</dl>;
}
function Group({ title, records }: { title: string; records: Data[] }) {
  const columns = [...new Set(records.flatMap(r => Object.keys(r)))].filter(k => !skip.has(k) && k !== 'category' && records.some(r => shown(r[k])));
  return <section className="gp-panel" id={`profile-${title}`}><div className="gp-section-title"><h3>{title}</h3><span>{records.length} 条已录入记录</span></div><div className="gp-table-scroll" tabIndex={0} aria-label={`${title}，可滚动查看全部记录`}><table><thead><tr>{columns.map(k => <th key={k}>{labels[k] || k}</th>)}</tr></thead><tbody>{records.map((r,i) => <tr key={i}>{columns.map(k => <td key={k}>{shown(r[k]) ? pretty(r[k]) : ''}</td>)}</tr>)}</tbody></table></div></section>;
}
export default function CustomerProfile({name, industry, city, cooperation, signals}: { name: string; industry?: string; city?: string; cooperation: ReactNode; signals: ReactNode }) {
  const [archive,setArchive]=useState<Archive|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();setLoading(true);setArchive(null);setError('');fetch(`/api/dig/customer-profile?name=${encodeURIComponent(name)}`,{signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message);setArchive(d.archive);}).catch(e=>{if(e.name!=='AbortError')setError(e.message || '资料读取失败');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[name,revision]);
  const groups = new Map<string,Data[]>();
  archive?.records.forEach(r=>{const category=String(r.category || '其他资料');groups.set(category,[...(groups.get(category)||[]),r]);});
  const company=archive?.company;
  const riskData = (archive?.summary.legal || archive?.summary) as Data | undefined;
  const riskLabels = ['dishonestDebtors','dishonestDebtor','executedDebtors','executedDebtor','consumptionRestrictions','terminatedExecutionCases','equityFreezes'];
  const hits = riskLabels.filter(k=>typeof riskData?.[k]==='number' && Number(riskData[k])>0);
  const facts=company?Object.fromEntries(Object.entries(company).filter(([k])=>!['name','creditCode','tags'].includes(k))):{};
  return <div className="gp-profile">
    <header className="gp-hero"><div className="gp-hero-title"><Building2 size={29}/><div><span className="g-eyebrow">客户全景档案</span><h2>{name}</h2><p>{archive?.creditCode && `统一社会信用代码：${archive.creditCode}`}</p></div></div><div className="gp-tags">{[company?.status,industry,city,...(Array.isArray(company?.tags)?company.tags:[])].filter(shown).map((v,i)=><span key={i}>{pretty(v)}</span>)}</div><button className="gp-refresh" onClick={()=>setRevision(n=>n+1)} disabled={loading}><RefreshCw size={14}/>{loading?'读取中…':'刷新档案'}</button></header>
    {loading && <p role="status" className="gp-status">正在读取客户档案…</p>}
    {error && <p role="alert" className="gp-status">{error}<button className="g-text" onClick={()=>setRevision(n=>n+1)}>重新读取</button></p>}
    {archive && <>
      <div className="gp-top-grid"><aside className={`gp-score ${archive.score.score<60?'risk':''}`}><span>{archive.score.scoreType}</span><strong>{archive.score.score}<small> / 100</small></strong><b>{archive.score.score<60?'需关注风险':'经营参考'}</b><p>分数越高，已录入资料的参考评价越好。</p>{archive.score.dimensions?.map(([label,value,max])=><div className="gp-dimension" key={label}><span>{label}<b>{value} / {max}</b></span><progress value={value} max={max}/></div>)}<small>参考评分不替代正式准入或信用评级。</small></aside><section className="gp-panel gp-score-summary"><h3><ShieldCheck size={18}/>评分依据与关注事项</h3><p className="gp-decision">{archive.score.decision}</p>{archive.score.reasons.map((r,i)=><p key={i}>{r}</p>)}{hits.length>0&&<div className="gp-risk-tags">{hits.map(k=><span key={k}>{labels[k]} · {pretty(riskData?.[k])}条</span>)}</div>}<p className="gp-source">资料录入于 {new Date(archive.observedAt).toLocaleString('zh-CN')} · <a href={archive.sourceUrl} target="_blank" rel="noreferrer">查看企查查来源 <ExternalLink size={12}/></a></p></section></div>
      <nav className="gp-nav" aria-label="档案栏目"><a href="#profile-basic">基本资料</a><a href="#profile-metrics">企业与风险概览</a>{[...groups.keys()].map(title=><a href={`#profile-${title}`} key={title}>{title}</a>)}<a href="#profile-cooperation">合作商机</a></nav>
      <section className="gp-panel" id="profile-basic"><h3>基本资料</h3><Fields data={facts}/></section>
      <section className="gp-panel" id="profile-metrics"><h3>企业与风险概览</h3>{Object.entries(archive.summary).filter(([k])=>!skip.has(k)).map(([key,value])=>value&&typeof value==='object'&&!Array.isArray(value)?<div className="gp-metric-group" key={key}><h4>{labels[key]||key}</h4><Fields data={value as Data}/></div>:<Fields key={key} data={{[key]:value}}/>)}</section>
      {[...groups].map(([title,records])=><Group key={title} title={title} records={records}/>)}
    </>}
    <section className="gp-panel" id="profile-cooperation"><h3>合作与商机历史</h3>{cooperation}</section>
    <section className="gp-panel"><h3>公开需求与合作线索</h3>{signals}<p className="g-footnote">合作产品覆盖以合同、项目或人工核实结果为准。</p></section>
  </div>;
}
