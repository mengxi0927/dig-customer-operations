"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Building2,
  ChevronRight,
  Layers3,
  LayoutDashboard,
  Plus,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  RefreshCw,
} from "lucide-react";
import {
  assessAdmission,
  capabilities,
  matchSignal,
  signalKey,
  type Signal,
  type Candidate,
} from "@/lib/growth-engine";
import type { DigAccount, DigOpportunity, DigOverview } from "@/lib/dig-types";
import "./workbench.css";
import CustomerAssets from "./customer-assets";
import CustomerProfile from "./customer-profile";
import OpportunityGrowth from "./opportunity-growth";
import { demoAdmissionResult, CUSTOMER_CREATE_FORM } from "@/lib/admission-demo";
type View = "overview" | "admission" | "radar" | "customers";
type Action = {
  id: string;
  customer: string;
  title: string;
  owner: string;
  due: string;
  status: string;
  note: string;
  source: string;
  opportunityId: string;
};
const demoCustomers: DigAccount[] = [
  {
    id: "d1",
    name: "星洲文旅有限公司",
    number: "DEMO-001",
    applicant: "林悦",
    department: "行业客户部",
    industry: "文旅",
    city: "上海",
    level: "",
    opportunityCount: 1,
  },
  {
    id: "d2",
    name: "澄川科技有限公司",
    number: "DEMO-002",
    applicant: "陈远",
    department: "企业客户部",
    industry: "科技",
    city: "北京",
    level: "",
    opportunityCount: 1,
  },
  {
    id: "d3",
    name: "云岚制造有限公司",
    number: "DEMO-003",
    applicant: "王宁",
    department: "制造行业部",
    industry: "制造",
    city: "苏州",
    level: "",
    opportunityCount: 0,
  },
];
const demoOpps: DigOpportunity[] = [
  {
    id: "do1",
    number: "DEMO-S01",
    name: "历史基础设施合作",
    customerIds: ["d1"],
    customerName: demoCustomers[0].name,
    owner: "林悦",
    units: [],
    status: "已签约",
    stage: "签约交付",
    expectedAmount: 1200000,
    actualAmount: 1200000,
    expectedDate: null,
    actualDate: "2026-05-10",
    updatedAt: null,
    sourceUrl: "",
  },
  {
    id: "do2",
    number: "DEMO-S02",
    name: "服务器维保",
    customerIds: ["d2"],
    customerName: demoCustomers[1].name,
    owner: "陈远",
    units: [],
    status: "已立项",
    stage: "需求确认",
    expectedAmount: 320000,
    actualAmount: null,
    expectedDate: "2026-12-20",
    actualDate: null,
    updatedAt: null,
    sourceUrl: "",
  },
];
const demoSignals: Signal[] = [
  {
    id: "ds1",
    customer: demoCustomers[0].name,
    title: "数据治理与统一指标体系建设",
    text: "拟整合各业务系统数据，建设统一指标与主数据管理能力，解决数据孤岛问题。",
    url: "",
    published: "2026-11-08",
    deadline: "2026-12-01",
    kind: "采购意向",
  },
  {
    id: "ds2",
    customer: demoCustomers[1].name,
    title: "数据中心资产盘点及运维管理",
    text: "对机房固定资产进行RFID盘点，建立机柜资产管理与维修记录。",
    url: "",
    published: "2026-11-07",
    deadline: "2026-11-25",
    kind: "招标公告",
  },
  {
    id: "ds3",
    customer: demoCustomers[2].name,
    title: "探索设备效率与质量分析场景",
    text: "公开动态提出提升OEE和工艺异常分析能力，尚未公布采购计划。",
    url: "",
    published: "2026-11-06",
    deadline: "",
    kind: "公开动态",
  },
];
const nav = [
  { id: "overview", label: "客户资产总览", icon: LayoutDashboard },
  { id: "admission", label: "新客户准入", icon: ShieldCheck },
  { id: "radar", label: "老客户机会增长", icon: Radar },
  { id: "customers", label: "客户价值分层", icon: Building2 },
] as const;
const money = (n: number) =>
  `${(n / 10000).toLocaleString("zh-CN", { maximumFractionDigits: 1 })} 万`;
const localDate = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(
    new Date(),
  );
