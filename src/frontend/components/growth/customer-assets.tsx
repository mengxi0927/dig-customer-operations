"use client";
import { useMemo, useRef, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  Building2,
  BadgeCheck,
  CalendarPlus,
  ChartSpline,
  FolderOpen,
  Link2,
  MapPin,
  Users,
  Search,
  X,
} from "lucide-react";
import { CustomerMap } from "@/components/customer-map";
import cityProvince from "@/lib/city-province.json";
import type { DigAccount, DigOpportunity } from "@/lib/dig-types";
import "./customer-assets.css";
import Dropdown from "./dropdown";
import CustomerLevelChart from "./customer-level-chart";
import CustomerGrowthTrend from "./customer-growth-trend";
import CustomerAssetFilters, { emptyAssetFilters, type AssetFilters } from "./customer-asset-filters";
import SalesContactAvatars from "./sales-contact-avatars";
import { fadeSwap } from "./fade-swap";
import { tableBadgeColor } from "./table-badge-color";
import { customerMarketingUnits } from "@/lib/customer-marketing-units";
import { customerAssetTrend, customersAddedInYear } from "@/lib/customer-asset-trend";
const mapping = cityProvince as Record<string, string>;
const provinceNames = [...new Set(Object.values(mapping).filter(Boolean))];
const filterOptions = (values: string[]) => [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b, "zh-CN"));
const matchesFilter = (chosen: string[], values: string[]) => !chosen.length || values.some(value => chosen.includes(value));
const levelPalette = new Map([
  ["核心客户", "var(--palette-blue)"],
  ["潜力客户", "var(--palette-red)"],
  ["储备客户", "color-mix(in srgb, var(--palette-blue) 53%, var(--palette-gray))"],
  ["级别未填写", "color-mix(in srgb, var(--palette-ink) 24%, var(--palette-gray))"],
]);
const secondaryLevelColors = [
  "color-mix(in srgb, var(--palette-red) 46%, var(--palette-gray))",
  "color-mix(in srgb, var(--palette-blue) 63%, var(--palette-ink))",
  "color-mix(in srgb, var(--palette-red) 53%, var(--palette-ink))",
  "color-mix(in srgb, var(--palette-blue) 24%, var(--palette-gray))",
];
const distributionTabs = [
  { id: "map", label: "区域地图" },
  { id: "industry", label: "行业分布" },
  { id: "region", label: "地区分布" },
] as const;
type DistributionTab = (typeof distributionTabs)[number]["id"];
const trimProvince = (s: string) =>
  s.replace(/特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|省|市/g, "");
