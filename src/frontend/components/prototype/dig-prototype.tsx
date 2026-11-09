"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowDown, ArrowDownLeft, ArrowRight, ArrowUpRight, Bell, BookOpen, BriefcaseBusiness, Building2, CalendarDays, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Compass, FileCheck2, Flag, GitBranch, Handshake, Layers3, LayoutDashboard, Link2, ListFilter, LoaderCircle, MessageSquare, MoreHorizontal, Plus, Search, ShieldCheck, SlidersHorizontal, Sparkles, Target, TrendingUp, Users, WandSparkles, X } from "lucide-react";
import { resources, seed, signals, stages, type Customer, type DemoState, type Opportunity, type Task } from "./demo-data";
import JourneyBoard, { WIRE_STORAGE_KEY } from "./journey-board";
import CustomerBusinessLinks, { BUSINESS_LINKS_KEY } from "./customer-business-links";
import { REFERENCE_BLUE, REFERENCE_RED } from "./palette";
import "./prototype.css";
import "./reference-theme.css";
import "./readability.css";

type View = "today" | "discover" | "customers" | "pipeline" | "resources" | "management";
type Dialog = { type: "lead" | "followup" | "support" | "customer" | "opportunity" | "signal" | "help" | "notifications" | "group" | "lead-detail" | "collaboration" | "ignore" | "reset"; id?: string; team?: string } | null;
const navigation = [
  { id: "today", label: "今日工作", icon: LayoutDashboard },
  { id: "discover", label: "发现机会", icon: Compass },
  { id: "customers", label: "我的客户", icon: Users },
  { id: "pipeline", label: "推进商机", icon: GitBranch },
  { id: "resources", label: "找资源", icon: Handshake },
] as const;
const STORAGE_KEY = "dig-growth-prototype-v1";
const serviceCoverage: Record<string, string[]> = {
  "C-001": ["AI 解决方案", "基础运维"],
  "C-002": ["基础运维"],
  "C-003": ["资产管理软件", "基础运维"],
  "C-004": ["HRO 人员服务"],
  "C-005": ["基础运维"],
};
const money = (v: number) => v.toLocaleString("zh-CN", { maximumFractionDigits: 1 });

function Avatar({ name, tone = "blue", small = false }: { name: string; tone?: string; small?: boolean }) {
  return <span className={`p-avatar ${tone} ${small ? "small" : ""}`}>{name.slice(-2)}</span>;
}
function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return <span className={`p-tag ${tone}`}>{children}</span>;
}
function Empty({ text }: { text: string }) { return <div className="p-empty"><CheckCheck size={28} /><p>{text}</p></div>; }
function SectionTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return <div className="p-section-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{right}</div>;
}

