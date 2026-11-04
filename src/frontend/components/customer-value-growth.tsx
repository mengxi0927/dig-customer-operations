"use client";

import { useState } from "react";
import { ArrowRight, BriefcaseBusiness, CircleDollarSign, Info, Repeat2, TrendingUp } from "lucide-react";
import type { Account } from "@/app/insights/page";
import { Card } from "@/components/ui";

const ACTIVE = new Set(["待提报", "已确认", "已立项"]);
const formatMoney = (value: number) => `${(value / 10000).toLocaleString("zh-CN", { maximumFractionDigits: 1 })} 万`;
const percentage = (part: number, total: number) => total ? `${(part / total * 100).toFixed(1)}%` : "—";
const signedCount = (customer: Account) => customer.opportunities.filter(o => o.status === "已签约").length;

export function CustomerValueGrowth({ customers, onCustomer, onGroup }: {
  customers: Account[];
  onCustomer: (customer: Account) => void;
  onGroup: (title: string, customers: Account[]) => void;
}) {
  const [rankBy, setRankBy] = useState<"revenue" | "pipeline">("revenue");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const signed = customers.filter(c => signedCount(c) > 0);
  const repeat = signed.filter(c => signedCount(c) >= 2);
  const revenue = customers.reduce((sum, c) => sum + c.revenue, 0);
  const pipeline = customers.reduce((sum, c) => sum + c.pipeline, 0);
  const weighted = customers.reduce((sum, c) => sum + c.opportunities.filter(o => ACTIVE.has(o.status)).reduce((s, o) => s + o.amount * Math.max(0, Math.min(100, o.probability)) / 100, 0), 0);
  const ranked = [...customers].filter(c => c[rankBy] > 0).sort((a, b) => b[rankBy] - a[rankBy]);
  const topTen = ranked.slice(0, 10);
  const rankTotal = rankBy === "revenue" ? revenue : pipeline;
  const concentration = topTen.reduce((sum, c) => sum + c[rankBy], 0);
  const visible = ranked.filter(c => c.name.includes(search));
  const metrics = [
    { label: "累计签约贡献", value: formatMoney(revenue), note: `${signed.length} 家客户已有签约`, icon: CircleDollarSign, rows: signed },
    { label: "在途商机潜力", value: formatMoney(pipeline), note: "当前在途预计签约金额", icon: BriefcaseBusiness, rows: customers.filter(c => c.pipeline > 0) },
    { label: "加权预计签约金额", value: formatMoney(weighted), note: "预计金额 × 填报成单率", icon: TrendingUp, rows: customers.filter(c => c.opportunities.some(o => ACTIVE.has(o.status))) },
    { label: "多次签约客户占比", value: percentage(repeat.length, signed.length), note: `${repeat.length} / ${signed.length} 家已签约客户`, icon: Repeat2, rows: repeat },
  ];
  return <section className="space-y-5 animate-in" aria-label="客户价值与增长分析">
    <div><h2 className="text-lg font-bold">客户价值与增长分析</h2><p className="mt-1 text-xs leading-5 text-slate-500">识别签约贡献、未来潜力与持续经营空间。按筛选后的客户群，汇总其关联的全部历史商机。</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, note, icon: Icon, rows }) => <button key={label} onClick={() => onGroup(label, rows)} className="rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"><div className="flex items-center justify-between gap-2"><span className="text-xs text-slate-500">{label}</span><Icon size={19} className="text-blue-500"/></div><p className="mt-3 text-2xl font-bold tracking-tight">{value}</p><p className="mt-2 text-xs text-slate-400">{note}</p></button>)}</div>
    <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
      <Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">高价值客户 Top 10</h3><p className="mt-1 text-xs text-slate-500">前十客户占当前{rankBy === "revenue" ? "签约贡献" : "在途潜力"}的 <b className="text-blue-600">{percentage(concentration, rankTotal)}</b></p></div><div className="flex rounded-lg bg-slate-100 p-1">{([ ["revenue", "签约贡献"], ["pipeline", "在途潜力"] ] as const).map(([key, label]) => <button key={key} onClick={() => { setRankBy(key); setPage(0); }} className={`rounded-md px-3 py-1.5 text-xs ${rankBy === key ? "bg-white font-semibold text-blue-600 shadow-sm" : "text-slate-500"}`}>{label}</button>)}</div></div>
        <div className="mt-5 space-y-1">{topTen.map((c, index) => <button key={c.key} onClick={() => onCustomer(c)} className="flex w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-blue-50/50"><span className={`w-5 text-center text-xs font-bold ${index < 3 ? "text-blue-600" : "text-slate-400"}`}>{index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium" title={c.name}>{c.name}</span><span className="mt-2 block h-1.5 rounded-full bg-slate-100"><span className="block h-1.5 rounded-full bg-blue-500" style={{ width: `${c[rankBy] / (topTen[0]?.[rankBy] || 1) * 100}%` }}/></span></span><span className="w-28 text-right text-xs font-semibold text-slate-600">{formatMoney(c[rankBy])}</span></button>)}{!topTen.length && <Empty/>}</div>
      </Card>
      <Card className="p-5"><h3 className="font-bold">持续经营与扩展空间</h3><p className="mt-1 text-xs text-slate-500">按客户实际签约次数分组，点击查看名单</p><div className="mt-5 space-y-3">{[
        { title: "尚未签约", description: "推动首单转化", rows: customers.filter(c => signedCount(c) === 0), color: "bg-amber-50 text-amber-700" },
        { title: "单次签约", description: "关注下一单与业务扩展", rows: customers.filter(c => signedCount(c) === 1), color: "bg-blue-50 text-blue-700" },
        { title: "多次签约", description: "至少两条已签约商机", rows: repeat, color: "bg-emerald-50 text-emerald-700" },
      ].map(({ title, description, rows, color }) => <button key={title} onClick={() => onGroup(title, rows)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-4 text-left hover:border-blue-200"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg font-bold ${color}`}>{rows.length}</span><span className="flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs text-slate-400">{description}</span></span><span className="text-xs text-slate-500">{percentage(rows.length, customers.length)}</span><ArrowRight size={14} className="text-slate-400"/></button>)}</div><div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-500">多次签约说明同一客户存在多条已签约商机，可能包含并行项目，不直接等同于续约或复购。</div></Card>
    </div>
    <Card className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><h3 className="font-bold">客户价值明细</h3><p className="mt-1 text-xs text-slate-500">按{rankBy === "revenue" ? "累计签约贡献" : "在途商机潜力"}降序 · {visible.length} 家</p></div><input aria-label="搜索价值客户" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="搜索客户名称" className="h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"/></div><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{["客户名称", "累计签约贡献", "在途预计金额", "签约次数", "价值分层", "操作"].map(h => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visible.slice(page * 8, page * 8 + 8).map(c => <tr key={c.key} className="hover:bg-blue-50/30"><td className="max-w-[280px] px-5 py-4 font-medium">{c.name}</td><td className="whitespace-nowrap px-5 py-4">{formatMoney(c.revenue)}</td><td className="whitespace-nowrap px-5 py-4">{formatMoney(c.pipeline)}</td><td className="px-5 py-4">{signedCount(c)}</td><td className="whitespace-nowrap px-5 py-4"><span className="rounded-full bg-blue-50 px-2 py-1 text-blue-600">{c.quadrant}</span></td><td className="px-5 py-4"><button onClick={() => onCustomer(c)} className="whitespace-nowrap font-semibold text-blue-600">查看明细 →</button></td></tr>)}</tbody></table>{!visible.length && <Empty/>}</div><div className="flex items-center justify-end gap-4 border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><button disabled={!page} onClick={() => setPage(p => p - 1)} className="disabled:opacity-30">上一页</button><span>{Math.min(page + 1, Math.max(1, Math.ceil(visible.length / 8)))} / {Math.max(1, Math.ceil(visible.length / 8))}</span><button disabled={(page + 1) * 8 >= visible.length} onClick={() => setPage(p => p + 1)} className="disabled:opacity-30">下一页</button></div></Card>
    <p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><Info size={14} className="mt-0.5 shrink-0"/>仅统计能关联到客户表的商机；签约贡献使用“已签约”商机的实际成单金额，不代表收入或回款。加权金额按填报成单率估算，不代表签约承诺。</p>
  </section>;
}

function Empty() { return <p className="py-12 text-center text-sm text-slate-400">当前筛选条件下暂无记录</p>; }
