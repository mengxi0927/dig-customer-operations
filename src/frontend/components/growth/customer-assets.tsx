"use client";
import { useMemo, useState } from "react";
import {
  Building2,
  MapPin,
  Users,
  Search,
  X,
  ArrowUpRight,
} from "lucide-react";
import { CustomerMap } from "@/components/customer-map";
import cityProvince from "@/lib/city-province.json";
import type { DigAccount, DigOpportunity } from "@/lib/dig-types";
import "./customer-assets.css";
import { customerAssetTrend } from "@/lib/customer-asset-trend";
const mapping = cityProvince as Record<string, string>;
const trimProvince = (s: string) =>
  s.replace(/特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|省|市/g, "");
export function customerProvince(city: string) {
  const s = city.trim();
  if (!s) return "地区待核实";
  const explicit = Object.values(mapping)
    .filter(Boolean)
    .find(
      (p) =>
        s.startsWith(p + "省") ||
        s.startsWith(p + "市") ||
        s.startsWith(p + "自治区") ||
        s === p,
    );
  if (explicit) return explicit;
  if (/区$/.test(s)) return "地区待核实";
  return mapping[s] || "地区待核实";
}
const counts = (values: string[]) =>
  Object.entries(
    values.reduce<Record<string, number>>((acc, v) => {
      acc[v] = (acc[v] || 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"));
export default function CustomerAssets({
  customers,
  opportunities,
  onCustomer,
  loading,
}: {
  customers: DigAccount[];
  opportunities: DigOpportunity[];
  onCustomer: (c: DigAccount) => void;
  loading: boolean;
}) {
  const [department, setDepartment] = useState(""),
    [owner, setOwner] = useState(""),
    [industry, setIndustry] = useState(""),
    [region, setRegion] = useState(""),
    [level, setLevel] = useState(""),
    [search, setSearch] = useState(""),
    [province, setProvince] = useState(""),
    [salesFilter, setSalesFilter] = useState(""),
    [limit, setLimit] = useState(20),
    [trendMonths, setTrendMonths] = useState(6),
    [listSearch, setListSearch] = useState(""),
    [listPage, setListPage] = useState(1);
  const linked = useMemo(() => {
    const m = new Map<string, DigOpportunity[]>();
    for (const o of opportunities)
      for (const id of o.customerIds) m.set(id, [...(m.get(id) || []), o]);
    return m;
  }, [opportunities]);
  const owners = (c: DigAccount) =>
    Array.from(
      new Set(
        (linked.get(c.id) || [])
          .flatMap((o) => o.owner.split("、").map((name) => name.trim()))
          .filter(Boolean),
      ),
    );
  const filtered = customers.filter(
    (c) =>
      (!department || c.department === department) &&
      (!owner || owners(c).includes(owner)) &&
      (!industry || (c.industry || "行业未填写") === industry) &&
      (!region || customerProvince(c.city) === region) &&
      (!level || (c.level || "级别未填写") === level),
  );
  const regions = counts(filtered.map((c) => customerProvince(c.city))),
    industries = counts(filtered.map((c) => c.industry || "行业未填写")),
    levels = counts(filtered.map((c) => c.level || "级别未填写"));
  const regionCounts = Object.fromEntries(
    regions.filter(([r]) => r !== "地区待核实"),
  );
  const regional = province
    ? filtered.filter((c) => customerProvince(c.city) === province)
    : [];
  const reps = counts(regional.flatMap((c) => owners(c)));
  const shown = regional.filter(
    (c) => (!salesFilter || owners(c).includes(salesFilter)) &&
      (!search || [c.name, c.number, c.city].some(v => v.includes(search))),
  );
  const filled = filtered.reduce(
    (n, c) =>
      n +
      [
        c.name === "名称缺失" ? "" : c.name,
        c.number,
        c.department,
        c.industry,
        c.city,
        c.level,
      ].filter(Boolean).length,
    0,
  );
  const history = filtered.filter((c) =>
    (linked.get(c.id) || []).some(
      (o) => o.actualAmount !== null && o.actualAmount > 0,
    ),
  );
  const matched = filtered.filter((c) => (linked.get(c.id) || []).length);
  function selectProvince(p: string) {
    setProvince(p);
    setSalesFilter("");
    setLimit(20);
  }
  const select = (
    label: string,
    value: string,
    set: (s: string) => void,
    values: string[],
  ) => (
    <label>
      {label}
      <select
        value={value}
        onChange={(e) => {
          set(e.target.value);
          selectProvince("");
        }}
      >
        <option value="">全部</option>
        {Array.from(new Set(values))
          .filter(Boolean)
          .sort()
          .map((v) => (
            <option key={v}>{v}</option>
          ))}
      </select>
    </label>
  );
  function Bars({
    items,
    selected,
    onSelect,
  }: {
    items: [string, number][];
    selected: string;
    onSelect: (v: string) => void;
  }) {
    return (
      <div className="asset-bars">
        {items.slice(0, 10).map(([name, n]) => (
          <button
            className={selected === name ? "active" : ""}
            key={name}
            onClick={() => onSelect(selected === name ? "" : name)}
          >
            <span title={name}>{name}</span>
            <i>
              <em
                style={{
                  width: `${(100 * n) / Math.max(1, items[0]?.[1] || 1)}%`,
                }}
              />
            </i>
            <b>{n}</b>
            <small>
              {filtered.length ? ((n / filtered.length) * 100).toFixed(1) : "0"}
              %
            </small>
          </button>
        ))}
        {!items.length && <p className="asset-empty">当前筛选无客户</p>}
      </div>
    );
  }
  const trend = customerAssetTrend(filtered, trendMonths);
  const maxAdded = Math.max(1, ...trend.points.map(p => p.added));
  const maxTotal = Math.max(1, ...trend.points.map(p => p.total));
  const chartX = (i: number) => 70 + i * (860 / Math.max(1, trend.points.length - 1));
  const listCustomers = filtered.filter(c => !listSearch ||
    [c.name, c.number, c.industry, c.city, c.applicant, ...owners(c)]
      .some(v => v.toLocaleLowerCase().includes(listSearch.trim().toLocaleLowerCase())));
  const pageCount = Math.max(1, Math.ceil(listCustomers.length / 20));
  const currentPage = Math.min(listPage, pageCount);
  const palette = ["#527de0", "#85a0ed", "#adbcf2", "#cad4f7", "#e3e9f9"];
  let cumulative = 0;
  const gradient = levels
    .map(([, n], i) => {
      const from = cumulative;
      cumulative += filtered.length ? (n / filtered.length) * 100 : 0;
      return `${palette[Math.min(i, 4)]} ${from}% ${cumulative}%`;
    })
    .join(",");
  return (
    <div className="asset-overview">
      <section className="g-card asset-filters">
        {select(
          "部门",
          department,
          setDepartment,
          customers.map((c) => c.department),
        )}
        {select(
          "关联销售员",
          owner,
          setOwner,
          opportunities.flatMap((o) =>
            o.owner.split("、").map((name) => name.trim()),
          ),
        )}
        {select(
          "行业",
          industry,
          setIndustry,
          customers.map((c) => c.industry || "行业未填写"),
        )}
        {select(
          "地区",
          region,
          setRegion,
          customers.map((c) => customerProvince(c.city)),
        )}
        {select(
          "客户级别",
          level,
          setLevel,
          customers.map((c) => c.level || "级别未填写"),
        )}
        <button
          className="g-btn"
          onClick={() => {
            setDepartment("");
            setOwner("");
            setIndustry("");
            setRegion("");
            setLevel("");
            setSearch("");
            selectProvince("");
          }}
        >
          重置筛选
        </button>
      </section>
      <div className="g-metrics asset-metrics">
        {[
          {
            label: "客户总数",
            value: loading ? "—" : filtered.length,
            sub: "当前筛选范围 · 按客户ID计数",
          },
          {
            label: "有历史成单客户",
            value: history.length,
            sub: "关联商机实际成单金额大于0",
          },
          {
            label: "已关联商机客户",
            value: matched.length,
            sub: `未关联 ${filtered.length - matched.length} 家`,
          },
          {
            label: "覆盖省级地区",
            value: regions.filter(([r]) => r !== "地区待核实").length,
            sub: `地区待核实 ${regions.find(([r]) => r === "地区待核实")?.[1] || 0} 家`,
          },
          {
            label: "核心字段完整率",
            value: filtered.length
              ? `${((filled / (filtered.length * 6)) * 100).toFixed(1)}%`
              : "—",
            sub: "名称、编号、部门、行业、城市、级别",
          },
          {
            label: "关联销售员",
            value: new Set(filtered.flatMap((c) => owners(c))).size,
            sub: "由关联商机销售员字段统计",
          },
        ].map((m) => (
          <article key={m.label}>
            <div>
              <span>{m.label}</span>
              <Building2 size={16} />
            </div>
            <strong>{m.value}</strong>
            <small>{m.sub}</small>
          </article>
        ))}
      </div>
      <section className="g-card">
        <div className="g-card-heading">
          <div>
            <h2>客户区域地图</h2>
            <p>按客户城市归属省级地区 · 点击省份，查看当地销售员和客户</p>
          </div>
          <select
            aria-label="选择地图省份"
            value={province}
            onChange={(e) => selectProvince(e.target.value)}
          >
            <option value="">选择省级地区</option>
            {regions.map(([name, n]) => (
              <option key={name} value={name}>
                {name} · {n} 家
              </option>
            ))}
          </select>
        </div>
        <div className={`asset-map-layout ${province ? "has-selection" : ""}`}>
          <div className="asset-map">
            <CustomerMap
              counts={regionCounts}
              selected={province}
              onSelect={selectProvince}
            />
          </div>
          <aside
            className="asset-region"
            aria-label="地区销售员和客户"
            aria-live="polite"
          >
            {province ? (
              <>
                <div className="asset-region-heading">
                  <h3>
                    <MapPin size={18} />
                    {province}
                  </h3>
                  <button
                    className="g-icon-btn"
                    aria-label="清除省份选择"
                    onClick={() => selectProvince("")}
                  >
                    <X size={17} />
                  </button>
                </div>
                <div className="asset-region-metrics">
                  <div>
                    <small>客户数量</small>
                    <b>{regional.length}</b>
                  </div>
                  <div>
                    <small>关联销售员</small>
                    <b>{reps.length}</b>
                  </div>
                </div>
                <h4>
                  <Users size={15} />
                  地区销售员 <small>点击筛选名下客户</small>
                </h4>
                <div className="asset-reps">
                  {reps.map(([name, n]) => (
                    <button
                      key={name}
                      className={salesFilter === name ? "active" : ""}
                      onClick={() => {
                        setSalesFilter(salesFilter === name ? "" : name);
                        setLimit(20);
                      }}
                    >
                      <span>{name}</span>
                      <small>{n} 家</small>
                    </button>
                  ))}
                  {!reps.length && (
                    <p className="asset-empty">暂无已关联商机的销售员信息</p>
                  )}
                </div>
                <h4>
                  地区客户{" "}
                  <small>
                    {salesFilter || "全部销售员"} · {shown.length} 家
                  </small>
                </h4>
                <label className="g-search">
                  <Search size={15} />
                  <input
                    aria-label="搜索地区客户"
                    placeholder="搜索客户、编号或城市"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setLimit(20);
                    }}
                  />
                </label>
                <div className="asset-customer-list">
                  {shown.slice(0, limit).map((c) => (
                    <button key={c.id} onClick={() => onCustomer(c)}>
                      <b>
                        {c.name}
                        <ArrowUpRight size={13} />
                      </b>
                      <small>
                        {c.city || "城市未填写"} · {c.industry || "行业未填写"}
                      </small>
                      <span>销售员：{owners(c).join("、") || "未关联"} </span>
                    </button>
                  ))}
                  {!shown.length && (
                    <p className="asset-empty">该地区暂无符合筛选的客户</p>
                  )}
                </div>
                {shown.length > limit && (
                  <button
                    className="g-text"
                    onClick={() => setLimit(limit + 20)}
                  >
                    加载更多（剩余 {shown.length - limit} 家）
                  </button>
                )}
              </>
            ) : (
              <>
                <h3>全国客户分布</h3>
                <p className="asset-empty">
                  点击地图中的省份，右侧将展开当地销售员和客户名单。
                </p>
                <Bars items={regions} selected="" onSelect={selectProvince} />
              </>
            )}
          </aside>
        </div>
        <p className="g-footnote">
          销售员来自关联商机，不以客户申请人替代。无关联商机的客户仍列入地区名单；区县歧义、缺失或无法识别的城市单列“地区待核实”。
        </p>
      </section>
      <div className="g-two-col">
        <section className="g-card">
          <div className="g-card-heading">
            <div>
              <h2>客户行业分布</h2>
              <p>客户数量 Top 10 · 点击行业联动筛选</p>
            </div>
          </div>
          <Bars
            items={industries}
            selected={industry}
            onSelect={(v) => {
              setIndustry(v);
              selectProvince("");
            }}
          />
        </section>
        <section className="g-card">
          <div className="g-card-heading">
            <div>
              <h2>客户地区分布</h2>
              <p>客户数量与占比 · 点击查看地区明细</p>
            </div>
          </div>
          <Bars items={regions} selected={province} onSelect={selectProvince} />
        </section>
      </div>
      <div className="asset-growth-structure">
      <section className="g-card asset-trend">
        <div className="g-card-heading">
          <div><h2>客户增长趋势</h2><p>按客户申请时间统计每月新增与累计客户 · 随顶部筛选联动</p></div>
          <div className="asset-periods" aria-label="趋势时间范围">
            {[3, 6, 12].map(n => <button key={n} aria-pressed={trendMonths === n}
              className={trendMonths === n ? "active" : ""} onClick={() => setTrendMonths(n)}>
              {n === 12 ? "近一年" : `近${n}个月`}</button>)}
          </div>
        </div>
        <div className="asset-trend-legend"><span><i />每月新增客户（左轴）</span><span><i />累计客户（右轴）</span></div>
        {trend.dated ? <div className="asset-trend-chart"><svg viewBox="0 0 1000 310" role="img" aria-label="客户增长趋势图">
          {[0, 1, 2, 3, 4].map(i => <g key={i}>
            <line x1="45" x2="955" y1={250-i*50} y2={250-i*50} stroke="#e9eef7" />
            <text x="35" y={254-i*50} textAnchor="end">{Math.round(maxAdded*i/4)}</text>
            <text x="965" y={254-i*50}>{Math.round(maxTotal*i/4)}</text>
          </g>)}
          {trend.points.map((p, i) => <g key={p.month}>
            <title>{p.month}：新增 {p.added} 家，累计 {p.total} 家</title>
            <rect x={chartX(i)-20} y={250-p.added/maxAdded*200} width="40" height={p.added/maxAdded*200} rx="4" fill="#cddaf9" />
            <text x={chartX(i)} y={250-p.added/maxAdded*200+(p.added/maxAdded*200 > 30 ? 18 : -10)} textAnchor="middle">{p.added}</text>
            <text x={chartX(i)} y="285" textAnchor="middle">{p.month}</text>
          </g>)}
          <polyline points={trend.points.map((p,i) => `${chartX(i)},${250-p.total/maxTotal*200}`).join(" ")} fill="none" stroke="#4169da" strokeWidth="3" />
          {trend.points.map((p,i) => <g key={p.month}>
            <circle cx={chartX(i)} cy={250-p.total/maxTotal*200} r="5" fill="white" stroke="#4169da" strokeWidth="3" />
            <text className="asset-trend-total" x={chartX(i)} y={233-p.total/maxTotal*200} textAnchor="middle">{p.total}</text>
          </g>)}
        </svg></div> : <p className="asset-empty asset-chart-empty">{loading ? "正在读取客户申请时间…" : "当前筛选下暂无有效申请时间，无法绘制增长趋势"}</p>}
        <p className="g-footnote">申请时间代表客户建档申请，非首次成交。累计包含展示月份之前的有效记录；仅统计当前快照中的客户。有效日期 {trend.dated} 家，缺失、无效或未来日期 {trend.excluded} 家未计入；本月截至今日。</p>
      </section>
      <section className="g-card asset-level-structure">
        <div className="g-card-heading">
          <div>
            <h2>客户级别结构</h2>
            <p>沿用飞书客户级别，不用商机状态推测存量或增量类型</p>
          </div>
        </div>
        <div className="asset-structure">
          <div
            className="asset-donut"
            role="img"
            aria-label={`客户级别分布，共${filtered.length}家`}
            style={{
              background: gradient ? `conic-gradient(${gradient})` : "#edf1f7",
            }}
          >
            <div>
              <strong>{filtered.length}</strong>
              <small>客户总数</small>
            </div>
          </div>
          <div className="asset-legend">
            {levels.map(([name, n], i) => (
              <button
                key={name}
                onClick={() => {
                  setLevel(level === name ? "" : name);
                  selectProvince("");
                }}
              >
                <i style={{ background: palette[Math.min(i, 4)] }} />
                {name}
                <b>{n}</b>
                <small>
                  {filtered.length
                    ? ((n / filtered.length) * 100).toFixed(1)
                    : 0}
                  %
                </small>
              </button>
            ))}
          </div>
        </div>
      </section>
      </div>
      <section className="g-card asset-all-customers">
        <div className="g-card-heading"><div><h2>全部客户</h2><p>当前筛选范围内共 {filtered.length} 家 · 点击客户名称查看合作档案</p></div></div>
        <div className="asset-list-toolbar">
          <label className="g-search"><Search size={16} /><input aria-label="搜索全部客户" placeholder="搜索客户名称、编号、行业或销售员" value={listSearch} onChange={e => {setListSearch(e.target.value);setListPage(1);}} /></label>
          <span>共 {listCustomers.length} 家客户</span>
        </div>
        <div className="asset-table-scroll"><table className="asset-table">
          <thead><tr>{["客户名称 / 编号", "行业", "地区", "客户级别", "关联销售员", "关联商机", "申请时间", "操作"].map(t => <th key={t}>{t}</th>)}</tr></thead>
          <tbody>{listCustomers.slice((currentPage-1)*20,currentPage*20).map(c => <tr key={c.id}>
            <td><button className="asset-customer-name" onClick={() => onCustomer(c)}>{c.name}</button><small>{c.number || "编号未填写"}</small></td>
            <td>{c.industry || "未填写"}</td><td>{c.city || "待核实"}</td>
            <td><span className="asset-level-tag">{c.level || "未填写"}</span></td>
            <td>{owners(c).join("、") || "未关联"}</td><td>{(linked.get(c.id) || []).length}</td>
            <td>{c.appliedAt && Number.isFinite(Date.parse(c.appliedAt)) ? new Date(c.appliedAt).toLocaleDateString("zh-CN", {timeZone:"Asia/Shanghai"}) : "未填写"}</td>
            <td><button className="g-text" onClick={() => onCustomer(c)}>查看档案 <ArrowUpRight size={12} /></button></td>
          </tr>)}</tbody>
        </table>{!listCustomers.length && <p className="asset-empty asset-chart-empty">{loading ? "正在加载客户…" : "暂无符合条件的客户"}</p>}</div>
        <div className="asset-pagination"><span>每页 20 家 · 共 {listCustomers.length} 家</span>
          <button className="g-btn" disabled={currentPage <= 1} onClick={() => setListPage(currentPage-1)}>上一页</button>
          <span>{currentPage} / {pageCount}</span>
          <button className="g-btn" disabled={currentPage >= pageCount} onClick={() => setListPage(currentPage+1)}>下一页</button>
        </div>
      </section>
    </div>
  );
}
