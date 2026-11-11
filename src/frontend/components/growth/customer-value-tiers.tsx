"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import RollingNumber from "./rolling-number";
import { ArrowUpRight, BadgeCheck, FolderOpen, ListFilter, Radar, Search, ShieldCheck, Target, TrendingUp } from "lucide-react";
import type { DigAccount, DigOpportunity } from "@/lib/dig-types";
import type { Candidate } from "@/lib/growth-engine";
import { fadeSwap } from "./fade-swap";
import { tableBadgeColor } from "./table-badge-color";

const tiers = [
  { label: "机会突破", action: "验证需求，推进首单" },
  { label: "重点经营", action: "持续投入，协调资源" },
  { label: "分层培育", action: "补充信息，按需触达" },
  { label: "挖掘新需求", action: "回访老客户，发现下一单" },
];
const pageSize = 20;
const amountInWan = (amount: number) =>
  `${(amount / 10000).toLocaleString("zh-CN", { maximumFractionDigits: 1 })} 万`;

type Props = {
  customers: DigAccount[];
  opportunities: DigOpportunity[];
  signals: Candidate[];
  available: boolean;
  onCustomer: (customer: DigAccount) => void;
  onAdmission: () => void;
  onGrowth: () => void;
};

export default function CustomerValueTiers({
  customers, opportunities, signals, available, onCustomer, onAdmission, onGrowth,
}: Props) {
  const [tier, setTier] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [jump, setJump] = useState(0);
  const listSection = useRef<HTMLElement>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const listContent = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = listSection.current;
    const heading = listHeading.current;
    if (!jump || tier === null || !section || !heading) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    section.scrollIntoView({ block: "start", behavior: reducedMotion ? "instant" : "smooth" });
    heading.focus({ preventScroll: true });
    if (reducedMotion) return;
    const pulse = heading.animate([
      { color: "var(--ink)" },
      { color: "#3767a5" },
      { color: "var(--ink)" },
    ], { duration: 500, iterations: 2, easing: "ease-in-out" });
    return () => pulse.cancel();
  }, [jump, tier]);
  const { rows, threshold, counts, withHistory, withActive } = useMemo(() => {
    const byCustomer = new Map<string, { history: number; active: number }>();
    for (const opportunity of opportunities) {
      const isActive = !opportunity.actualDate &&
        !/关闭|终止|签约|成交|丢单/.test(opportunity.status) &&
        !/签约|交付/.test(opportunity.stage);
      for (const id of new Set(opportunity.customerIds)) {
        const summary = byCustomer.get(id) ?? { history: 0, active: 0 };
        summary.history += Math.max(0, opportunity.actualAmount || 0);
        if (isActive) summary.active += 1;
        byCustomer.set(id, summary);
      }
    }
    const base = customers.map((customer) => ({
      customer,
      ...(byCustomer.get(customer.id) ?? { history: 0, active: 0 }),
    }));
    const positiveHistory = base.map(({ history }) => history).filter((amount) => amount > 0).sort((a, b) => a - b);
    const median = positiveHistory[Math.floor(positiveHistory.length / 2)] ?? 0;
    const counts = [0, 0, 0, 0];
    const rows = base.map((row) => {
      const highContribution = row.history > 0 && row.history >= median;
      const tier = (row.active > 0 ? 0 : 2) + Number(highContribution);
      counts[tier] += 1;
      return { ...row, tier };
    });
    return { rows, threshold: median, counts, withHistory: positiveHistory.length, withActive: counts[0] + counts[1] };
  }, [customers, opportunities]);
  const signalCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const signal of signals) counts.set(signal.customer, (counts.get(signal.customer) ?? 0) + 1);
    return counts;
  }, [signals]);
  const filtered = rows.filter((row) =>
    (tier === null || row.tier === tier) && row.customer.name.includes(query.trim()),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const metrics = [
    { label: "重点经营", count: counts[1], detail: "高历史贡献且有当前机会", icon: Target, highlight: true },
    { label: "参与分层客户", count: rows.length, detail: "按客户档案计数", icon: ListFilter },
    { label: "有历史成单", count: withHistory, detail: "已关联商机有正成单金额", icon: BadgeCheck },
    { label: "有当前机会", count: withActive, detail: "未关闭且未签约", icon: TrendingUp },
  ];

  function selectTier(next: number | null) {
    fadeSwap(listContent.current, () => {
      setTier(next);
      setPage(1);
      if (next !== null) setJump(current => current + 1);
    });
  }

  return (
    <div className="g-value-workspace">
      <div className="g-metrics">
        {metrics.map(({ label, count, detail, icon: Icon, highlight }) => (
          <article key={label} className={highlight ? "g-metric-highlight" : undefined}>
            <div><span>{label}</span><Icon size={17} /></div>
            <strong><RollingNumber value={available ? count.toLocaleString("zh-CN") : "—"} /></strong>
            <small>{detail}</small>
          </article>
        ))}
      </div>
      <div className="g-two-col g-value-columns">
        <section className="g-card">
          <div className="g-card-heading">
            <div>
              <h2>客户价值与机会</h2>
              <p>按历史成单贡献和当前机会分层，点击象限筛选下方名单。</p>
            </div>
          </div>
          <div className="g-matrix-wrap">
            <div className="g-axis-y">当前已识别机会 ↑</div>
            <div className="g-matrix">
              {tiers.map(({ label, action }, index) => (
                <button
                  key={label}
                  className={`cell-${index} ${tier === index ? "selected" : ""}`}
                  aria-pressed={tier === index}
                  aria-controls="tier-customer-list"
                  onClick={() => selectTier(index)}
                >
                  <span>{label}<ArrowUpRight size={15} /></span>
                  <strong><RollingNumber value={available ? counts[index].toLocaleString("zh-CN") : "—"} /><small> 家</small></strong>
                  <p>{action}</p>
                </button>
              ))}
            </div>
            <div className="g-axis-x">历史实际成单贡献 →</div>
          </div>
        </section>
        <aside className="g-card g-tier-guide" aria-label="分层口径与经营入口">
          <div className="g-card-heading"><div><h2>分层口径</h2><p>按客户查看已关联的商机。</p></div></div>
          <dl>
            <div>
              <dt>历史成单贡献</dt>
              <dd>{threshold > 0 ? `正成单金额按客户排序，以中间值为阈值（偶数时取较高的中间值）。达到 ${amountInWan(threshold)} 归为高贡献。` : "当前暂无可用于划定高贡献阈值的正成单金额。"}</dd>
            </div>
            <div><dt>当前机会</dt><dd>按源状态和阶段排除已关闭、已签约等记录。公开信号单独列示。</dd></div>
          </dl>
          <p className="g-tier-note">成单贡献用于分层，财务收入与增长潜力需另行核实。</p>
          <div className="g-tier-links">
            <button type="button" className="g-btn" onClick={onAdmission}><ShieldCheck size={16} aria-hidden="true" />新客户准入<ArrowUpRight size={14} aria-hidden="true" /></button>
            <button type="button" className="g-btn" onClick={onGrowth}><Radar size={16} aria-hidden="true" />老客户机会增长<ArrowUpRight size={14} aria-hidden="true" /></button>
          </div>
        </aside>
      </div>
      <section id="tier-customer-list" ref={listSection} tabIndex={-1} className="g-card g-tier-list" aria-labelledby="tier-customer-heading">
        <div className="g-card-heading">
          <div>
            <h2 id="tier-customer-heading" ref={listHeading} tabIndex={-1}>{tier === null ? "分层客户名单" : tiers[tier].label}</h2>
            <p>{available ? `当前范围 ${filtered.length.toLocaleString("zh-CN")} 家客户` : "等待读取客户数据"} · 点击档案查看合作记录</p>
          </div>
          {tier !== null && <button className="g-btn" onClick={() => selectTier(null)}>查看全部分层</button>}
        </div>
        <div className="asset-list-toolbar">
          <label className="g-search">
            <Search size={16} />
            <input aria-label="搜索分层客户" placeholder="搜索客户名称" value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
          </label>
        </div>
        <div className="asset-table-scroll" ref={listContent}>
          <table className="asset-table">
            <thead><tr>
              {["客户 / 行业", "历史成单贡献", "当前机会", "公开需求信号", "经营方向", "操作"].map((title) =>
                <th key={title} scope="col">{title}</th>,
              )}
            </tr></thead>
            <tbody>
              {filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((row) => (
                <tr key={row.customer.id}>
                  <td>
                    <button className="asset-customer-name" onClick={() => onCustomer(row.customer)}>{row.customer.name}</button>
                    <div className="g-tier-industry">
                      <span className="asset-cell-tag" data-tone={row.customer.industry ? undefined : "neutral"}
                        style={row.customer.industry ? { backgroundColor: tableBadgeColor("industry", row.customer.industry) } : undefined}>
                        {row.customer.industry || "行业待补充"}
                      </span>
                    </div>
                  </td>
                  <td>{row.history > 0 ? amountInWan(row.history) : "未发现正成单金额"}</td>
                  <td>{row.active} 条</td>
                  <td>{signalCounts.get(row.customer.name) ?? 0} 条</td>
                  <td><span className={`g-tag g-tier-tag tier-${row.tier}`}>{tiers[row.tier].label}</span></td>
                  <td><button className="g-text" onClick={() => onCustomer(row.customer)}>查看档案<FolderOpen size={14} aria-hidden="true" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="asset-empty asset-chart-empty">{available ? "当前筛选下没有客户" : "暂无可用客户数据"}</p>
          )}
        </div>
        {filtered.length > pageSize && (
          <div className="asset-pagination">
            <span>每页 {pageSize} 家</span>
            <button className="g-btn" disabled={currentPage <= 1} onClick={() => fadeSwap(listContent.current, () => setPage(currentPage - 1))}>上一页</button>
            <span>{currentPage} / {pageCount}</span>
            <button className="g-btn" disabled={currentPage >= pageCount} onClick={() => fadeSwap(listContent.current, () => setPage(currentPage + 1))}>下一页</button>
          </div>
        )}
      </section>
    </div>
  );
}