export default function DigPrototype() {
  const [data, setData] = useState<DemoState>(seed);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("today");
  const [role, setRole] = useState("销售视角");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState("");
  const [taskTab, setTaskTab] = useState("待处理");
  const [business, setBusiness] = useState("全部业务");
  const [customerFilter, setCustomerFilter] = useState("全部客户");
  const [search, setSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [drawerTab, setDrawerTab] = useState("经营概览");
  const [leadName, setLeadName] = useState("");
  const [leadSource, setLeadSource] = useState("客户转介绍");
  const [leadNote, setLeadNote] = useState("");
  const [calendarOffset, setCalendarOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(8);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (["customers", "opportunities", "leads", "tasks", "events", "supports", "dismissed"].every(k => Array.isArray(parsed[k]))) setData(parsed);
      }
    } catch { /* A fresh demo remains usable when browser storage is unavailable. */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* Session state still works. */ } } }, [data, ready]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 3600); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") { setDialog(null); setSearch(""); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = modalRef.current?.querySelector<HTMLElement>("input, textarea, select") || modalRef.current?.querySelector<HTMLElement>("button");
    first?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const list = modalRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, textarea, [tabindex="0"]');
      if (!list?.length) return;
      if (e.shiftKey && document.activeElement === list[0]) { e.preventDefault(); list[list.length - 1].focus(); }
      if (!e.shiftKey && document.activeElement === list[list.length - 1]) { e.preventDefault(); list[0].focus(); }
    };
    window.addEventListener("keydown", trap);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", trap); previous?.focus(); };
  }, [dialog?.type, dialog?.id]);

  const ownedCustomers = data.customers.filter(c => role === "管理视角" || c.owner === "林悦");
  const ownedIds = new Set(ownedCustomers.map(c => c.id));
  const opportunities = data.opportunities.filter(o => ownedIds.has(o.customer) && (business === "全部业务" || o.business === business));
  const totalPipeline = opportunities.reduce((s, o) => s + o.amount, 0);
  const pending = data.tasks.filter(t => !t.done);
  const visibleSignals = signals.filter(s => !data.dismissed.includes(s.id));
  const customer = (id?: string) => data.customers.find(c => c.id === id);
  const opportunity = (id?: string) => data.opportunities.find(o => o.id === id);
  const notify = (text: string) => setToast(text);
  const go = (next: View) => { setView(next); setSearch(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const event = (customerId: string, title: string, detail: string) => ({ id: `E-${Date.now()}`, customer: customerId, title, detail, time: "刚刚" });
  const open = (next: NonNullable<Dialog>) => { setDrawerTab("经营概览"); setDialog(next); if (next.type === "lead") { setLeadName(""); setLeadNote(""); } };
  const complete = (task: Task) => {
    setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t), events: [event(task.customer, task.done ? `重新打开：${task.title}` : `已完成：${task.title}`, "来自今日工作 · 林悦"), ...d.events] }));
    notify(task.done ? "已恢复待办" : "已完成，客户时间线也记下了这一步");
  };
  const duplicate = data.customers.find(c => c.name === leadName.trim());
  const duplicateLead = data.leads.find(l => l.name === leadName.trim() && l.status !== "已关闭");

  function saveLead(e: FormEvent) {
    e.preventDefault();
    if (!leadName.trim()) return;
    // Only exact trimmed names match. No network or fuzzy customer lookup in this prototype.
    if (data.customers.some(c => c.name === leadName.trim()) || data.leads.some(l => l.name === leadName.trim() && l.status !== "已关闭")) return;
    const id = `L-${Date.now()}`;
    setData(d => ({ ...d, leads: [{ id, name: leadName.trim(), source: leadSource, note: leadNote.trim(), status: "待验证" }, ...d.leads], events: [event("", `新增线索：${leadName.trim()}`, `来源：${leadSource} · 待验证需求`), ...d.events] }));
    setDialog(null); go("discover"); notify("线索已记下，先聊需求，再考虑商机");
  }

  function addFollowup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget);
    const cid = String(form.get("customer")); const note = String(form.get("note")).trim();
    const next = String(form.get("next")).trim(); const date = String(form.get("date"));
    setData(d => ({ ...d, events: [event(cid, "记录了一次客户沟通", `${note} · 下一步：${next}（${date}）`), ...d.events], tasks: [...d.tasks, { id: `T-${Date.now()}`, customer: cid, title: next, note: `${customer(cid)?.short} · 来自本次沟通`, time: date, kind: "客户跟进", priority: "计划跟进", done: false }] }));
    setDialog(null); notify("跟进已保存，下一步已加入待办");
  }

  function saveSupport(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget); const oid = String(form.get("opportunity")); const team = String(form.get("team")); const need = String(form.get("need")).trim();
    setData(d => ({ ...d, supports: [{ id: `S-${Date.now()}`, opportunity: oid, team, need, status: "待响应" }, ...d.supports], events: [event(opportunity(oid)?.customer || "", `申请${team}支持`, `${need} · 演示申请已进入协同队列`), ...d.events] }));
    setDialog(null); notify("演示协同申请已创建，可在「找资源」查看进度");
  }

  function convertLead(e: FormEvent<HTMLFormElement>, sourceId: string, isSignal = false) {
    e.preventDefault(); const form = new FormData(e.currentTarget);
    const lead = data.leads.find(l => l.id === sourceId); const signal = signals.find(s => s.id === sourceId);
    const cid = isSignal ? signal!.customer : data.customers.find(c => c.name === lead?.name)?.id || `C-${Date.now()}`;
    const title = String(form.get("title")).trim(); const amount = Number(form.get("amount")); const next = String(form.get("next")).trim();
    const nextOpp: Opportunity = { id: `O-${Date.now()}`, customer: cid, title, amount, stage: 0, business: String(form.get("business")) as Opportunity["business"], next, date: "待约定", approval: "尚未发起" };
    setData(d => ({ ...d,
      customers: d.customers.some(c => c.id === cid) ? d.customers : [...d.customers, { id: cid, name: lead!.name, short: lead!.name.replace(/有限公司$/, ""), industry: "待完善", owner: "林悦", tier: "潜力客户", business: nextOpp.business, health: "需求已确认", revenue: 0, cost: 0, days: 0, color: "blue" }],
      opportunities: [...d.opportunities, nextOpp], leads: d.leads.map(l => l.id === sourceId ? { ...l, status: "已转化" } : l),
      dismissed: isSignal ? [...d.dismissed, sourceId] : d.dismissed,
      events: [event(cid, `需求已验证，建立商机：${title}`, `责任人：林悦 · 下一步：${next}`), ...d.events],
    }));
    setDialog(null); go("pipeline"); notify("已确认真实需求，正式商机建立成功");
  }

  const filteredCustomers = ownedCustomers.filter(c => (!customerSearch || c.name.includes(customerSearch) || c.industry.includes(customerSearch)) && (customerFilter === "全部客户" || (customerFilter === "待续约" ? c.days > 0 && c.days <= 60 : c.health === "经营关注")) && (business === "全部业务" || c.business === business));
  const searchResults = useMemo(() => search.trim() ? ownedCustomers.filter(c => c.name.includes(search.trim())).slice(0, 5) : [], [search, data.customers, role]);

  function MetricCards({ management = false }: { management?: boolean }) {
    const revenue = ownedCustomers.reduce((s, c) => s + c.revenue, 0);
    const values = management ? [
      { label: "已归集收入", value: money(revenue), unit: "万元", sub: "演示经营快照 · 2026 年累计", icon: TrendingUp, click: () => go("management") },
      { label: "已归集毛利", value: money(ownedCustomers.reduce((s, c) => s + c.revenue - c.cost, 0)), unit: "万元", sub: "已归集收入 − 已归集成本", icon: Layers3, click: () => go("management") },
      { label: "推进卡点", value: String(opportunities.filter(o => o.stalled).length), unit: "项", sub: "需要管理者帮助解开", icon: Flag, click: () => go("pipeline") },
      { label: "待响应协同", value: String(data.supports.filter(s => s.status !== "已响应").length), unit: "项", sub: "协调资源，让机会继续向前", icon: Handshake, click: () => go("resources") },
    ] : [
      { label: "我经营的客户", value: String(ownedCustomers.length).padStart(2, "0"), unit: "家", sub: "每一段关系，都值得认真经营", icon: Users, click: () => go("customers") },
      { label: "推进中的商机", value: String(opportunities.length).padStart(2, "0"), unit: "个", sub: `预计金额 ¥ ${money(totalPipeline)} 万`, icon: GitBranch, click: () => go("pipeline") },
      { label: "值得探索的机会", value: String(visibleSignals.length).padStart(2, "0"), unit: "条", sub: "从已有连接，发现新的可能", icon: Compass, click: () => go("discover") },
      { label: "即将续约的客户", value: String(ownedCustomers.filter(c => c.days > 0 && c.days <= 60).length).padStart(2, "0"), unit: "家", sub: "未来 60 天 · 提前一步联系", icon: CalendarDays, click: () => { setCustomerFilter("待续约"); go("customers"); } },
    ];
    return <div className="p-metrics">{values.map((m, i) => <button key={m.label} className={`p-metric ${i === 1 ? "featured" : ""}`} onClick={m.click}><span className="p-metric-label">{m.label}<m.icon size={17} /></span><strong>{m.value}<small>{m.unit}</small></strong><span className="p-metric-bottom">{m.sub}<ArrowUpRight size={14} /></span><span className={`p-sparkline spark-${i}`}><svg viewBox="0 0 90 30" aria-hidden="true"><path d={i % 2 ? "M1 27L13 24L25 26L37 14L49 18L61 7L73 12L89 2" : "M1 25L13 25L25 17L37 20L49 10L61 14L73 5L89 7"} /></svg></span></button>)}</div>;
  }

  function TaskPanel() {
    const rows = data.tasks.filter(t => taskTab === "已完成" ? t.done : !t.done && (taskTab !== "待协同" || t.kind === "待协同"));
    return <section className="p-card p-tasks"><SectionTitle title="今天，把这几件事做好" subtitle="从最值得的一次联系开始。" right={<span className="p-round-count">{pending.length} 项待办</span>} /><div className="p-tabs">{["待处理", "待协同", "已完成"].map(t => <button key={t} className={taskTab === t ? "selected" : ""} onClick={() => setTaskTab(t)}>{t}<span>{data.tasks.filter(x => t === "已完成" ? x.done : !x.done && (t !== "待协同" || x.kind === "待协同")).length}</span></button>)}</div><div>{(showAllTasks ? rows : rows.slice(0, 3)).map(t => <div className={`p-task-row ${t.done ? "done" : ""}`} key={t.id}><button className="p-task-check" aria-label={`${t.done ? "恢复" : "完成"}${t.title}`} aria-pressed={t.done} onClick={() => complete(t)}>{t.done && <Check size={13} />}</button><div className="p-task-copy"><div><strong>{t.title}</strong><Tag tone={t.priority === "优先处理" ? "amber" : t.priority === "需要关注" ? "rose" : "blue"}>{t.priority}</Tag></div><p>{t.note}</p><span className="p-task-time"><Clock3 size={12} />{t.time}<i />{t.kind}</span></div><button className="p-task-action" onClick={() => open(t.kind === "待协同" ? { type: "support", id: "O-004" } : { type: "followup", id: t.customer })}>{t.kind === "待协同" ? "找人帮忙" : "记一下"}<ArrowUpRight size={13} /></button></div>)}{!rows.length && <Empty text="这一页已经清空，给客户多一点时间。" />}</div>{rows.length > 3 && <button className="p-full-link" onClick={() => setShowAllTasks(!showAllTasks)}>{showAllTasks ? "收起待办" : `查看全部 ${rows.length} 项待办`}<ChevronDown size={14} /></button>}<div className="p-soft-footer"><WandSparkles size={14} />完成工作，进展自然留下。无需再写一份日报。</div></section>;
  }

  function GrowthSummary() {
    const stable = ownedCustomers.filter(c => c.health === "合作稳定").length;
    const renewal = ownedCustomers.filter(c => c.days > 0 && c.days <= 60).length;
    const attention = ownedCustomers.filter(c => c.health === "经营关注").length;
    const nurturing = Math.max(0, ownedCustomers.length - stable - renewal - attention);
    const segments = [
      { label: "稳定合作", value: stable, color: REFERENCE_BLUE },
      { label: "续约窗口", value: renewal, color: "#c4b5a3" },
      { label: "经营关注", value: attention, color: REFERENCE_RED },
      ...(nurturing ? [{ label: "关系培育", value: nurturing, color: "#b9b1c9" }] : []),
    ];
    let offset = 0;
    return <section className="p-card p-relationship-summary">
      <SectionTitle title="让关系，持续生长" subtitle="客户关系全貌 · 合成演示数据" right={<button className="p-circle-button" aria-label="查看客户关系" onClick={() => go("customers")}><ArrowUpRight size={15} /></button>} />
      <div className="p-health-donut">
        <svg viewBox="0 0 160 160" role="img" aria-label={`${stable} 家稳定合作，${renewal} 家进入续约窗口，${attention} 家经营关注，${nurturing} 家关系培育`}>
          <circle cx="80" cy="80" r="61" fill="none" stroke="#e4e5ec" strokeWidth="18" />
          {segments.map(s => {
            const length = s.value / Math.max(ownedCustomers.length, 1) * 383.27;
            const start = offset; offset += length;
            return <circle key={s.label} cx="80" cy="80" r="61" fill="none" stroke={s.color} strokeWidth="18" strokeDasharray={`${Math.max(0, length - 5)} ${383.27 - Math.max(0, length - 5)}`} strokeDashoffset={-start} transform="rotate(-90 80 80)" strokeLinecap="round" />;
          })}
        </svg>
        <div><strong>{String(ownedCustomers.length).padStart(2, "0")}</strong><span>段值得经营的关系</span></div>
      </div>
      <div className="p-relationship-legend">{segments.map(s => <button key={s.label} onClick={() => { setCustomerFilter(s.label === "续约窗口" ? "待续约" : s.label === "经营关注" ? "经营关注" : "全部客户"); go("customers"); }}><i style={{ background: s.color }} /><span>{s.label}</span><b>{s.value}</b><ChevronRight size={12} /></button>)}</div>
    </section>;
  }

  function Pipeline({ compact = false }: { compact?: boolean }) {
    return <section className={`p-card p-pipeline ${compact ? "compact" : ""}`}><SectionTitle title={compact ? "正在推进的连接" : "商机推进看板"} subtitle={compact ? "从真实需求出发，走到持续合作。" : "阶段可以前进或回退，审批与签约状态单独跟踪。"} right={compact ? <button className="p-text-btn" onClick={() => go("pipeline")}>全部商机<ArrowUpRight size={14} /></button> : <span className="p-round-count">¥ {money(totalPipeline)} 万</span>} />{compact && <div className="p-journey-team"><span>把对的人，连接在一起</span><div className="p-team-avatars">{[{name:"林悦",tone:"blue"},{name:"陈序",tone:"sage"},{name:"许墨",tone:"sand"},{name:"周宁",tone:"lilac"}].map(p => <span key={p.name} title={p.name}><Avatar name={p.name} tone={p.tone} small /><i /></span>)}</div><button className="p-circle-button" aria-label="邀请团队支持" onClick={() => open({type:"support"})}><Plus size={14}/></button><span className="p-team-caption">客户经理 · 解决方案 · 交付</span></div>}<JourneyBoard opportunities={opportunities} customers={ownedCustomers} compact={compact} onOpen={id => open({type:"opportunity",id})} onCreate={() => {go("discover"); notify("先验证客户需求，再建立有效商机");}} />{compact && <div className="p-journey-footer">{["确认真实需求","匹配产品与资源","准备报价与审批","连接交付与续约"].map((label,i) => <span key={label}><i>0{i+1}</i>{label}</span>)}</div>}</section>;
  }

  function CustomerTable({ compact = false }: { compact?: boolean }) {
    return <section className="p-card p-customer-table"><SectionTitle title={compact ? "关系常在，生意常新" : "我的客户"} subtitle={compact ? "不止关注成交，也关心每一次合作的温度。" : "客户、商机与交付，在同一个地方连接起来。"} right={compact ? <button className="p-text-btn" onClick={() => go("customers")}>客户全景<ArrowUpRight size={14} /></button> : <button className="p-btn" onClick={() => open({ type: "lead" })}><Plus size={14} />记一个线索</button>} />{!compact && <div className="p-table-controls"><div className="p-tabs">{["全部客户", "待续约", "经营关注"].map(t => <button className={customerFilter === t ? "selected" : ""} key={t} onClick={() => setCustomerFilter(t)}>{t}</button>)}</div><label className="p-inline-search"><Search size={14} /><input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="搜索客户或行业" aria-label="搜索客户或行业" /></label></div>}<div className="p-table-scroll"><table><thead><tr><th>客户 / 行业</th><th>合作类型</th><th>关系状态</th><th>商机金额</th><th>下一次连接</th><th /></tr></thead><tbody>{(compact ? ownedCustomers.slice(0, 3) : filteredCustomers).map(c => <tr key={c.id} onClick={() => open({ type: "customer", id: c.id })}><td><div className="p-company-cell"><span className={`p-company-logo ${c.color}`}>{c.short.slice(0, 1)}</span><div><button onClick={e => { e.stopPropagation(); open({ type: "customer", id: c.id }); }}>{c.short}</button><small>{c.industry}<span>·</span>{c.tier}</small></div></div></td><td><Tag>{c.business}</Tag></td><td><span className={`p-health ${c.health === "合作稳定" ? "sage" : "amber"}`}><i />{c.health}</span></td><td className="p-numeric">¥ {money(data.opportunities.filter(o => o.customer === c.id).reduce((s, o) => s + o.amount, 0))}<small> 万</small></td><td><span className="p-next-contact">{c.days <= 60 && c.days > 0 ? "准备续约沟通" : "保持日常联系"}</span></td><td><ChevronRight size={14} /></td></tr>)}</tbody></table>{!compact && !filteredCustomers.length && <Empty text="暂时没有符合条件的客户，试试调整筛选。" />}</div></section>;
  }

  function Discover() {
    return <><div className="p-discover-banner"><span className="p-banner-symbol"><Compass size={34} strokeWidth={1.2} /></span><div><span className="p-overline">THE NEXT CONNECTION</span><h2>新的机会，可能就在老朋友之间。</h2><p>从客户的真实场景出发，找到 DIG 可以带来的下一份价值。</p></div><Tag tone="blue">规则推荐 · 待验证</Tag></div><SectionTitle title="值得聊一聊" subtitle="每一条推荐都有依据，每一个商机都要先确认需求。" right={<span className="p-muted">{visibleSignals.length} 条候选机会</span>} /><div className="p-signal-grid">{visibleSignals.map(s => <article className={`p-card p-signal-card ${s.color}`} key={s.id}><div className="p-between"><Tag tone={s.color}>{s.tag}</Tag><span className="p-muted">{customer(s.customer)?.short}</span></div><h3>{s.title}</h3><p>{s.text}</p><div className="p-signal-evidence"><Link2 size={13} /><span>{s.evidence}</span></div><div className="p-signal-actions"><button className="p-btn dark" onClick={() => open({ type: "signal", id: s.id })}>看看怎么聊<ArrowUpRight size={13} /></button><button className="p-text-btn" onClick={() => open({ type: "ignore", id: s.id })}>暂不考虑</button></div></article>)}</div>{!visibleSignals.length && <Empty text="推荐已处理完，继续维护线索也能发现新机会。" />}<section className="p-card p-leads"><SectionTitle title="我的线索夹" subtitle="先记下来，不必一开始就知道所有答案。" right={<button className="p-btn" onClick={() => open({ type: "lead" })}><Plus size={14} />记一个线索</button>} />{data.leads.map(l => <div className="p-lead-row" key={l.id}><span className="p-company-logo slate"><Building2 size={18} /></span><div><h3>{l.name}</h3><p>{l.note || "还没有备注，先从一次联系开始。"}</p><small>{l.source} · 发现人 林悦</small></div><Tag tone={l.status === "已转化" ? "sage" : "blue"}>{l.status}</Tag><button className="p-text-btn" onClick={() => open({ type: "lead-detail", id: l.id })}>{l.status === "已转化" ? "查看进展" : "验证需求"}<ArrowRight size={14} /></button></div>)}</section></>;
  }

  function ResourceView() {
    return <><div className="p-intro-line"><Handshake size={24} /><p>你离下一步，可能只差一个对的人。<span>把需求带进来，和团队一起找到解法。</span></p></div><div className="p-resource-grid">{resources.map((r, i) => <article className="p-card p-resource-card" key={r.title}><div className={`p-resource-symbol ${["blue", "sage", "lilac"][i]}`}>{i === 0 ? <Sparkles size={26} /> : i === 1 ? <Layers3 size={26} /> : <GitBranch size={26} />}</div><h3>{r.title}</h3><p>{r.subtitle}</p><div className="p-tags">{r.tags.map(t => <Tag key={t}>{t}</Tag>)}</div><div className="p-resource-case"><small>适用场景</small><p>{r.cases}</p></div><div className="p-resource-person"><Avatar name={r.owner} tone={i === 1 ? "sage" : "blue"} /><div><b>{r.owner}</b><small>{r.role}</small></div></div><button className="p-btn" onClick={() => open({ type: "support", team: r.title })}>请团队一起看看<ArrowUpRight size={14} /></button><small className="p-response"><Clock3 size={11} />{r.time}</small></article>)}</div><section className="p-card p-supports"><SectionTitle title="我的协同请求" subtitle="从发起到响应，把每一次支持落到实处。" /><div className="p-support-list">{data.supports.map(s => <div className="p-support-row" key={s.id}><span className={`p-support-state ${s.status === "已响应" ? "sage" : "amber"}`}>{s.status === "已响应" ? <Check size={17} /> : <Clock3 size={17} />}</span><div><h3>{s.need}</h3><p>{opportunity(s.opportunity)?.title || "客户负责关系协作"} · {s.team}</p></div><Tag tone={s.status === "已响应" ? "sage" : "amber"}>{s.status}</Tag>{s.status !== "已响应" ? <button className="p-text-btn" onClick={() => {
      if (role === "管理视角") { setData(d => ({ ...d, supports: d.supports.map(x => x.id === s.id ? { ...x, status: "已响应", assignee: "陈序" } : x), events: [event(opportunity(s.opportunity)?.customer || "", "管理者协调了支持资源", `${s.need} · 负责人：陈序`), ...d.events] })); notify("演示已分配给陈序，响应进展已留痕"); }
      else { setRole("管理视角"); notify("已切换管理演示视角，可分配资源并确认响应"); }
    }}>{role === "管理视角" ? "分配给陈序" : "请主管协调"}<ArrowUpRight size={13} /></button> : <span className="p-muted">{s.assignee} · 已加入</span>}</div>)}</div></section></>;
  }

  function Management() {
    const totalRevenue = ownedCustomers.reduce((s, c) => s + c.revenue, 0);
    return <>{MetricCards({ management: true })}<section className="p-card p-interventions"><SectionTitle title="管理的价值，是让业务继续向前" subtitle="从异常出发，给团队具体的支持。" right={<Tag tone="amber">需要你的一次推动</Tag>} />{[
      { title: "云杉物流：方案资源等待中", body: "商机停滞 12 天，销售已明确提出自动化专家支持需求。", tag: "资源卡点", action: "协调资源", click: () => go("resources") },
      { title: "HRO 合作：关注投入与收益", body: "已归集毛利率 8.3%，建议复核人员利用率与服务结构。", tag: "经营关注", action: "查看客户", click: () => open({ type: "customer", id: "C-004" }) },
      { title: "远岚制造：续约窗口已开启", body: "合同还有 45 天到期，需要提前确认客户意向及报价策略。", tag: "续约关注", action: "查看推进", click: () => open({ type: "opportunity", id: "O-002" }) },
    ].map((r, i) => <div className="p-intervention" key={r.title}><span className={`p-issue-icon ${i === 1 ? "rose" : "amber"}`}>{i === 0 ? <Handshake size={19} /> : i === 1 ? <TrendingUp size={19} /> : <CalendarDays size={19} />}</span><div><h3>{r.title}</h3><p>{r.body}</p></div><Tag tone="amber">{r.tag}</Tag><button className="p-btn" onClick={r.click}>{r.action}<ArrowUpRight size={13} /></button></div>)}</section><div className="p-management-grid"><section className="p-card"><SectionTitle title="三类业务，分别看清" subtitle="2026 年累计 · 合成经营快照 · 单位：万元" /><div className="p-business-chart">{(["项目制", "基础运维", "HRO"] as const).map((b, i) => { const rows = ownedCustomers.filter(c => c.business === b); const rev = rows.reduce((s, c) => s + c.revenue, 0); const cost = rows.reduce((s, c) => s + c.cost, 0); return <div key={b}><div className="p-between"><b>{b}</b><span>¥ {money(rev)} 万<small> · 毛利率 {rev ? ((rev - cost) / rev * 100).toFixed(1) : 0}%</small></span></div><div className="p-business-track"><span className={`chart-${i}`} style={{ width: `${rev / Math.max(totalRevenue, 1) * 100}%` }} /></div><p>{i === 0 ? "全周期管理 · 售前投入与项目关联" : i === 1 ? "服务规模 · 逐步拆分 7 项服务成本基线" : "人员利用率 · 评估服务结构与业务收拢"}</p></div>; })}</div><div className="p-soft-footer"><CircleHelp size={13} />当前为已归集口径，未覆盖成本不得视为最终利润。</div></section><section className="p-card"><SectionTitle title="客户不是终点，是连接的中心" subtitle="保留独立编码，把业务链路连接起来。" /><div className="p-relation-tree"><div><Building2 size={18} /><b>客户主档</b><small>客户 ID · 统一身份</small></div><span /><section><article><Target size={17} />商机 / POC<small>投入、验证与转化</small></article><article><FileCheck2 size={17} />合同关联<small>集团正式审批与凭证</small></article><article><Layers3 size={17} />交付项目<small>项目编码与成本归集</small></article></section><p><Link2 size={13} />POC 投入保留原记录，关联到正式项目后归集</p></div></section></div></>;
  }

  const activeCustomer = customer(dialog?.id);
  const activeOpp = opportunity(dialog?.id);
  const activeSignal = signals.find(s => s.id === dialog?.id);
  const activeLead = data.leads.find(l => l.id === dialog?.id);
  const isDrawer = dialog?.type === "customer" || dialog?.type === "opportunity";
  const dialogTitles: Record<NonNullable<Dialog>["type"], string> = { lead: "先记一个线索", followup: "记下一次有价值的沟通", support: "请对的人，一起向前", customer: activeCustomer?.short || "客户全景", opportunity: activeOpp?.title || "商机详情", signal: "从一个好问题开始", help: "关于这个工作台", notifications: "你的工作提醒", group: "集团流程材料预览", "lead-detail": "把线索，聊成真实需求", collaboration: "发起内部客户协作", ignore: "这次为什么暂不考虑？", reset: "恢复最初的演示工作区" };

  return <div className="prototype p-reference" data-ready={ready}>
    <aside className="p-sidebar"><a className="p-brand" href="/" aria-label="DIG 客户增长工作台"><span className="p-brand-mark"><Layers3 size={25} strokeWidth={1.5} /></span><strong>DIG<span> / </span><small>客户增长</small></strong></a><button className="p-workspace" onClick={() => open({ type: "help" })}><span className="p-workspace-logo">D</span><span>DIG 业务工作空间<small>把连接变成价值</small></span><ChevronDown size={13} /></button><p className="p-nav-caption">我的工作空间</p><nav aria-label="主导航">{navigation.map(n => <button key={n.id} aria-label={n.label} title={n.label} className={`p-nav-item ${view === n.id ? "active" : ""}`} onClick={() => go(n.id)}><n.icon size={18} strokeWidth={1.7} /><span>{n.label}</span>{n.id === "today" && <i>{pending.length}</i>}{n.id === "discover" && <span className="p-new-dot" />}</button>)}</nav><div className="p-nav-divider" /><p className="p-nav-caption">经营与协同</p><nav aria-label="经营导航"><button aria-label="经营视图" title="经营视图" className={`p-nav-item ${view === "management" ? "active" : ""}`} onClick={() => { setRole("管理视角"); go("management"); }}><TrendingUp size={18} strokeWidth={1.7} /><span>经营视图</span><Tag>管理</Tag></button><button className="p-nav-item" aria-label="团队协同" title="团队协同" onClick={() => { go("resources"); }}><Users size={18} strokeWidth={1.7} /><span>团队协同</span><i>{data.supports.filter(s => s.status !== "已响应").length}</i></button></nav><div className="p-sidebar-bottom"><div className="p-sidebar-note"><span className="p-note-orbit"><Compass size={25} strokeWidth={1} /></span><p>客户的下一步，<br /><b>也是增长的下一步。</b></p><button onClick={() => go("discover")}>去发现新的可能<ArrowUpRight size={13} /></button></div><button aria-label="原型使用说明" title="原型使用说明" className="p-help" onClick={() => open({ type: "help" })}><CircleHelp size={16} />原型使用说明<ArrowUpRight size={12} /></button><div className="p-user"><Avatar name="林悦" tone="slate" /><div><b>林悦</b><small>DIG · 客户经理</small></div><button aria-label="切换演示角色" onClick={() => { setRole(role === "销售视角" ? "管理视角" : "销售视角"); if (view === "management") go("today"); }}><ChevronDown size={15} /></button></div></div></aside>
    <div className="p-app"><header className="p-topbar"><div className="p-top-brand"><Layers3 size={25} strokeWidth={1.5} /><strong>DIG<span>客户增长</span></strong></div><nav className="p-topnav" aria-label="工作区页面">{navigation.map(n => <button key={n.id} className={view === n.id ? "active" : ""} onClick={() => go(n.id)}>{n.id === "today" ? "工作台" : n.id === "discover" ? "发现机会" : n.id === "customers" ? "客户" : n.id === "pipeline" ? "商机" : "资源"}</button>)}</nav><div className="p-breadcrumb"><span>工作空间</span><ChevronRight size={13} /><b>{navigation.find(n => n.id === view)?.label || "经营视图"}</b></div><div className="p-top-actions"><div className="p-search-wrap"><label className="p-global-search"><Search size={15} /><input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索客户，找到连接…" aria-label="搜索客户" /><kbd>⌘ K</kbd></label>{search && <div className="p-search-results">{searchResults.map(c => <button key={c.id} onClick={() => { open({ type: "customer", id: c.id }); setSearch(""); }}><Building2 size={15} /><span>{c.name}</span><ChevronRight size={13} /></button>)}{!searchResults.length && <p>当前演示视角没有匹配的客户</p>}</div>}</div><span className="p-prototype-badge"><i />交互原型</span><button className="p-notification" aria-label="工作提醒" onClick={() => open({ type: "notifications" })}><Bell size={18} /><i /></button><Avatar name="林悦" tone="slate" small /></div></header>
    <div className="p-work-area"><main className="p-main-content"><div className="p-page-heading"><div><div className="p-eyebrow">MY CUSTOMER JOURNEY</div><h1>{view === "today" ? <>客户增长旅程<span className="p-heading-dot"> / </span><small>Customer Journeys</small></> : { discover: "发现下一次增长", customers: "让客户关系，持续生长", pipeline: "每一步，都离成交更近", resources: "好机会，值得一起推进", management: "看清业务，也支持业务" }[view]}</h1><p>{view === "today" ? <>你好，林悦。今天有 <b>{pending.length}</b> 件值得优先处理的事。</> : "让客户需求、团队能力与经营行动，在这里连接。"}</p></div><div className="p-heading-actions"><button className="p-btn" onClick={() => open({ type: "followup" })}><MessageSquare size={15} />快捷跟进</button><button className="p-btn dark" onClick={() => open({ type: "lead" })}><Plus size={16} />记一个线索</button></div></div>
    <div className="p-viewbar"><div className="p-view-selector"><button className={role === "销售视角" ? "selected" : ""} onClick={() => { setRole("销售视角"); if (view === "management") go("today"); }}><Users size={13} />我的工作</button><button className={role === "管理视角" ? "selected" : ""} onClick={() => { setRole("管理视角"); go("management"); }}>团队经营</button></div><div className="p-viewbar-right"><label><SlidersHorizontal size={13} /><select aria-label="筛选业务类型" value={business} onChange={e => setBusiness(e.target.value)}>{["全部业务", "项目制", "基础运维", "HRO"].map(b => <option key={b}>{b}</option>)}</select></label><span><CalendarDays size={13} />2026 年 11 月 8 日</span></div></div>
    <div key={view} className="p-view-content">{view === "today" && <>{Pipeline({ compact: true })}{MetricCards({})}<div className="p-workbench-bottom">{TaskPanel()}{GrowthSummary()}</div>{CustomerTable({ compact: true })}</>}{view === "discover" && Discover()}{view === "customers" && <>{MetricCards({})}{CustomerTable({})}</>}{view === "pipeline" && <><div className="p-pipeline-summary"><span><GitBranch size={17} />{opportunities.length} 个商机正在推进</span><b>¥ {money(totalPipeline)} <small>万 · 预计金额</small></b><Tag tone="amber">{opportunities.filter(o => o.stalled).length} 个卡点待解</Tag></div>{Pipeline({})}<div className="p-guidance"><ShieldCheck size={17} /><p><b>少一步重复，多一步推进。</b>商机信息随流程复用。正式审批、合同凭证由集团系统负责。</p></div></>}{view === "resources" && ResourceView()}{view === "management" && Management()}</div><footer className="p-footer"><span><span className="p-small-logo">DIG</span>连接客户 · 协同增长</span><span>合成演示数据 · 无外部连接 · 仅本机保存</span></footer></main>
    <aside className="p-rightbar"><div className="p-right-date"><span>你的一天</span><CalendarDays size={16} /><b>NOVEMBER <span>2026</span></b></div><div className="p-week-controls"><span>11 月 {2 + calendarOffset} 日 — {8 + calendarOffset} 日</span><div><button aria-label="上一周" disabled={calendarOffset <= 0} onClick={() => { setCalendarOffset(x => x - 7); setSelectedDay(8 + calendarOffset - 7); }}><ChevronLeft size={14} /></button><button aria-label="下一周" disabled={calendarOffset >= 21} onClick={() => { setCalendarOffset(x => x + 7); setSelectedDay(8 + calendarOffset + 7); }}><ChevronRight size={14} /></button></div></div><div className="p-week">{["一", "二", "三", "四", "五", "六", "日"].map((day, i) => <button className={selectedDay === i + 2 + calendarOffset ? "selected" : ""} key={day} onClick={() => setSelectedDay(i + 2 + calendarOffset)}><span>{day}</span><b>{i + 2 + calendarOffset}</b><i className={i === 2 || i === 6 ? "has-event" : ""} /></button>)}</div><div className="p-agenda"><div className="p-between"><h3>{selectedDay === 8 ? "今日安排" : `11 月 ${selectedDay} 日`}</h3><span>{selectedDay === 8 ? "2 项" : "暂无安排"}</span></div>{selectedDay === 8 ? <><button className="p-agenda-item" onClick={() => open({ type: "customer", id: "C-002" })}><time>09:30</time><div><b>远岚制造 · 续约沟通</b><small><span className="p-mini-dot sage" />客户连接 · 30 分钟</small></div></button><button className="p-agenda-item" onClick={() => open({ type: "opportunity", id: "O-001" })}><time>14:00</time><div><b>知识库方案内部共创</b><small><span className="p-mini-dot blue" />陈序、林悦 · 60 分钟</small></div></button></> : <div className="p-free-day"><CalendarDays size={20} /><p>给下一次连接，留一点空间。</p><button className="p-text-btn" onClick={() => open({ type: "followup" })}>安排一次跟进<Plus size={12} /></button></div>}</div><div className="p-right-divider" /><section className="p-growth-radar"><div className="p-between"><h2><Sparkles size={16} />增长雷达</h2><Tag tone="blue">{visibleSignals.length} 个新可能</Tag></div><p className="p-right-subtitle">有依据的推荐，有温度的切入。</p>{visibleSignals.slice(0, 2).map((s, i) => <button key={s.id} className={`p-radar-item radar-${i}`} onClick={() => open({ type: "signal", id: s.id })}><div><Tag tone={s.color}>{s.tag}</Tag><ArrowUpRight size={15} /></div><h3>{s.title}</h3><p>{s.text}</p><span><Building2 size={12} />{customer(s.customer)?.short}<span>待验证</span></span></button>)}<button className="p-full-link" onClick={() => go("discover")}>探索更多机会<ArrowRight size={13} /></button></section><div className="p-right-divider" /><section className="p-team-pulse"><div className="p-between"><h2>一起向前</h2><span className="p-live-indicator">业务动态</span></div><div className="p-event-list">{data.events.slice(0, 3).map((e, i) => <button key={e.id} onClick={() => e.customer && ownedIds.has(e.customer) ? open({ type: "customer", id: e.customer }) : open({ type: "notifications" })}><span className={`p-event-dot event-${i}`} /><div><p>{e.title}</p><small>{e.time}</small></div></button>)}</div></section><div className="p-right-quote"><span>“</span><p>好的经营，<br />从认真对待每一次连接开始。</p><small>GROW WITH EVERY CONNECTION</small></div></aside></div></div>

    {toast && <div role="status" className="p-toast"><CheckCheck size={17} />{toast}<button aria-label="关闭提示" onClick={() => setToast("")}><X size={14} /></button></div>}
    {dialog && <div className={`p-overlay ${isDrawer ? "drawer" : ""}`} onMouseDown={e => { if (e.target === e.currentTarget) setDialog(null); }}><div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="p-dialog-title" className={`p-dialog ${isDrawer ? "p-drawer" : ""}`}><div className="p-dialog-header"><div><span className="p-overline">DIG / {dialog.type === "lead" ? "A NEW CONNECTION" : "GROW TOGETHER"}</span><h2 id="p-dialog-title">{dialogTitles[dialog.type]}</h2></div><button className="p-close" aria-label="关闭弹窗" onClick={() => setDialog(null)}><X size={19} /></button></div><div className="p-dialog-body">
      {dialog.type === "lead" && <form onSubmit={saveLead} className="p-form"><p className="p-form-intro">只需一个名字和一个来源。其他信息，随着关系慢慢补全。</p><label>客户名称 <em>*</em><input autoComplete="off" value={leadName} onChange={e => setLeadName(e.target.value)} required placeholder="输入完整企业名称" /></label><label>从哪里认识？ <em>*</em><select value={leadSource} onChange={e => setLeadSource(e.target.value)}>{["客户转介绍", "自主开发", "市场活动", "内部协作", "其他来源"].map(s => <option key={s}>{s}</option>)}</select></label><label>顺手记一句 <span>选填</span><textarea value={leadNote} onChange={e => setLeadNote(e.target.value)} placeholder="比如：朋友介绍，可能需要一个知识库…" rows={3} /></label>{duplicate && <div className="p-form-callout"><ShieldCheck size={19} /><div><b>这位客户已经有连接了</b><p>名称完全匹配 · 负责人：{duplicate.owner}。可以申请协作，一起推进。</p><button type="button" className="p-text-btn" onClick={() => open({ type: "collaboration", id: duplicate.id })}>申请内部协作<ArrowRight size={13} /></button></div></div>}{duplicateLead && !duplicate && <div className="p-form-callout"><CircleHelp size={18} /><p>线索夹里已有同名记录，状态为「{duplicateLead.status}」。<button type="button" className="p-text-btn" onClick={() => open({ type: "lead-detail", id: duplicateLead.id })}>查看已有线索</button></p></div>}<div className="p-auto-fields"><WandSparkles size={14} />发现人 林悦 · 创建时间自动记录 · 先存为线索</div><div className="p-modal-actions"><button type="button" className="p-btn" onClick={() => setDialog(null)}>先放一放</button><button className="p-btn dark" disabled={!leadName.trim() || !!duplicate || !!duplicateLead}>记下这次连接<ArrowRight size={15} /></button></div><small className="p-form-hint">仅在本机保存；名称精准查重为前端交互演示。</small></form>}
      {dialog.type === "followup" && <form className="p-form" onSubmit={addFollowup}><p className="p-form-intro">记结果，定下一步。时间线和待办会一起更新。</p><label>这次和谁聊？<select name="customer" defaultValue={dialog.id || ownedCustomers[0]?.id}>{ownedCustomers.map(c => <option key={c.id} value={c.id}>{c.short}</option>)}</select></label><label>聊出了什么？<textarea name="note" required placeholder="一句话就好，比如：客户认可初步方案，想进一步确认范围。" rows={4} /></label><div className="p-form-columns"><label>下一步做什么？<input name="next" required placeholder="比如：安排方案演示" /></label><label>什么时候？<input name="date" type="date" required defaultValue="2026-11-09" /></label></div><div className="p-modal-actions"><button type="button" className="p-btn" onClick={() => setDialog(null)}>取消</button><button className="p-btn dark">保存跟进<Check size={15} /></button></div></form>}
      {dialog.type === "support" && <form className="p-form" onSubmit={saveSupport}><p className="p-form-intro">客户与商机信息自动带入，你只需要说清楚需要什么支持。</p><label>关联商机<select name="opportunity" defaultValue={dialog.id || opportunities[0]?.id}>{opportunities.map(o => <option key={o.id} value={o.id}>{customer(o.customer)?.short} · {o.title}</option>)}</select></label><label>邀请哪个团队？<select name="team" defaultValue={dialog.team || "AI 解决方案"}>{resources.map(r => <option key={r.title}>{r.title}</option>)}</select></label><label>希望一起解决什么？<textarea name="need" required rows={4} placeholder="比如：客户想下周看知识库演示，需要协助确认方案与 POC 范围。" /></label><div className="p-form-callout"><Clock3 size={18} /><p>进入演示协同队列后，可在管理视角分配资源并查看响应。不发送任何真实通知。</p></div><div className="p-modal-actions"><button type="button" className="p-btn" onClick={() => setDialog(null)}>取消</button><button className="p-btn dark">发起协同<Handshake size={15} /></button></div></form>}
      {dialog.type === "customer" && activeCustomer && <><div className="p-customer-hero"><span className={`p-company-logo large ${activeCustomer.color}`}>{activeCustomer.short.slice(0, 1)}</span><div><h3>{activeCustomer.name}</h3><p>{activeCustomer.id} · {activeCustomer.industry} · 负责人 {activeCustomer.owner}</p><div className="p-tags"><Tag tone="blue">{activeCustomer.tier}</Tag><Tag tone="sage">{activeCustomer.health}</Tag></div></div></div><div className="p-drawer-actions"><button className="p-btn dark" onClick={() => open({ type: "followup", id: activeCustomer.id })}><MessageSquare size={14} />记一次跟进</button><button className="p-btn" onClick={() => open({ type: "collaboration", id: activeCustomer.id })}><Users size={14} />邀请协作</button></div><div className="p-tabs">{["经营概览", "业务关联", "连接时间线"].map(t => <button key={t} className={drawerTab === t ? "selected" : ""} onClick={() => setDrawerTab(t)}>{t}</button>)}</div>{drawerTab === "经营概览" && <><div className="p-detail-metrics"><div><span>已归集收入</span><b>¥{money(activeCustomer.revenue)}<small>万</small></b></div><div><span>已归集成本</span><b>¥{money(activeCustomer.cost)}<small>万</small></b></div><div><span>已归集毛利率</span><b>{activeCustomer.revenue ? ((activeCustomer.revenue - activeCustomer.cost) / activeCustomer.revenue * 100).toFixed(1) : "—"}<small>%</small></b></div></div><div className="p-detail-note">合成演示快照 · 2026 年累计 · 非完整财务核算口径</div><h3 className="p-subheading">业务合作矩阵</h3><div className="p-matrix">{["AI 解决方案", "资产管理软件", "基础运维", "HRO 人员服务"].map((b, i) => <div key={b}><span>{b}</span><Tag tone={serviceCoverage[activeCustomer.id]?.includes(b) ? "sage" : "neutral"}>{serviceCoverage[activeCustomer.id]?.includes(b) ? b === "HRO 人员服务" ? "已合作 · 待优化" : "已合作" : "可探索"}</Tag></div>)}</div><div className="p-form-callout"><CalendarDays size={19} /><div><b>{activeCustomer.days > 0 ? `最近合同距到期 ${activeCustomer.days} 天` : "新关系，从一次沟通开始"}</b><p>{activeCustomer.days <= 60 && activeCustomer.days > 0 ? "现在适合聊聊下一年的服务范围。" : "保持真实的业务沟通，让下一次合作自然发生。"}</p></div></div></>}{drawerTab === "业务关联" && <><h3 className="p-subheading">关联商机与 POC</h3>{data.opportunities.filter(o => o.customer === activeCustomer.id).map(o => <button className="p-linked-op" key={o.id} onClick={() => open({ type: "opportunity", id: o.id })}><div><b>{o.title}</b><small>{o.id} · {stages[o.stage]}{o.poc ? ` · POC 已投入 ${o.poc} 万` : ""}</small></div><span>¥{o.amount}万<ChevronRight size={14} /></span></button>)}<CustomerBusinessLinks customerId={activeCustomer.id} /></>}{drawerTab === "连接时间线" && <div className="p-detail-timeline">{data.events.filter(e => e.customer === activeCustomer.id).map(e => <article key={e.id}><span /><time>{e.time}</time><h4>{e.title}</h4><p>{e.detail}</p></article>)}{!data.events.some(e => e.customer === activeCustomer.id) && <Empty text="还没有业务事件，记下一次沟通就从这里开始。" />}</div>}</>}
      {dialog.type === "opportunity" && activeOpp && <><div className="p-between"><Tag tone="blue">{customer(activeOpp.customer)?.short}</Tag><b className="p-big-amount">¥{money(activeOpp.amount)}<small> 万</small></b></div><div className="p-op-stages">{stages.map((s, i) => <span key={s} className={i <= activeOpp.stage ? "reached" : ""}><i>{i < activeOpp.stage ? <Check size={11} /> : i + 1}</i>{s}</span>)}</div><div className="p-next-step"><span>下一步，已经很清楚</span><h3>{activeOpp.next}</h3><p><Clock3 size={13} />{activeOpp.date} · 负责人 林悦{activeOpp.stalled && <Tag tone="amber">停滞 12 天</Tag>}</p></div><form className="p-form" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); const stage = Number(f.get("stage")); const next = String(f.get("next")).trim(); const date = String(f.get("date")); setData(d => ({ ...d, opportunities: d.opportunities.map(o => o.id === activeOpp.id ? { ...o, stage, next, date, stalled: false } : o), events: [event(activeOpp.customer, `更新商机：${stages[activeOpp.stage]} → ${stages[stage]}`, `下一步：${next} · ${date}`), ...d.events] })); notify("商机进展已更新，时间线已自动记录"); }}><div className="p-form-columns"><label>业务推进阶段<select key={activeOpp.id + activeOpp.stage} name="stage" defaultValue={activeOpp.stage}>{stages.map((s, i) => <option key={s} value={i}>{s}</option>)}</select></label><label>下一次行动日期<input name="date" required type="date" defaultValue="2026-11-10" /></label></div><label>下一步动作<input name="next" required defaultValue={activeOpp.next} key={activeOpp.id + activeOpp.next} /></label><button className="p-btn dark full">保存这一步<Check size={14} /></button></form><div className="p-drawer-actions"><button className="p-btn" onClick={() => open({ type: "support", id: activeOpp.id })}><Handshake size={14} />请求售前支持</button><button className="p-btn" onClick={() => open({ type: "group", id: activeOpp.id })}><FileCheck2 size={14} />准备集团材料</button></div>{activeOpp.poc && <div className="p-poc-card"><div className="p-between"><b>POC 投入 · 可追溯</b><Tag tone="sage">额度内</Tag></div><strong>¥ {activeOpp.poc}<small> 万 / 预算 {activeOpp.id === "O-001" ? 10 : 4} 万</small></strong><progress max={activeOpp.id === "O-001" ? 10 : 4} value={activeOpp.poc} /><p>POC-{activeOpp.id} → 待关联正式交付项目<br />历史投入保留，签约后按项目关联归集。</p><button className="p-text-btn" onClick={() => { open({ type: "customer", id: activeOpp.customer }); setDrawerTab("业务关联"); }}>查看 POC 与项目关联<ArrowUpRight size={14} /></button></div>}<div className="p-separate-status"><span>集团审批状态</span><Tag tone="amber">{activeOpp.approval}</Tag><p>业务阶段更新不会自动改变审批结果或合同签署状态。</p></div></>}
      {(dialog.type === "signal" || dialog.type === "lead-detail") && <>{dialog.type === "signal" && activeSignal && <div className="p-signal-detail"><Tag tone={activeSignal.color}>{activeSignal.tag} · 候选机会</Tag><h3>{activeSignal.title}</h3><p>{activeSignal.evidence}</p><blockquote>“{activeSignal.question}”</blockquote><small>建议能力：{activeSignal.product} · {customer(activeSignal.customer)?.short}</small></div>}{dialog.type === "lead-detail" && activeLead && <div className="p-lead-detail"><h3>{activeLead.name}</h3><p>{activeLead.note || "先联系客户，了解真实需求。"}</p><Tag>{activeLead.source}</Tag><Tag tone="blue">{activeLead.status}</Tag></div>}{activeLead?.status === "已转化" ? <button className="p-btn dark full" onClick={() => { setDialog(null); go("pipeline"); }}>查看已转化商机<ArrowRight size={14} /></button> : activeLead?.status === "已关闭" ? <Empty text="线索已关闭，可以从新的客户连接开始。" /> : <><div className="p-soft-divider" /><form className="p-form" onSubmit={e => convertLead(e, dialog.id!, dialog.type === "signal")}><h3>聊过之后，再决定下一步</h3><label>确认后的需求 / 商机名称<input name="title" required placeholder="比如：多园区资产管理平台" /></label><div className="p-form-columns"><label>业务类型<select name="business"><option>项目制</option><option>基础运维</option><option>HRO</option></select></label><label>预计金额（万元）<input name="amount" type="number" min="0" step="0.1" required placeholder="待估算可填 0" /></label></div><label>下一步动作<input name="next" required placeholder="比如：安排一次场景访谈" /></label><label className="p-checkbox-label"><input type="checkbox" required />我已与客户沟通，确认存在真实需求</label><button className="p-btn dark full">确认需求，建立商机<ArrowRight size={14} /></button></form><button className="p-full-link" onClick={() => { if (activeLead) setData(d => ({ ...d, leads: d.leads.map(l => l.id === activeLead.id ? { ...l, status: "培育中" } : l) })); else if (activeSignal && !data.tasks.some(t => t.note === activeSignal.id)) setData(d => ({ ...d, tasks: [...d.tasks, { id: `T-${Date.now()}`, customer: activeSignal.customer, title: `验证需求：${activeSignal.title}`, note: activeSignal.id, time: "待安排", kind: "机会验证", priority: "计划跟进", done: false }] })); setDialog(null); notify(activeLead ? "已加入培育，等合适的时机再聊" : "已加入待办，先联系客户验证需求"); }}>暂不明确，先加入培育<Clock3 size={13} /></button></>}</>}
      {dialog.type === "group" && activeOpp && <><p className="p-form-intro">已有信息自动复用，正式审批留在集团系统。</p><div className="p-matrix"><div><span>客户主体</span><b>{customer(activeOpp.customer)?.name}</b></div><div><span>商机编码</span><b>{activeOpp.id}</b></div><div><span>业务类型</span><b>{activeOpp.business}</b></div><div><span>预计金额</span><b>¥{activeOpp.amount} 万</b></div><div><span>业务阶段</span><Tag tone="blue">{stages[activeOpp.stage]}</Tag></div><div><span>审批状态</span><Tag tone="amber">{activeOpp.approval}</Tag></div></div><div className="p-material-checks"><h3>正式申请前，还需要准备</h3><p><Flag size={14} />确认报价毛利与成本测算</p><p><Flag size={14} />核对账期、非标条款与客户准入</p><p><Flag size={14} />补齐报价文件与签约主体材料</p></div><div className="p-form-callout"><ShieldCheck size={19} /><p>此处展示材料准备流程，不发起真实审批。集团审批、合同签署和内部业务阶段分别记录。</p></div><button className="p-btn dark full" onClick={() => { setData(d => ({ ...d, opportunities: d.opportunities.map(o => o.id === activeOpp.id ? { ...o, approval: o.approval === "集团审批中" ? o.approval : "材料准备" } : o), events: [event(activeOpp.customer, "整理了集团流程材料草稿", `${activeOpp.title} · 材料尚待补齐，未发起审批`), ...d.events] })); setDialog(null); notify("材料草稿已记录，正式申请仍需在集团系统完成"); }}>记录材料准备进展<BookOpen size={14} /></button></>}
      {dialog.type === "collaboration" && <form className="p-form" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); setData(d => ({ ...d, supports: [{ id: `S-${Date.now()}`, opportunity: "客户负责关系", team: `DIG 内部协作 · ${activeCustomer?.owner}`, need: `${activeCustomer?.name}：${String(f.get("reason"))}`, status: "待响应" }, ...d.supports] })); setDialog(null); notify("演示协作申请已记录，等待负责人确认授权范围"); }}><div className="p-form-callout"><Users size={20} /><div><b>{activeCustomer?.name}</b><p>负责人：{activeCustomer?.owner} · 申请前仅展示必要的负责关系。</p></div></div><label>希望怎样一起推进？<textarea name="reason" required rows={4} placeholder="介绍你的业务切入点和希望的协作方式" /></label><label>申请协作范围<select><option>联合拜访与需求沟通</option><option>指定商机协作</option><option>售前方案协作</option></select></label><p className="p-form-hint">负责人确认后再授权具体信息，不自动开放联系人或历史记录。此处仅演示申请交互。</p><button className="p-btn dark full">提交协作申请<ArrowRight size={14} /></button></form>}
      {dialog.type === "ignore" && <form className="p-form" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); setData(d => ({ ...d, dismissed: [...d.dismissed, dialog.id!], events: [event(activeSignal?.customer || "", "暂不采纳机会建议", `${activeSignal?.title} · 原因：${String(f.get("reason"))}`), ...d.events] })); setDialog(null); notify("反馈已记录，这条推荐将从雷达中移除"); }}><p className="p-form-intro">你的判断，可以让机会建议更有用。</p><label>原因<select name="reason"><option>客户目前没有这类需求</option><option>时机还不合适</option><option>已经有其他方案</option><option>推荐依据不充分</option></select></label><button className="p-btn dark full">记录反馈</button></form>}
      {dialog.type === "notifications" && <div className="p-notification-list">{pending.map(t => <button key={t.id} onClick={() => open({ type: "followup", id: t.customer })}><Clock3 size={17} /><div><b>{t.title}</b><p>{t.note}</p></div><ChevronRight size={14} /></button>)}{!pending.length && <Empty text="待办都处理好了，下一次连接已经准备就绪。" />}</div>}
      {dialog.type === "help" && <div className="p-help-content"><div className="p-help-logo"><Layers3 size={30} />DIG / 客户增长</div><h3>让销售更容易成交，<br />让管理更容易解决问题。</h3><p>这是一份基于六个 DIG 业务故事的交互原型。所有企业、人物、金额、推荐和进展均为合成演示数据，没有连接飞书、集团系统或后台服务。</p><ol><li>记一个线索：名称精准查重，少填一点。</li><li>验证需求：候选机会与有效商机分开。</li><li>推进商机：更新下一步，邀请售前支持。</li><li>经营客户：查看合作矩阵与事件时间线。</li><li>团队经营：发现卡点，协调资源。</li></ol><div className="p-form-callout"><ShieldCheck size={18} /><p>角色切换只用于演示界面，不代表真实权限控制。所有操作仅保存在当前浏览器，清除浏览器数据会丢失。</p></div><button className="p-btn full" onClick={() => open({ type: "reset" })}>重置演示数据</button></div>}
      {dialog.type === "reset" && <div className="p-form"><p className="p-form-intro">恢复后，本浏览器中新增的演示线索、跟进、商机和协同操作将被初始示例替换。</p><button className="p-btn dark full" onClick={() => { setData(seed); try { localStorage.removeItem(WIRE_STORAGE_KEY); localStorage.removeItem(BUSINESS_LINKS_KEY); } catch {} setDialog(null); go("today"); notify("已恢复初始演示数据"); }}>确认恢复演示数据</button><button className="p-btn full" onClick={() => open({ type: "help" })}>保留当前体验记录</button></div>}
    </div></div></div>}
  </div>;
}