const newSignal = (): Signal => ({
  id: "",
  customer: "",
  title: "",
  text: "",
  url: "",
  published: localDate(),
  deadline: "",
  kind: "采购意向",
});
async function read(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  const d = await r.json();
  if (!r.ok) throw Error(d.message || "读取失败");
  return d;
}
export default function GrowthWorkbench() {
  const [view, setView] = useState<View>("overview"),
    [demo, setDemo] = useState(false),
    [data, setData] = useState<DigOverview | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [group, setGroup] = useState(-1);
  const [signals, setSignals] = useState<Signal[]>([]),
    [imported, setImported] = useState<Signal[]>([]),
    [actions, setActions] = useState<Action[]>([]),
    [hidden, setHidden] = useState<Record<string, string>>({}),
    [ready, setReady] = useState(false),
    [feed, setFeed] = useState("正在检查订阅连接");
  const [selected, setSelected] = useState<Candidate | null>(null),
    [customer, setCustomer] = useState<DigAccount | null>(null),
    [importOpen, setImportOpen] = useState(false),
    [draft, setDraft] = useState<Signal>(newSignal),
    [toast, setToast] = useState(""),
    [discardReason, setDiscardReason] = useState("暂不符合经营方向");
  const [company, setCompany] = useState(""),
    [scenario, setScenario] = useState("normal"),
    [checking, setChecking] = useState(false),
    [admission, setAdmission] = useState<
      | (ReturnType<typeof assessAdmission> & {
          source?: string;
          checkedAt?: string;
          notice?: string;
          errors?: string[];
          demoCase?: string;
          owner?: string;
          existingCustomers?: DigAccount[];
          dimensions?: readonly (readonly [string, number, number])[];
        })
      | null
    >(null);
  const [approvalStage, setApprovalStage] = useState<"" | "draft" | "submitted">("");
  const [approvalNote, setApprovalNote] = useState("");
  const [accessTarget, setAccessTarget] = useState<DigAccount | null>(null);
  const [accessReason, setAccessReason] = useState("");
  const [accessSaved, setAccessSaved] = useState(false);
  function requestCustomerAccess(target: DigAccount) {
    setAccessTarget(target);
    setAccessReason("");
    setAccessSaved(false);
    try {
      const saved = JSON.parse(localStorage.getItem(`dig-customer-access:${target.id}`) || "null");
      if (saved?.status === "pending") { setAccessReason(saved.reason); setAccessSaved(true); }
    } catch { /* A new application can still be filled out if storage is unavailable. */ }
  }
  async function refresh() {
    setBusy(true);
    setError("");
    const results = await Promise.allSettled([
      read("/api/dig/overview"),
      read("/api/dig/signals"),
    ]);
    if (results[0].status === "fulfilled") setData(results[0].value);
    else setError(results[0].reason.message);
    if (results[1].status === "fulfilled") {
      setSignals(results[1].value.signals);
      setFeed(
        results[1].value.configured
          ? `已连接订阅 · ${results[1].value.signals.length}条`
          : "自动订阅未配置 · 可导入公告",
      );
    } else setFeed(results[1].reason.message);
    setBusy(false);
  }
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 300000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setReady(false);
    try {
      const saved = JSON.parse(
        localStorage.getItem(`dig-growth-v2-${demo ? "demo" : "live"}`) || "{}",
      );
      setActions(Array.isArray(saved.actions) ? saved.actions : []);
      setImported(Array.isArray(saved.imported) ? saved.imported : []);
      setHidden(
        saved.hidden && typeof saved.hidden === "object" ? saved.hidden : {},
      );
    } catch {
      setActions([]);
      setImported([]);
      setHidden({});
    }
    setReady(true);
    setAdmission(null);
    setSelected(null);
    setCustomer(null);
    setQuery("");
    setGroup(-1);
  }, [demo]);
  useEffect(() => {
    if (ready)
      localStorage.setItem(
        `dig-growth-v2-${demo ? "demo" : "live"}`,
        JSON.stringify({ actions, imported, hidden }),
      );
  }, [ready, actions, imported, hidden, demo]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setCustomer(null);
        setImportOpen(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  useEffect(() => {
    if (!selected && !customer && !importOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".g-drawer button,.g-drawer input,.g-drawer textarea,.g-drawer select,.g-drawer a[href]",
        ),
      ).filter((n) => !n.hasAttribute("disabled"));
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", trap);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, [selected, customer, importOpen]);
  const customers = demo ? demoCustomers : data?.customers || [],
    opps = demo ? demoOpps : data?.opportunities || [];
  const candidates = useMemo(() => {
    const seen = new Set<string>();
    return [...(demo ? demoSignals : signals), ...imported]
      .filter((s) => {
        const k = signalKey(s) || s.id;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map((s) => matchSignal(s));
  }, [demo, signals, imported]);
  const related = (c: DigAccount) =>
    opps.filter((o) => o.customerIds.includes(c.id));
  const stats = (c: DigAccount) => {
    const os = related(c);
    return {
      history: os.reduce((s, o) => s + Math.max(0, o.actualAmount || 0), 0),
      active: os.filter(
        (o) =>
          !o.actualDate &&
          !/关闭|终止|签约|成交|丢单/.test(o.status) &&
          !/签约|交付/.test(o.stage),
      ),
    };
  };
  const values = customers
      .map((c) => stats(c).history)
      .filter((n) => n > 0)
      .sort((a, b) => a - b),
    threshold = values.length ? values[Math.floor(values.length / 2)] : 0;
  const bucket = (c: DigAccount) => {
    const s = stats(c);
    return (
      (s.history > 0 && s.history >= threshold ? 1 : 0) +
      (s.active.length ? 0 : 2)
    );
  };
  const groupNames = ["机会突破", "重点经营", "分层培育", "挖掘新需求"];
  const list = candidates.filter(
    (s) =>
      !hidden[s.id] &&
      (!query || [s.customer, s.title, s.text].some((v) => v.includes(query))),
  );
  function go(v: View) {
    setView(v);
    setQuery("");
    setGroup(-1);
  }
  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (checking) return;
    const startedAt = Date.now();
    setChecking(true);
    setAdmission(null);
    setApprovalStage("");
    setAccessTarget(null);
    try {
      if (!demo) {
        const response = await fetch("/api/dig/admission", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: company, lookupOnly: true }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "客户查重失败，请重试");
        if (result.demoCase === "existing") { setAdmission(result); return; }
      }
      const fixture = demoAdmissionResult(company);
      if (fixture) {
        setAdmission(fixture);
      } else if (demo) {
        const f = {
          name: company || "示例企业",
          creditCode: "演示主体编号",
          status: scenario === "blocked" ? "注销" : "存续",
          small: scenario === "small" ? "是" : "否",
          complete: scenario !== "missing",
          fresh: true,
          risks:
            scenario === "risk" ? ["命中经营异常示例，需核实处置状态"] : [],
        };
        setAdmission({
          ...assessAdmission(f, true),
          source: "合成演示数据 · 示例规则",
          notice: "演示结果不会创建真实客户或提交审批。",
        });
      } else {
        const r = await fetch("/api/dig/admission", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: company }),
        });
        const d = await r.json();
        if (!r.ok) throw Error(d.message);
        setAdmission(d);
      }
    } catch (e) {
      setToast(e instanceof Error ? e.message : "核查失败");
    } finally {
      await new Promise(resolve => setTimeout(resolve, Math.max(0, 2500 - (Date.now() - startedAt))));
      setChecking(false);
    }
  }
  function addSignal(e: React.FormEvent) {
    e.preventDefault();
    if (!/^https?:\/\//.test(draft.url)) {
      setToast("请输入有效的公开来源 HTTP / HTTPS 链接");
      return;
    }
    if (draft.deadline && draft.deadline < draft.published) {
      setToast("截止时间不能早于发布日期");
      return;
    }
    if (
      [...signals, ...imported].some((s) => signalKey(s) === signalKey(draft))
    ) {
      setToast("该客户的同一来源已存在，请先核实是否为更正公告");
      return;
    }
    setImported((s) => [
      ...s,
      {
        ...draft,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      },
    ]);
    setImportOpen(false);
    setDraft(newSignal());
    setToast("公告已导入并完成规则匹配，需求仍需验证");
    go("radar");
  }
  const opportunityTable = (c: DigAccount) => (
    <div className="g-history">
      {related(c).length ? (
        related(c).map((o) => (
          <article key={o.id}>
            <b>{o.name}</b>
            <span>
              {o.status} · 实际成单{" "}
              {o.actualAmount === null ? "未填写" : money(o.actualAmount)}
            </span>
            {o.sourceUrl && (
              <a href={o.sourceUrl} target="_blank" rel="noreferrer">
                打开飞书记录 ↗
              </a>
            )}
          </article>
        ))
      ) : (
        <p>未发现已关联商机，需核实历史数据完整性。</p>
      )}
    </div>
  );
  function RadarList() {
    return (
      <div className="g-opportunities">
        {list.map((s) => (
          <button
            className="g-opportunity"
            key={s.id}
            onClick={() => setSelected(s)}
          >
            <div className={`g-signal-icon ${s.matches[0]?.id || ""}`}>
              <Radar size={22} />
            </div>
            <div>
              <div className="g-line">
                <span className="g-tag">{s.kind}</span>
                <span className="g-sub">{s.published}</span>
                {demo && <span className="g-sub">合成示例</span>}
              </div>
              <h3>{s.title}</h3>
              <p>{s.customer}</p>
              <div className="g-line">
                {s.matches.map((c) => (
                  <span key={c.id} className="g-tag soft">
                    {c.family}
                  </span>
                ))}
              </div>
            </div>
            <div className="g-op-end">
              <span
                className={`g-tag ${s.priority === "优先验证" ? "green" : "amber"}`}
              >
                {s.priority}
              </span>
              <small>查看证据与建议</small>
              <ArrowUpRight size={19} />
            </div>
          </button>
        ))}
        {!list.length && (
          <div className="g-empty">
            <Radar size={32} />
            <h3>等待下一条有依据的机会</h3>
            <p>
              {query
                ? "没有匹配结果，请调整搜索。"
                : "导入客户公开公告，系统会匹配能力目录并生成候选。"}
            </p>
            <button className="g-btn" onClick={() => setImportOpen(true)}>
              导入公开需求
            </button>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="growth-app">
      <aside className="g-sidebar">
        <div className="g-brand">
          <Layers3 size={30} />
          <div>
            DIG <small>客户智能经营</small>
          </div>
        </div>
        <div className="g-workspace">
          <span className="g-dot" />
          客户增长工作空间<small>从准入到下一次合作</small>
        </div>
        <p className="g-nav-label">客户经营</p>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={view === n.id ? "active" : ""}
              onClick={() => go(n.id)}
            >
              <n.icon size={18} />
              {n.label}
              
            </button>
          ))}
        </nav>
        <div className="g-sidebar-bottom">
          <a href="https://dcholdings.feishu.cn/app/NMZEbyNx5a0Fews9qHWctsNVn9g?pageId=pgentnD0whSh1vQB" target="_blank" rel="noopener noreferrer">
            <Building2 size={17} />
            DIG端到端系统 <ArrowUpRight size={14} />
          </a>
          <div>
            <span className="g-dot" />
            {demo ? "演示工作空间" : "真实数据工作空间"}
            <small>{demo ? "与真实记录隔离" : "客户与商机只读接入"}</small>
          </div>
        </div>
      </aside>
      <div className="g-body">
        <header className="g-top">
          <span>
            客户经营 <ChevronRight size={14} />{" "}
            {nav.find((n) => n.id === view)?.label}
          </span>
          <div>
            <button
              className="g-icon-btn"
              aria-label="刷新数据"
              disabled={busy}
              onClick={() => void refresh()}
            >
              <RefreshCw size={17} />
            </button>
            <span className="g-avatar">DIG</span>
          </div>
        </header>
        <main className="g-main">
          <div className="g-heading">
            <div>
              <p className="g-eyebrow">
                CUSTOMER INTELLIGENCE / {demo ? "DEMO" : "CONNECTED"}
              </p>
              <h1>{nav.find((n) => n.id === view)?.label}</h1>
              <p>
                {
                  {
                    overview:
                      "盘点现有客户规模、结构与区域覆盖，查看各地销售员和客户。",
                    admission:
                      "自动完成信息核查，让专业判断集中在需要关注的例外。",
                    radar:
                      "从已成单标杆找到切入点，把合作延伸、机会重启与客户动态变成具体跟进。",
                    customers:
                      "看清历史合作与当前机会，为不同客户选择合适的经营动作。",
                  }[view]
                }
              </p>
            </div>
            <button
              className="g-btn primary"
              onClick={() => {
                if (view === "admission")
                  document.getElementById("company-name")?.focus();
                else if (view === "overview") go("customers");
                else if (view === "radar") {
                  const search = document.querySelector<HTMLInputElement>('[aria-label="搜索增长机会"]');
                  search?.scrollIntoView({ behavior: "smooth", block: "center" });
                  search?.focus({ preventScroll: true });
                }
                else setImportOpen(true);
              }}
            >
              {view === "radar" ? <Search size={16} /> : <Plus size={16} />}
              {view === "admission"
                ? "开始客户核查"
                : view === "overview"
                  ? "查看客户名单"
                  : view === "radar" ? "搜索客户与商机" : "导入公开需求"}
            </button>
          </div>
          {view !== "admission" && <div className={`g-banner ${demo ? "demo" : ""}`}>
            <ShieldCheck size={16} />
            {demo
              ? "评选演示模式：企业、公告与核查结果均为合成示例；操作仅保存在本浏览器。"
              : view === "overview"
                ? "客户与商机来自飞书，按客户记录统计；地区依据客户城市归属，缺失信息单独列示。"
                : "真实客户来自飞书；增长建议关联现有商机与标杆案例，跟进记录保存在本浏览器。"}
            {!demo && <a href="/data">查看源数据 ↗</a>}
          </div>}
          {view === "customers" && (
            <>
              <div className="g-metrics">
                {[
                  {
                    label: "客户资产",
                    value: !demo && !data ? "—" : customers.length,
                    sub: demo ? "合成客户档案" : "飞书客户主表",
                    icon: Building2,
                  },
                  {
                    label: "待验证需求",
                    value: list.filter((s) => s.priority === "优先验证").length,
                    sub: "公开信号不计入有效商机",
                    icon: Radar,
                  },
                  {
                    label: "需求覆盖客户",
                    value: new Set(candidates.map((s) => s.customer)).size,
                    sub: "公开需求涉及的客户主体",
                    icon: Building2,
                  },
                  {
                    label: "可匹配能力",
                    value: capabilities.length,
                    sub: "产品、服务与场景能力",
                    icon: Layers3,
                  },
                ].map((m) => (
                  <article key={m.label}>
                    <div>
                      <span>{m.label}</span>
                      <m.icon size={18} />
                    </div>
                    <strong>{m.value}</strong>
                    <small>{m.sub}</small>
                  </article>
                ))}
              </div>
              <div className="g-two-col">
                <section className="g-card">
                  <div className="g-card-heading">
                    <div>
                      <h2>客户价值与机会</h2>
                      <p>按历史成单贡献与当前未关闭、未签约机会分层</p>
                    </div>
                    <span className="g-tag">可点击查看名单</span>
                  </div>
                  <div className="g-matrix-wrap">
                    <div className="g-axis-y">当前已识别机会 ↑</div>
                    <div className="g-matrix">
                      {groupNames.map((name, i) => (
                        <button
                          key={name}
                          className={`cell-${i} ${group === i ? "selected" : ""}`}
                          onClick={() => {
                            setGroup(group === i ? -1 : i);
                            setView("customers");
                          }}
                        >
                          <span>
                            {name} <ArrowUpRight size={14} />
                          </span>
                          <strong>
                            {customers.filter((c) => bucket(c) === i).length}
                            <small> 家</small>
                          </strong>
                          <p>
                            {
                              [
                                "验证需求，推进首单",
                                "持续投入，协调资源",
                                "补充信息，按需触达",
                                "回访老客户，发现下一单",
                              ][i]
                            }
                          </p>
                        </button>
                      ))}
                    </div>
                    <div className="g-axis-x">历史实际成单贡献 →</div>
                  </div>
                  <p className="g-footnote">
                    高贡献：正成单金额中位数 {money(threshold)}{" "}
                    及以上；无历史金额不等于低价值。当前机会按源阶段与状态规则识别，财务收入与增长潜力待核实。
                  </p>
                </section>
                <section className="g-card g-focus">
                  <div className="g-card-heading">
                    <div>
                      <h2>两条主线，一次持续经营</h2>
                      <p>从客户进入，到下一次需求被发现</p>
                    </div>
                  </div>
                  <button onClick={() => go("admission")}>
                    <div className="g-step-icon">
                      <ShieldCheck size={23} />
                    </div>
                    <div>
                      <small>01 / 新客户准入</small>
                      <h3>把标准核查自动完成</h3>
                      <p>主体识别 · 风险依据 · 规则分流</p>
                    </div>
                    <ArrowRight size={18} />
                  </button>
                  <button onClick={() => go("radar")}>
                    <div className="g-step-icon purple">
                      <Radar size={23} />
                    </div>
                    <div>
                      <small>02 / 老客户二次增长</small>
                      <h3>让下一次合作有迹可循</h3>
                      <p>公开需求 · 能力匹配 · 行动闭环</p>
                    </div>
                    <ArrowRight size={18} />
                  </button>
                  <div className="g-feed">
                    <span className="g-dot" />
                    {demo ? "演示信号已载入" : feed}
                  </div>
                </section>
              </div>
            </>
          )}
          {view === "overview" && (
            <CustomerAssets
              customers={customers}
              opportunities={opps}
              onCustomer={setCustomer}
              loading={!demo && busy && !data}
            />
          )}
          {view === "radar" && <OpportunityGrowth customers={customers} opportunities={opps} signals={candidates} onCustomer={setCustomer} demo={demo}/>}
          {view === "admission" && (
            <div className="g-two-col">
              <section className="g-card g-form-card">
                <div className="g-card-heading">
                  <div>
                    <h2>新客户核查</h2>
                    <p>一次提交，汇集主体与风险证据</p>
                  </div>
                  <ShieldCheck size={22} />
                </div>
                <form onSubmit={check}>
                  <label>
                    企业完整名称
                    <input
                      id="company-name"
                      disabled={checking}
                      required
                      maxLength={200}
                      placeholder="请输入工商登记的完整企业名称"
                      value={company}
                      onChange={(e) => {setCompany(e.target.value);setAdmission(null);setApprovalStage("");setAccessTarget(null);}}
                    />
                  </label>
                  {demo && (
                    <label>
                      演示核查场景
                      <select
                        value={scenario}
                        onChange={(e) => setScenario(e.target.value)}
                      >
                        <option value="normal">资料完整 · 无命中项</option>
                        <option value="small">小微企业 · 无命中项</option>
                        <option value="risk">命中风险 · 人工复核</option>
                        <option value="missing">必查信息不完整</option>
                        <option value="blocked">主体注销 · 停止自动准入</option>
                      </select>
                    </label>
                  )}
                  <div className="g-process">
                    {["确认主体", "获取信息", "规则校验", "输出建议"].map(
                      (s, i) => (
                        <span key={s}>
                          <b>{i + 1}</b>
                          {s}
                        </span>
                      ),
                    )}
                  </div>
                  <button className="g-btn primary" disabled={checking}>
                    {checking
                      ? "正在核查…"
                      : demo
                        ? "运行示例核查"
                        : "提交客户核查"}
                    <ArrowRight size={16} />
                  </button>
                </form>
              </section>
              <section className="g-card g-result">
                <div className="g-card-heading">
                  <div>
                    <h2>准入核查结果</h2>
                    <p>{checking ? "正在整理核查结果" : admission?.source || "等待提交客户信息"}</p>
                  </div>
                </div>
                {checking ? (
                  <div className="g-admission-loading" role="status" aria-live="polite">
                    <RefreshCw size={38} className="g-admission-spinner" aria-hidden="true" />
                    <h3>正在准备准入核查结果</h3>
                    <p>汇集主体资料与风险依据，请稍候…</p>
                    <div className="g-admission-loading-track" aria-hidden="true"><span /></div>
                  </div>
                ) : admission ? (
                  <>
                    <div
                      className={`g-result-score ${admission.decision === "规则校验通过" || admission.demoCase === "pass" ? "good" : ""}`}
                    >
                      {admission.demoCase !== "existing" && <strong>
                        {admission.score ?? "—"}
                        <small>
                          {admission.score === null ? "待核实" : " / 100"}
                        </small>
                      </strong>}
                      <h2>{admission.decision}</h2>
                    </div>
                    <div className="g-result-content">
                      <p>企业：{admission.facts.name}</p>
                      {admission.demoCase !== "existing" && <><p>
                        登记状态：{admission.facts.status}
                        {admission.small && ` · 小微企业：${admission.small}`}
                      </p>
                      <p>主体编号：{admission.facts.creditCode || "待核实"}</p></>}
                      {admission.reasons.map((r) => (
                        <div className="g-reason" key={r}>
                          <ShieldCheck size={16} />
                          {r}
                        </div>
                      ))}
                      {admission.demoCase === "existing" && <div className="g-existing-owner"><Building2 size={17} /> 当前负责人：<strong>{admission.owner || "待确认（暂无关联销售员）"}</strong><small>归属来自关联商机销售员</small></div>}
                      {admission.dimensions && <div className="g-demo-dimensions">{admission.dimensions.map(([label, score, max]) => <div key={label}><span>{label}</span><b>{score} / {max}</b></div>)}</div>}
                      {admission.demoCase === "existing" && <div className="g-admission-result-actions">{admission.existingCustomers?.map(c => <button key={c.id} className="g-btn" onClick={() => requestCustomerAccess(c)}>申请查看客户档案{admission.existingCustomers!.length > 1 ? `（${c.number || c.id}）` : ""} <ArrowUpRight size={14} /></button>)}</div>}
                      {admission.demoCase === "existing" && accessTarget && <div className="g-demo-approval">
                        {accessSaved ? <div className="g-demo-approval-success" role="status"><h3>查看申请已暂存 · 待审批</h3><p>客户：{accessTarget.name}</p><p>申请理由：{accessReason}</p><p>审批通过后方可查看客户档案。</p><small>申请仅保存在本浏览器，尚未发送负责人；审批服务接入后可正式提交。</small></div> :
                          <form onSubmit={e => {
                            e.preventDefault();
                            const reason = accessReason.trim();
                            if (!reason) { setToast("请填写查看理由"); return; }
                            try {
                              localStorage.setItem(`dig-customer-access:${accessTarget.id}`, JSON.stringify({customerId:accessTarget.id,customerName:accessTarget.name,owner:admission.owner || "",reason,status:"pending",createdAt:new Date().toISOString()}));
                              setAccessReason(reason); setAccessSaved(true);
                            } catch { setToast("申请未保存，请检查浏览器存储后重试"); }
                          }}>
                            <h3>申请查看客户档案</h3><p>客户：{accessTarget.name}</p><p>负责人：{admission.owner || "待确认"}</p>
                            <label>查看理由<textarea required maxLength={1000} value={accessReason} onChange={e => setAccessReason(e.target.value)} placeholder="请说明业务合作背景及查看用途" /></label>
                            <p className="g-footnote">审批通过后方可查看。当前申请暂存本浏览器，尚未发送负责人。</p>
                            <button className="g-btn primary" disabled={!accessReason.trim()}>保存查看申请</button><button type="button" className="g-btn" onClick={() => setAccessTarget(null)}>取消</button>
                          </form>}
                      </div>}
                      {admission.demoCase === "pass" && <div className="g-admission-result-actions"><a className="g-btn primary" href={CUSTOMER_CREATE_FORM} target="_blank" rel="noreferrer">开始填写新客户 <ArrowUpRight size={16} /></a><small>打开飞书建档表单，请在表单填写客户名称。</small></div>}
                      {admission.demoCase === "risk" && <div className="g-demo-approval">
                        {!approvalStage && <div className="g-admission-result-actions"><button className="g-btn primary" onClick={() => {setApprovalStage("draft");setApprovalNote("拟开展数据治理项目合作，请法务与合规复核风险处置情况及合作条件。");}}>发起审批 <ArrowRight size={16} /></button></div>}
                        {approvalStage === "draft" && <form onSubmit={e => {e.preventDefault();const record={id:"DEMO-APPROVAL-001",name:admission.facts.name,score:admission.score,note:approvalNote,status:"待人工审批（模拟）",createdAt:new Date().toISOString()};try{localStorage.setItem("dig-admission-demo-approval",JSON.stringify(record));}catch{}setApprovalStage("submitted");}}>
                          <h3>客户准入例外审批 · 演示</h3><p>{admission.facts.name} · 准入分 {admission.score}</p><p>审批流程：销售提交 → 法务复核 → 合规审批（模拟）</p>
                          <label>申请说明<textarea required value={approvalNote} onChange={e=>setApprovalNote(e.target.value)} /></label>
                          <button className="g-btn primary">提交演示审批</button><button type="button" className="g-btn" onClick={()=>setApprovalStage("")}>取消</button>
                        </form>}
                        {approvalStage === "submitted" && <div role="status" className="g-demo-approval-success"><h3>演示审批已发起</h3><p>DEMO-APPROVAL-001 · 待人工审批（模拟）</p><p>下一节点：法务复核 → 合规审批</p><small>仅保存在本浏览器，未发送真实飞书审批。</small><button className="g-text" onClick={()=>setApprovalStage("draft")}>查看申请内容</button></div>}
                      </div>}
                      {admission.errors?.map((e) => (
                        <p role="alert" key={e}>
                          {e}
                        </p>
                      ))}
                      <p className="g-footnote">
                        {admission.notice} · 规则版本 {admission.ruleVersion}
                        {admission.checkedAt &&
                          ` · ${new Date(admission.checkedAt).toLocaleString("zh-CN")}`}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="g-empty">
                    <ShieldCheck size={40} />
                    <h3>结论与依据，一起呈现</h3>
                    <p>信息缺失时保留“未知”，不把未发现风险视为无风险。</p>
                  </div>
                )}
              </section>
            </div>
          )}
          {view === "customers" && (
            <section className="g-card">
              <div className="g-card-heading">
                <div>
                  <h2>{group < 0 ? "客户经营名单" : groupNames[group]}</h2>
                  <p>
                    客户可能同时有多个项目与商机，不用单一阶段代替客户生命周期。
                  </p>
                </div>
                <label className="g-search">
                  <Search size={16} />
                  <input
                    aria-label="搜索客户"
                    placeholder="搜索客户名称"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </div>
              <div className="g-table-scroll">
                <table className="g-table">
                  <thead>
                    <tr>
                      <th>客户 / 行业</th>
                      <th>历史成单贡献</th>
                      <th>当前机会</th>
                      <th>公开需求信号</th>
                      <th>经营方向</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {customers
                      .filter(
                        (c) =>
                          (group < 0 || bucket(c) === group) &&
                          c.name.includes(query),
                      )
                      .map((c) => (
                        <tr key={c.id}>
                          <td>
                            <b>{c.name}</b>
                            <small>
                              {c.industry || "行业待补充"} ·{" "}
                              {c.applicant || "负责人待核实"}
                            </small>
                          </td>
                          <td>
                            {stats(c).history
                              ? money(stats(c).history)
                              : "未发现正成单金额"}
                          </td>
                          <td>{stats(c).active.length} 条</td>
                          <td>
                            {
                              candidates.filter((s) => s.customer === c.name)
                                .length
                            }{" "}
                            条
                          </td>
                          <td>
                            <span className="g-tag">
                              {groupNames[bucket(c)]}
                            </span>
                          </td>
                          <td>
                            <button
                              className="g-text"
                              onClick={() => setCustomer(c)}
                            >
                              查看档案 ↗
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!customers.length && (
                  <div className="g-empty">
                    尚无客户数据，请检查数据连接或切换演示模式。
                  </div>
                )}
              </div>
            </section>
          )}
          <footer className="g-footer">
            <span>DIG · 每次经营有依据，每个机会有下一步</span>
            <span>
              {demo
                ? "合成演示 · 浏览器本地保存"
                : `飞书读取：${data ? new Date(data.syncedAt).toLocaleString("zh-CN") : "尚未成功"}`}
            </span>
          </footer>
        </main>
      </div>
      {(selected || customer || importOpen) && (
        <div
          className="g-overlay"
          onClick={() => {
            setSelected(null);
            setCustomer(null);
            setImportOpen(false);
          }}
        >
          <section
            className={`g-drawer ${customer ? "g-drawer-profile" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              importOpen ? "导入公开需求" : selected?.title || customer?.name
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="g-close"
              aria-label="关闭"
              onClick={() => {
                setSelected(null);
                setCustomer(null);
                setImportOpen(false);
              }}
            >
              <X size={20} />
            </button>
            {selected && (
              <>
                <span className="g-eyebrow">OPPORTUNITY EVIDENCE</span>
                <h2>{selected.title}</h2>
                <p>{selected.customer}</p>
                <span className="g-tag">{selected.priority}</span>
                <h3>01 · 公开需求依据</h3>
                <p>
                  {selected.kind} · {selected.published} · 截止：
                  {selected.deadline || "未披露"}
                </p>
                <blockquote>{selected.text}</blockquote>
                {selected.url ? (
                  <a
                    className="g-text"
                    href={selected.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    核对原始公告 ↗
                  </a>
                ) : (
                  <p className="g-footnote">合成演示，未对应真实公告。</p>
                )}
                <h3>02 · 为什么匹配这些能力</h3>
                <p>{selected.reason}</p>
                {selected.matches.map((c) => (
                  <div className="g-evidence" key={c.id}>
                    <b>{c.name}</b>
                    <p>{c.evidence}</p>
                    <p>{c.limits}</p>
                    <small>{c.status}</small>
                  </div>
                ))}
                <h3>03 · 客户关系与建议动作</h3>
                <p>
                  {customers.some((c) => c.name === selected.customer)
                    ? "完整名称命中客户档案；仍需确认采购主体和实际需求方。"
                    : "尚未明确匹配老客户主体，先核实采购方，不能直接视为老客户机会。"}
                </p>
                <p>
                  请客户经理确认建设范围、时间和资格条件；邀请相关产品团队核实交付适配。需求确认后关联飞书商机。
                </p>
                <label>
                  暂不跟进原因
                  <select
                    value={discardReason}
                    onChange={(e) => setDiscardReason(e.target.value)}
                  >
                    <option>暂不符合经营方向</option>
                    <option>客户主体匹配有误</option>
                    <option>已有相关商机</option>
                    <option>资格或交付条件不满足</option>
                    <option>客户已确认无需求</option>
                  </select>
                </label>
                <div className="g-drawer-actions">
                  <button
                    className="g-btn primary"
                    onClick={() => {
                      const matched = customers.find(
                        (c) => c.name === selected.customer,
                      );
                      if (!matched) {
                        setToast("尚未匹配客户主体，请先核实采购方");
                        return;
                      }
                      setSelected(null);
                      setCustomer(matched);
                    }}
                  >
                    <Building2 size={16} />
                    查看客户档案
                  </button>
                  <button
                    className="g-btn"
                    onClick={() => {
                      setHidden((h) => ({
                        ...h,
                        [selected.id]: discardReason,
                      }));
                      setSelected(null);
                      setToast("已暂不跟进，可在名单底部恢复");
                    }}
                  >
                    暂不跟进
                  </button>
                </div>
              </>
            )}
            {customer && <CustomerProfile name={customer.name} industry={customer.industry} city={customer.city} cooperation={opportunityTable(customer)} signals={<>{candidates.filter(s => s.customer === customer.name).map(s => <button className="g-related" key={s.id} onClick={() => {setCustomer(null);setSelected(s);}}>{s.title}<ArrowUpRight size={16}/></button>)}</>}/>}
            {importOpen && (
              <>
                <span className="g-eyebrow">NEW PUBLIC SIGNAL</span>
                <h2>导入一条公开需求</h2>
                <p>粘贴已核实的公告摘要，立即匹配公司能力。</p>
                <form onSubmit={addSignal}>
                  <label>
                    采购主体完整名称
                    <input
                      required
                      maxLength={200}
                      value={draft.customer}
                      onChange={(e) =>
                        setDraft({ ...draft, customer: e.target.value })
                      }
                      list="customer-names"
                    />
                    <datalist id="customer-names">
                      {customers.map((c) => (
                        <option key={c.id} value={c.name} />
                      ))}
                    </datalist>
                  </label>
                  <label>
                    公告标题
                    <input
                      required
                      maxLength={300}
                      value={draft.title}
                      onChange={(e) =>
                        setDraft({ ...draft, title: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    原始来源链接
                    <input
                      required
                      type="url"
                      value={draft.url}
                      onChange={(e) =>
                        setDraft({ ...draft, url: e.target.value })
                      }
                      placeholder="https://"
                    />
                  </label>
                  <div className="g-action-fields">
                    <label>
                      发布日期
                      <input
                        required
                        type="date"
                        max={localDate()}
                        value={draft.published}
                        onChange={(e) =>
                          setDraft({ ...draft, published: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      截止日期（选填）
                      <input
                        type="date"
                        value={draft.deadline}
                        onChange={(e) =>
                          setDraft({ ...draft, deadline: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <label>
                    信号类型
                    <select
                      value={draft.kind}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          kind: e.target.value as Signal["kind"],
                        })
                      }
                    >
                      {["采购意向", "招标公告", "公开动态", "中标结果"].map(
                        (k) => (
                          <option key={k}>{k}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    需求原文摘录
                    <textarea
                      required
                      maxLength={10000}
                      rows={6}
                      value={draft.text}
                      onChange={(e) =>
                        setDraft({ ...draft, text: e.target.value })
                      }
                      placeholder="保留实际需求，不添加原文中未披露的信息"
                    />
                  </label>
                  <button className="g-btn primary">
                    导入并匹配 <Sparkles size={16} />
                  </button>
                  <p className="g-footnote">
                    导入不自动认定主体关系、投标资格或真实需求。
                  </p>
                </form>
              </>
            )}
          </section>
        </div>
      )}
      {toast && (
        <div className="g-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
