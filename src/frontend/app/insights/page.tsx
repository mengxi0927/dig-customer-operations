"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, BriefcaseBusiness, Clock3, Info, Layers, Link2, RefreshCw, Search, TrendingUp, Users, X } from "lucide-react";
import snapshot from "@/lib/insight-snapshot.json";
import { Card } from "@/components/ui";
import { CustomerValueGrowth } from "@/components/customer-value-growth";

type Customer = typeof snapshot.customers[number];
type Opportunity = typeof snapshot.opportunities[number];
export type Account = Customer & { records: number; opportunities: Opportunity[]; revenue: number; pipeline: number; quadrant: string };
const ACTIVE = new Set(["待提报", "已确认", "已立项"]);
const money = (n: number) => n >= 10000 ? `${(n / 10000).toLocaleString("zh-CN", { maximumFractionDigits: 1 })} 万` : `${n.toLocaleString("zh-CN")} 元`;
const median = (a: number[]) => { const b = a.filter(n => n > 0).sort((x, y) => x - y); return b[Math.floor(b.length / 2)] || 1; };
const tabs = ["经营总览", "价值与增长", "行业与区域", "数据质量"];
const listTabs = ["待开发客户", "历史签约无在途", "交叉销售候选"];
const quadrants = ["首单突破", "重点维护", "分层培育", "挖掘新需求"];
const inputClass = "h-10 w-full rounded-lg border border-slate-200 bg-[var(--glass-control)] px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function CustomerInsightsPage() {
  const [tab, setTab] = useState("经营总览");
  const [listTab, setListTab] = useState(listTabs[0]);
  const [filters, setFilters] = useState({ period: "", department: "", owner: "", industry: "", region: "" });
  const [query, setQuery] = useState("");
  const [quadrant, setQuadrant] = useState("");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<{ title: string; customers?: Account[]; opportunities?: Opportunity[] } | null>(null);
  const accounts = useMemo(() => {
    const grouped = new Map<string, Customer & { records: number }>();
    snapshot.customers.forEach(c => { const old = grouped.get(c.key); grouped.set(c.key, old ? { ...old, records: old.records + 1 } : { ...c, records: 1 }); });
    const opportunities = new Map<string, Opportunity[]>();
    snapshot.opportunities.forEach(o => { if (o.customer) opportunities.set(o.customer, [...(opportunities.get(o.customer) || []), o]); });
    const rows = Array.from(grouped.values()).map(c => {
      const ops = opportunities.get(c.key) || [];
      return { ...c, opportunities: ops, revenue: ops.filter(o => o.status === "已签约").reduce((s, o) => s + o.actual, 0), pipeline: ops.filter(o => ACTIVE.has(o.status)).reduce((s, o) => s + o.amount, 0), quadrant: "" };
    });
    const revenueMid = median(rows.map(c => c.revenue)), pipelineMid = median(rows.map(c => c.pipeline));
    return rows.map(c => ({ ...c, quadrant: c.pipeline >= pipelineMid ? c.revenue >= revenueMid ? "重点维护" : "首单突破" : c.revenue >= revenueMid ? "挖掘新需求" : "分层培育" }));
  }, []);
  const start = filters.period === "3m" ? "2026-09-01" : filters.period === "6m" ? "2026-06-01" : filters.period === "year" ? "2026-01-01" : "";
  const filtered = useMemo(() => accounts.filter(c => (!start || c.date >= start) && (!filters.department || c.department === filters.department) && (!filters.owner || c.owner === filters.owner) && (!filters.industry || c.industry === filters.industry) && (!filters.region || c.region === filters.region)), [accounts, filters, start]);
  const keys = new Set(filtered.map(c => c.key));
  const isFiltered = Object.values(filters).some(Boolean);
  const ops = snapshot.opportunities.filter(o => (!isFiltered || keys.has(o.customer)) && (!start || o.date >= start));
  const active = ops.filter(o => ACTIVE.has(o.status));
  const overdue = active.filter(o => o.due && o.due < snapshot.asOf);
  const missingDate = ops.filter(o => o.status === "已签约" && !o.signed);
  const uncovered = filtered.filter(c => !c.opportunities.length);
  const covered = filtered.filter(c => c.opportunities.length);
  const historical = filtered.filter(c => c.opportunities.some(o => o.status === "已签约") && !c.opportunities.some(o => ACTIVE.has(o.status)));
  const crossSell = filtered.filter(c => c.opportunities.some(o => o.status === "已签约") && new Set(c.opportunities.filter(o => o.status === "已签约").map(o => o.unit).filter(Boolean)).size === 1);
  const list = (listTab === listTabs[0] ? uncovered : listTab === listTabs[1] ? historical : crossSell).filter(c => (!query || c.name.includes(query)) && (!quadrant || c.quadrant === quadrant));
  const updateFilter = (field: keyof typeof filters, value: string) => { setFilters(f => ({ ...f, [field]: value })); setPage(0); };
  const openCustomer = (c: Account) => setDetail({ title: c.name, customers: [c], opportunities: c.opportunities });
  const kpis = [
    { label: "客户记录", value: filtered.reduce((s, c) => s + c.records, 0), icon: Users, tone: "blue", click: () => setDetail({ title: "客户记录（按名称合并展示）", customers: filtered }) },
    { label: "去重客户", value: filtered.length, icon: Layers, tone: "violet", click: () => setDetail({ title: "去重客户", customers: filtered }) },
    { label: "有商机客户", value: covered.length, icon: TrendingUp, tone: "emerald", click: () => setDetail({ title: "有商机客户", customers: covered }) },
    { label: "未关联商机客户", value: uncovered.length, icon: Link2, tone: "amber", click: () => { setListTab(listTabs[0]); setPage(0); document.getElementById("growth-list")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "在途商机", value: active.length, icon: BriefcaseBusiness, tone: "violet", click: () => setDetail({ title: "在途商机", opportunities: active }) },
    { label: "预计签约逾期", value: overdue.length, icon: Clock3, tone: "rose", click: () => setDetail({ title: "预计签约逾期 · 待核查", opportunities: overdue }) },
  ];

  return <div className="space-y-5 animate-in">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold tracking-tight">客户洞察</h1><span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">Excel 快照 · 只读分析</span></div><p className="mt-2 text-sm text-slate-500">从客户资产到经营机会</p></div><span className="text-xs text-slate-400">数据截至：{snapshot.asOf}</span></div>
    <nav className="flex gap-4 overflow-x-auto border-b border-slate-200" aria-label="洞察分析维度">{tabs.map(t => <button key={t} onClick={() => setTab(t)} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-blue-600"}`}>{t}</button>)}</nav>
    <Card className="p-4"><div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]">{([ ["period", "统计周期"], ["department", "部门"], ["owner", "客户申请人"], ["industry", "行业"], ["region", "地区"] ] as const).map(([field, label]) => <label key={field} className="min-w-0"><span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span><select aria-label={label} value={filters[field]} onChange={e => updateFilter(field, e.target.value)} className={inputClass}><option value="">全部</option>{field === "period" ? <><option value="3m">近3个月</option><option value="6m">近6个月</option><option value="year">今年</option></> : Array.from(new Set(accounts.map(c => c[field]))).sort((a, b) => a.localeCompare(b, "zh-CN")).map(v => <option key={v} value={v}>{v}</option>)}</select></label>)}<button aria-label="重置筛选" title="重置筛选" onClick={() => { setFilters({ period: "", department: "", owner: "", industry: "", region: "" }); setPage(0); }} className="mt-5 rounded-lg border border-slate-200 px-3 text-slate-500 hover:bg-slate-50"><RefreshCw size={17}/></button></div></Card>
    {tab !== "价值与增长" && <><section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{kpis.map(({ label, value, icon: Icon, tone, click }) => <button key={label} onClick={click} className="dig-frost-card rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200"><div className="flex items-start justify-between gap-1"><div><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-[26px] font-bold tracking-tight">{value.toLocaleString("zh-CN")}</p></div><span className={`rounded-xl p-2 ${toneClass(tone)}`}><Icon size={18}/></span></div></button>)}</section>
    <Note>客户按名称去空格、统一括号初步去重；在途含待提报、已确认、已立项。统计周期按客户／商机申请日期分别筛选，未填日期不计入期间。</Note></>}

    {tab === "价值与增长" && <CustomerValueGrowth customers={filtered} onCustomer={openCustomer} onGroup={(title, customers) => setDetail({ title, customers })}/>}
    {tab === "经营总览" && <>
      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Card className="p-5"><div className="flex items-start justify-between gap-2"><div><h2 className="text-lg font-bold">客户价值与潜力</h2><p className="mt-1 text-xs text-slate-500">优先识别值得投入的客户 · 点击象限查看名单</p></div><span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">真实客户分布</span></div><div className="mt-5 flex gap-2"><span className="flex items-center text-xs text-slate-500 [writing-mode:vertical-rl]">在途商机潜力 →</span><div className="flex-1"><div className="grid h-[252px] grid-cols-2 grid-rows-2 overflow-hidden rounded-lg border border-slate-200">{quadrants.map((q, i) => { const members = filtered.filter(c => c.quadrant === q); return <button key={q} onClick={() => setDetail({ title: `${q} · ${members.length} 家客户`, customers: members })} className={`relative p-4 text-left transition hover:brightness-95 ${["bg-amber-50", "bg-emerald-50", "bg-violet-50", "bg-blue-50"][i]}`}><span className={`relative z-10 rounded-full px-2.5 py-1 text-xs font-semibold ${["bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700", "bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700"][i]}`}>{q}</span><p className="relative z-10 mt-2 text-xl font-bold text-slate-700">{members.length}<span className="ml-1 text-xs font-normal text-slate-500">家</span></p><p className="relative z-10 mt-1 text-[11px] text-slate-400">{["推动机会转化", "持续投入资源", "按需分层触达", "挖掘下一单"][i]}</p></button>; })}</div><p className="mt-2 text-center text-xs text-slate-500">历史签约贡献 →</p></div></div><p className="mt-3 text-[11px] leading-5 text-slate-400">以全量客户非零金额中位数划分高低；贡献按实际成单金额，潜力按在途预计金额。客户矩阵与机会名单按所选客户关联全部历史商机，不按商机期间截断。</p></Card>
        <Card className="p-5"><h2 className="text-lg font-bold">本周经营关注</h2><div className="mt-5 space-y-3">{[
          { count: overdue.length, unit: "条", label: "预计签约已逾期", action: "查看商机", icon: Clock3, tone: "amber", click: () => setDetail({ title: "预计签约已逾期", opportunities: overdue }) },
          { count: uncovered.length, unit: "家", label: "暂未关联商机", action: "查看客户", icon: Link2, tone: "blue", click: () => setDetail({ title: "暂未关联商机", customers: uncovered }) },
          { count: missingDate.length, unit: "条", label: "已签约缺少成单日期", action: "核查数据", icon: Layers, tone: "slate", click: () => setDetail({ title: "已签约缺少成单日期", opportunities: missingDate }) },
        ].map(({ count, unit, label, action, icon: Icon, tone, click }) => <button key={label} onClick={click} className="flex w-full flex-wrap items-center gap-3 rounded-xl border border-slate-100 px-3 py-4 text-left transition hover:border-blue-200 hover:bg-slate-50"><span className={`rounded-xl p-2 ${toneClass(tone)}`}><Icon size={21}/></span><span className="text-2xl font-bold">{count}<span className="ml-1 text-xs font-normal">{unit}</span></span><span className="flex-1 text-xs text-slate-600">{label}</span><span className={`inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold ${toneClass(tone)}`}>{action}<ArrowRight size={13}/></span></button>)}</div><div className="mt-5"><Note>日期逾期需核查，不直接代表客户风险。</Note></div></Card>
      </div>
      <Card id="growth-list" className="overflow-hidden"><div className="flex flex-wrap items-center gap-4 px-5 pt-5"><h2 className="text-lg font-bold">增长机会名单</h2><div className="flex max-w-full overflow-x-auto rounded-full bg-slate-100 p-1">{listTabs.map(t => <button key={t} onClick={() => { setListTab(t); setPage(0); }} className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition ${listTab === t ? "bg-white font-semibold text-blue-600 shadow-sm" : "text-slate-500"}`}>{t}</button>)}</div><span className="ml-auto text-xs text-slate-400">{list.length} 家客户</span></div><div className="flex flex-wrap gap-2 px-5 py-3"><div className="relative"><Search size={14} className="absolute left-3 top-3 text-slate-400"/><input aria-label="搜索机会客户" placeholder="搜索客户名称" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} className={`${inputClass} pl-9`}/></div><select aria-label="客户价值分层" value={quadrant} onChange={e => { setQuadrant(e.target.value); setPage(0); }} className={`${inputClass} !w-auto`}><option value="">全部价值分层</option>{quadrants.map(q => <option key={q}>{q}</option>)}</select></div><div className="overflow-x-auto"><table className="w-full min-w-[740px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["客户名称", "行业", "客户级别", "机会信号", "建议动作"].map(h => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{list.slice(page * 5, page * 5 + 5).map(c => <tr key={c.key} className="hover:bg-blue-50/30"><td className="max-w-[260px] px-5 py-4"><button className="text-left font-medium hover:text-blue-600" onClick={() => openCustomer(c)}>{c.name}</button></td><td className="max-w-[140px] px-5 py-4 text-xs text-slate-500">{c.industry}</td><td className="whitespace-nowrap px-5 py-4"><span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600">{c.level}</span></td><td className="px-5 py-4 text-xs text-slate-500">{listTab === listTabs[0] ? "本次快照未关联到签约客户商机" : listTab === listTabs[1] ? "有历史签约，暂无在途商机" : "已签业务集中于一个交付单元，待核查扩展需求"}</td><td className="whitespace-nowrap px-5 py-4"><button onClick={() => openCustomer(c)} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600">{listTab === listTabs[0] ? "查看客户" : "查看机会"}<ArrowRight size={13}/></button></td></tr>)}</tbody></table>{!list.length && <Empty/>}</div><div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-400"><span>交叉销售仅为候选，需进一步核实需求</span><div className="flex items-center gap-3"><button disabled={!page} onClick={() => setPage(p => p - 1)} className="disabled:opacity-30">上一页</button><span>{Math.min(page + 1, Math.max(1, Math.ceil(list.length / 5)))} / {Math.max(1, Math.ceil(list.length / 5))}</span><button disabled={(page + 1) * 5 >= list.length} onClick={() => setPage(p => p + 1)} className="disabled:opacity-30">下一页</button></div></div></Card>
    </>}
    {tab === "行业与区域" && <div className="grid gap-4 xl:grid-cols-2">{([ ["industry", "行业客户分布"], ["region", "地域客户分布"] ] as const).map(([field, title]) => <Card key={field} className="p-5"><h2 className="mb-5 text-lg font-bold">{title}</h2>{Array.from(new Set(filtered.map(c => c[field]))).map(label => ({ label, rows: filtered.filter(c => c[field] === label) })).sort((a, b) => b.rows.length - a.rows.length).slice(0, 10).map(({ label, rows }) => <button key={label} onClick={() => setDetail({ title: label, customers: rows })} className="mb-3 flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50"><span className="w-28 truncate text-xs text-slate-500">{label}</span><span className="h-2 flex-1 rounded-full bg-slate-100"><span className="block h-2 rounded-full bg-blue-500" style={{ width: `${rows.length / Math.max(filtered.length, 1) * 100}%` }}/></span><b className="text-sm">{rows.length}</b></button>)}{!filtered.length && <Empty/>}</Card>)}</div>}
    {tab === "数据质量" && <Card className="p-5"><h2 className="text-lg font-bold">优先补齐影响经营判断的数据</h2><div className="mt-4 divide-y divide-slate-100">{[
      { label: "客户级别未填写", customers: filtered.filter(c => c.level === "未分级") },
      { label: "客户编号未完成", customers: filtered.filter(c => !c.numbered) },
      { label: "客户申请日期未填写", customers: filtered.filter(c => !c.date) },
      { label: "客户名称合并记录", customers: filtered.filter(c => c.records > 1) },
    ].map(item => <button key={item.label} onClick={() => setDetail({ title: item.label, customers: item.customers })} className="flex w-full items-center justify-between py-5 text-sm hover:text-blue-600"><span>{item.label}</span><span className="flex items-center gap-4"><b>{item.customers.length} 家</b><ArrowRight size={15}/></span></button>)}</div><Note>名称相同仅作初步合并，不代表已核实为同一法律主体。页面不推算信用风险或资料完整率。</Note></Card>}
    <Note>点击指标、象限或名单查看明细。当前为上传文件快照，不随飞书数据自动更新。</Note>
    {detail && <DetailPanel detail={detail} close={() => setDetail(null)}/>}
  </div>;
}
function toneClass(tone: string) { return ({ blue: "bg-blue-50 text-blue-600", violet: "bg-violet-50 text-violet-600", emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", rose: "bg-rose-50 text-rose-600", slate: "bg-slate-100 text-slate-500" } as Record<string, string>)[tone]; }
function Note({ children }: { children: React.ReactNode }) { return <p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><Info size={14} className="mt-0.5 shrink-0"/>{children}</p>; }
function Empty() { return <p className="py-12 text-center text-sm text-slate-400">当前条件下暂无记录</p>; }
function DetailPanel({ detail, close }: { detail: { title: string; customers?: Account[]; opportunities?: Opportunity[] }; close: () => void }) {
  const [search, setSearch] = useState("");
  const customers = detail.customers?.filter(c => c.name.includes(search)) || [];
  const opportunities = detail.opportunities?.filter(o => `${o.name}${o.id}${o.customer}`.includes(search)) || [];
  return <Dialog.Root open onOpenChange={open => { if (!open) close(); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[7px]"/><Dialog.Content aria-describedby={undefined} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col dig-frost-dialog outline-none"><div className="flex shrink-0 items-start justify-between gap-4 border-b p-6"><Dialog.Title className="min-w-0 break-words text-lg font-bold">{detail.title}</Dialog.Title><Dialog.Close aria-label="关闭明细" className="shrink-0 rounded-lg p-2 hover:bg-slate-100"><X size={20}/></Dialog.Close></div><div className="p-5"><input aria-label="搜索明细" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索客户、商机名称或编号" className={inputClass}/></div><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{detail.customers && <><p className="mb-3 text-xs text-slate-400">{customers.length} 家客户</p>{customers.map(c => <div key={c.key} className="border-b border-slate-100 py-4"><p className="font-semibold">{c.name}</p><p className="mt-1 text-xs text-slate-500">{c.industry} · {c.region} · {c.owner} · {c.level}</p><div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500"><span>商机 {c.opportunities.length} 条</span><span>历史签约 {money(c.revenue)}</span><span>在途预计 {money(c.pipeline)}</span></div></div>)}</>}{detail.opportunities && <><p className="mb-3 mt-4 text-xs text-slate-400">{opportunities.length} 条商机</p>{opportunities.map(o => <div key={o.id} className="border-b border-slate-100 py-4"><div className="flex items-start justify-between gap-4"><p className="font-semibold">{o.name || o.id}</p><span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600">{o.status || "状态未填写"}</span></div><p className="mt-1 text-xs text-slate-500">{o.id} · {o.customer || "签约客户未填写"} · {o.owner || "销售未填写"}</p><div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500"><span>预计签约 {o.due || "未填写"}</span><span>预计金额 {money(o.amount)}</span><span>实际成单 {o.signed || "日期未填写"}</span></div></div>)}</>}{!customers.length && !opportunities.length && <Empty/>}</div><div className="shrink-0 border-t p-4 text-xs text-slate-400">数据快照：{snapshot.asOf} · 仅供经营分析，暂无写回操作</div></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