export function customerProvince(city: string) {
  const s = city.trim();
  if (!s) return "地区待核实";
  const explicit = provinceNames.find(
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
  const [filters, setFilters] = useState<AssetFilters>(emptyAssetFilters),
    [search, setSearch] = useState(""),
    [province, setProvince] = useState(""),
    [salesFilter, setSalesFilter] = useState(""),
    [limit, setLimit] = useState(20),
    [trendMonths, setTrendMonths] = useState(6),
    [listSearch, setListSearch] = useState(""),
    [listPage, setListPage] = useState(1);
  const [distribution, setDistribution] = useState<DistributionTab>("map");
  const distributionContent = useRef<HTMLDivElement>(null);
  const mapTab = useRef<HTMLButtonElement>(null);
  const trendContent = useRef<HTMLDivElement>(null);
  const listContent = useRef<HTMLDivElement>(null);
  const regionPanel = useRef<HTMLElement>(null);
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
  const departments = (c: DigAccount) => customerMarketingUnits(linked.get(c.id) || []);
  const options: AssetFilters = {
    department: filterOptions([
      ...opportunities.flatMap(o => o.marketingUnits || []),
      ...(customers.some(c => !departments(c).length) ? ["营销单元未关联"] : []),
    ]),
    owner: filterOptions(opportunities.flatMap(o => o.owner.split("、").map(name => name.trim()))),
    industry: filterOptions(customers.map(c => c.industry || "行业未填写")),
    region: filterOptions(customers.map(c => customerProvince(c.city))),
    level: filterOptions(customers.map(c => c.level || "级别未填写")),
  };
  const filtered = customers.filter(c => {
    const units = filters.department.length ? departments(c) : [];
    return matchesFilter(filters.department, units.length ? units : ["营销单元未关联"])
      && (!filters.owner.length || matchesFilter(filters.owner, owners(c)))
      && matchesFilter(filters.industry, [c.industry || "行业未填写"])
      && (!filters.region.length || filters.region.includes(customerProvince(c.city)))
      && matchesFilter(filters.level, [c.level || "级别未填写"]);
  });
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
    if (regionPanel.current) regionPanel.current.scrollTop = 0;
  }
  function changeDistribution(tab: DistributionTab, selectedProvince?: string) {
    fadeSwap(distributionContent.current, () => {
      setDistribution(tab);
      if (selectedProvince !== undefined) {
        selectProvince(selectedProvince);
        mapTab.current?.focus({ preventScroll: true });
      }
    });
  }
  function updateFilters(next: AssetFilters) {
    setFilters(next);
    selectProvince("");
    setListPage(1);
  }

  function renderBars(
    items: [string, number][],
    selected: string[],
    onSelect: (value: string) => void,
  ) {
    return (
      <div className="asset-bars">
        {items.slice(0, 10).map(([name, n]) => (
          <button
            className={selected.includes(name) ? "active" : ""}
            key={name}
            onClick={() => onSelect(name)}
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
  const listCustomers = filtered.filter(c => !listSearch ||
    [c.name, c.number, c.industry, c.city, c.applicant, ...owners(c)]
      .some(v => v.toLocaleLowerCase().includes(listSearch.trim().toLocaleLowerCase())));
  const pageCount = Math.max(1, Math.ceil(listCustomers.length / 20));
  const currentPage = Math.min(listPage, pageCount);
  const otherLevels = [...new Set(customers.map(c => c.level).filter(name => name && !levelPalette.has(name)))].sort();
  const levelColor = (name: string) => levelPalette.get(name)
    ?? secondaryLevelColors[otherLevels.indexOf(name) % secondaryLevelColors.length];
  return (
    <div className="asset-overview">
      <CustomerAssetFilters options={options} value={filters} onChange={updateFilters}
        onReset={() => { setSearch(""); updateFilters(emptyAssetFilters); }} />
      <div className="asset-growth-structure">
        <section className="g-card g-metric-highlight asset-level-structure">
          <div className="g-card-heading">
            <div>
              <h2>客户总数</h2>
              <p>当前筛选范围 · 按客户 ID 计数</p>
            </div>
            <Building2 className="asset-total-icon" size={19} aria-hidden="true" />
          </div>
          <CustomerLevelChart
            levels={levels.map(([name, count]) => ({ name, count, color: levelColor(name) }))}
            total={filtered.length}
            loading={loading}
          />
        </section>
        <div className="g-metrics asset-metrics">
          {[
            {
              label: "有历史成单客户",
              value: history.length,
              sub: "关联商机实际成单金额大于0",
              icon: BadgeCheck,
            },
            {
              label: "已关联商机客户",
              value: matched.length,
              sub: `未关联 ${filtered.length - matched.length} 家`,
              icon: Link2,
            },
            {
              label: "26年新增客户数",
              value: loading ? "—" : customersAddedInYear(filtered, 2026),
              sub: "2026年1月1日至今 · 按客户申请时间统计",
              icon: CalendarPlus,
            },
          ].map(({ label, value, sub, icon: Icon }) => (
            <article key={label}>
              <div>
                <span>{label}</span>
                <Icon size={16} aria-hidden="true" />
              </div>
              <strong>{value}</strong>
              <small>{sub}</small>
            </article>
          ))}
        </div>
        <section className="g-card asset-trend">
          <div className="g-card-heading">
            <div><h2><ChartSpline size={17} aria-hidden="true" />客户增长趋势</h2><p>按客户申请时间统计每月新增与累计客户 · 随顶部筛选联动</p></div>
            <div className="asset-periods" role="group" aria-label="趋势时间范围" data-period={trendMonths}>
              {[3, 6, 12].map(n => <button key={n} aria-pressed={trendMonths === n}
                className={trendMonths === n ? "active" : ""} onClick={() => {
                  if (n !== trendMonths) fadeSwap(trendContent.current, () => setTrendMonths(n));
                }}>
                {n === 12 ? "近一年" : `近${n}个月`}</button>)}
            </div>
          </div>
          <div className="asset-trend-legend"><span><i />每月新增客户（左轴）</span><span><i />累计客户（右轴）</span></div>
          <div ref={trendContent}>
            {trend.dated ? <CustomerGrowthTrend key={trendMonths} points={trend.points} /> : <p className="asset-empty asset-chart-empty">{loading ? "正在读取客户申请时间…" : "当前筛选下暂无有效申请时间，无法绘制增长趋势"}</p>}
            <p className="g-footnote">申请时间代表客户建档申请，非首次成交。累计包含展示月份之前的有效记录；仅统计当前快照中的客户。有效日期 {trend.dated} 家，缺失、无效或未来日期 {trend.excluded} 家未计入；本月截至今日。</p>
          </div>
        </section>
      </div>
      <section className="g-card asset-map-card" aria-label="客户分布">
        <Tabs.Root value={distribution} activationMode="manual" onValueChange={value => {
          if (distributionTabs.some(tab => tab.id === value)) changeDistribution(value as DistributionTab);
        }}>
          <div className="g-card-heading asset-distribution-header">
            <h2>客户分布</h2>
            <Tabs.List className="g-customer-tabs" aria-label="客户分布视图">
              {distributionTabs.map(({ id, label }) => <Tabs.Trigger key={id} value={id} ref={id === "map" ? mapTab : undefined}>{label}</Tabs.Trigger>)}
            </Tabs.List>
          </div>
          <div ref={distributionContent}>
            <Tabs.Content value="map" forceMount hidden={distribution !== "map"}>
              <div className="g-card-heading asset-distribution-heading">
                <div>
                  <h3>客户区域地图</h3>
                  <p>按客户城市归属省级地区 · 点击省份，查看当地销售员和客户</p>
                </div>
                <Dropdown
                  label="选择地图省份"
                  inline
                  searchable
                  value={province}
                  options={[{ value: "", label: "选择省级地区" }, ...regions.map(([name, count]) => ({ value: name, label: `${name} · ${count} 家` }))]}
                  onChange={selectProvince}
                />
              </div>
              <div className={`asset-map-layout ${province ? "has-selection" : ""}`}>
                <div className="asset-map">
                  <CustomerMap
                    tone="glass"
                    counts={regionCounts}
                    selected={province}
                    onSelect={selectProvince}
                  />
                </div>
                <aside
                  className="asset-region"
                  ref={regionPanel}
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
                      <div className="asset-region-divider" aria-hidden="true"><span>·</span></div>
                      <section className="asset-region-section">
                        <div className="asset-region-subhead">
                          <h4><Users size={15} aria-hidden="true" />地区销售员</h4>
                          <small>点击筛选名下客户</small>
                        </div>
                        <div className="asset-reps">
                          {reps.map(([name, n]) => (
                            <button
                              type="button"
                              key={name}
                              className={salesFilter === name ? "active" : ""}
                              aria-pressed={salesFilter === name}
                              onClick={() => {
                                setSalesFilter(salesFilter === name ? "" : name);
                                setLimit(20);
                              }}
                            >
                              <span>{name}</span>
                              <small>{n} 家</small>
                            </button>
                          ))}
                          {!reps.length && <p className="asset-empty">暂无已关联商机的销售员信息</p>}
                        </div>
                      </section>
                      <div className="asset-region-divider" aria-hidden="true"><span>·</span></div>
                      <section className="asset-region-section">
                        <div className="asset-region-subhead">
                          <h4>地区客户</h4>
                          <small>{salesFilter || "全部销售员"} · {shown.length} 家</small>
                        </div>
                        <label className="g-search">
                          <Search size={15} aria-hidden="true" />
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
                            <button type="button" key={c.id} onClick={() => onCustomer(c)}>
                              <b>{c.name}<FolderOpen size={14} aria-hidden="true" /></b>
                              <small>{c.city || "城市未填写"} · {c.industry || "行业未填写"}</small>
                              <span>销售员：{owners(c).join("、") || "未关联"}</span>
                            </button>
                          ))}
                          {!shown.length && <p className="asset-empty">该地区暂无符合筛选的客户</p>}
                        </div>
                        {shown.length > limit && (
                          <button type="button" className="g-text" onClick={() => setLimit(limit + 20)}>
                            加载更多（剩余 {shown.length - limit} 家）
                          </button>
                        )}
                      </section>
                    </>
                  ) : (
                    <>
                      <h3>全国客户分布</h3>
                      <p className="asset-region-description">
                        点击地图中的省份，右侧将展开当地销售员和客户名单。
                      </p>
                      <div className="asset-region-divider" aria-hidden="true"><span>·</span></div>
                      {renderBars(regions, [], selectProvince)}
                    </>
                  )}
                </aside>
              </div>
              <p className="g-footnote">
                销售员来自关联商机，不以客户申请人替代。无关联商机的客户仍列入地区名单；区县歧义、缺失或无法识别的城市单列“地区待核实”。
              </p>
            </Tabs.Content>
            <Tabs.Content value="industry">
              <div className="g-card-heading asset-distribution-heading">
                <div><h3>客户行业分布</h3><p>客户数量 Top 10 · 点击行业联动筛选</p></div>
              </div>
              {renderBars(industries, filters.industry, name => updateFilters({
                ...filters,
                industry: filters.industry.includes(name) ? filters.industry.filter(item => item !== name) : [name],
              }))}
            </Tabs.Content>
            <Tabs.Content value="region">
              <div className="g-card-heading asset-distribution-heading">
                <div><h3>客户地区分布</h3><p>客户数量与占比 · 点击地区打开地图明细</p></div>
              </div>
              {renderBars(regions, [province], name => changeDistribution("map", province === name ? "" : name))}
            </Tabs.Content>
          </div>
        </Tabs.Root>
      </section>
      <section id="asset-customer-list" tabIndex={-1} className="g-card asset-all-customers" aria-labelledby="asset-customer-heading">
        <div className="g-card-heading"><div><h2 id="asset-customer-heading">全部客户</h2><p>当前筛选范围内共 {filtered.length} 家 · 点击客户名称查看合作档案</p></div></div>
        <div className="asset-list-toolbar">
          <label className="g-search"><Search size={16} /><input aria-label="搜索全部客户" placeholder="搜索客户名称、编号、行业或销售员" value={listSearch} onChange={e => {setListSearch(e.target.value);setListPage(1);}} /></label>
          <span>共 {listCustomers.length} 家客户</span>
        </div>
        <div className="asset-table-scroll" ref={listContent}><table className="asset-table">
          <thead><tr>{["客户名称 / 编号", "行业", "地区", "客户级别", "关联销售员", "关联商机", "申请时间", "操作"].map(t => <th key={t}>{t}</th>)}</tr></thead>
          <tbody>{listCustomers.slice((currentPage-1)*20,currentPage*20).map(c => <tr key={c.id}>
            <td><button className="asset-customer-name" onClick={() => onCustomer(c)}>{c.name}</button><small>{c.number || "编号未填写"}</small></td>
            <td><span className="asset-cell-tag" data-tone={c.industry ? undefined : "neutral"}
              style={c.industry ? { backgroundColor: tableBadgeColor("industry", c.industry) } : undefined}>{c.industry || "未填写"}</span></td>
            <td><span className="asset-cell-tag" data-tone={c.city ? undefined : "neutral"}
              style={c.city ? { backgroundColor: tableBadgeColor("region", c.city) } : undefined}>{c.city || "待核实"}</span></td>
            <td><span className="asset-cell-tag" data-tone={c.level ? "level" : "neutral"}>{c.level || "未填写"}</span></td>
            <td><SalesContactAvatars opportunities={linked.get(c.id) || []} /></td><td>{(linked.get(c.id) || []).length}</td>
            <td>{c.appliedAt && Number.isFinite(Date.parse(c.appliedAt)) ? new Date(c.appliedAt).toLocaleDateString("zh-CN", {timeZone:"Asia/Shanghai"}) : "未填写"}</td>
            <td><button className="g-text" onClick={() => onCustomer(c)}>查看档案 <FolderOpen size={14} aria-hidden="true" /></button></td>
          </tr>)}</tbody>
        </table>{!listCustomers.length && <p className="asset-empty asset-chart-empty">{loading ? "正在加载客户…" : "暂无符合条件的客户"}</p>}</div>
        <div className="asset-pagination"><span>每页 20 家 · 共 {listCustomers.length} 家</span>
          <button className="g-btn" disabled={currentPage <= 1} onClick={() => fadeSwap(listContent.current, () => setListPage(currentPage - 1))}>上一页</button>
          <span>{currentPage} / {pageCount}</span>
          <button className="g-btn" disabled={currentPage >= pageCount} onClick={() => fadeSwap(listContent.current, () => setListPage(currentPage + 1))}>下一页</button>
        </div>
      </section>
    </div>
  );
}
