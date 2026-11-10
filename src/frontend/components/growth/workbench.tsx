"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  ArrowUpRight,
  ArrowRight,
  BriefcaseBusiness,
  ClipboardCheck,
  FolderOpen,
  LoaderCircle,
  Network,
  ScanSearch,
  UserRound,
  ChevronRight,
  ChartNoAxesCombined,
  List,
  Layers3,
  LayoutDashboard,
  Plus,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  assessAdmission,
  matchSignal,
  signalKey,
  type Signal,
  type Candidate,
} from "@/lib/growth-engine";
import type { DigAccount, DigOpportunity, DigOverview } from "@/lib/dig-types";
import "./workbench.css";
import CustomerAssets from "./customer-assets";
import CustomerValueTiers from "./customer-value-tiers";
import Dropdown from "./dropdown";
import CustomerProfile from "./customer-profile";
import OpportunityGrowth from "./opportunity-growth";
import WorkspacePanels, { type PanelInfo } from "./workspace-panels";
import AdmissionPanels from "./admission-panels";
import { switchWorkspace } from "./fade-swap";
import { useScrollMotion } from "./use-scroll-motion";
import { demoAdmissionResult, CUSTOMER_CREATE_FORM } from "@/lib/admission-demo";
import "./workbench-theme.css";
import "./scroll-motion.css";

type View = "customers" | "admission" | "radar";
type CustomerTab = "assets" | "value";
type PanelPage =
  | { kind: "archive"; customer: DigAccount }
  | { kind: "evidence"; signal: Candidate }
  | { kind: "access"; customer: DigAccount }
  | { kind: "approval" }
  | { kind: "import" };

function panelId(page: PanelPage) {
  if (page.kind === "archive" || page.kind === "access") return `${page.kind}:${page.customer.id}`;
  if (page.kind === "evidence") return `evidence:${page.signal.id}`;
  return page.kind;
}
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
  { id: "customers", label: "客户经营", icon: LayoutDashboard },
  { id: "admission", label: "新客户准入", icon: ShieldCheck },
  { id: "radar", label: "老客户机会增长", icon: Radar },
] as const;
const customerTabs = [
  { id: "assets", label: "客户资产总览", icon: BriefcaseBusiness },
  { id: "value", label: "客户价值分层", icon: ChartNoAxesCombined },
] as const;
const descriptions: Record<View, string> = {
  customers: "盘点客户规模与分布，结合历史成单和在途机会选择经营方向。",
  admission: "核对企业主体与风险证据，把需要人工判断的情况单独列出。",
  radar: "从已有合作、标杆案例和客户动态中找到可以跟进的机会。",
};
const emptyCustomers: DigAccount[] = [];
const emptyOpportunities: DigOpportunity[] = [];
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
const magneticAction = ".g-btn.primary";

function pullPrimaryAction(event: PointerEvent<HTMLDivElement>) {
  if (event.pointerType !== "mouse") return;
  const action = (event.target as Element).closest<HTMLElement>(magneticAction);
  if (!action || action.matches(":disabled") ||
    !window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) return;
  const box = action.getBoundingClientRect();
  const offset = (position: number, start: number, size: number) =>
    `${Math.max(-3, Math.min(3, (position - start - size / 2) * .085))}px`;
  action.style.setProperty("--pull-x", offset(event.clientX, box.left, box.width));
  action.style.setProperty("--pull-y", offset(event.clientY, box.top, box.height));
}

function releasePrimaryAction(event: PointerEvent<HTMLDivElement>) {
  const action = (event.target as Element).closest<HTMLElement>(magneticAction);
  if (!action || (event.relatedTarget instanceof Node && action.contains(event.relatedTarget))) return;
  action.style.removeProperty("--pull-x");
  action.style.removeProperty("--pull-y");
}
async function read(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  const d = await r.json();
  if (!r.ok) throw Error(d.message || "读取失败");
  return d;
}
export default function GrowthWorkbench() {
  const [view, setView] = useState<View>("customers"),
    [customerTab, setCustomerTab] = useState<CustomerTab>("assets"),
    [demo, setDemo] = useState(false),
    [data, setData] = useState<DigOverview | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState("");
  const [signals, setSignals] = useState<Signal[]>([]),
    [imported, setImported] = useState<Signal[]>([]),
    [actions, setActions] = useState<Action[]>([]),
    [hidden, setHidden] = useState<Record<string, string>>({}),
    [ready, setReady] = useState(false),
    [feed, setFeed] = useState("正在检查订阅连接");
  const [panelTrail, setPanelTrail] = useState<PanelPage[]>([]),
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
  const [accessReason, setAccessReason] = useState("");
  const [accessSaved, setAccessSaved] = useState(false);
  const viewContent = useRef<HTMLDivElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  useScrollMotion(workspace);
  const customerContent = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const page = panelTrail.at(-1);
  const selected = page?.kind === "evidence" ? page.signal : null;
  const customer = page?.kind === "archive" ? page.customer : null;
  const accessTarget = page?.kind === "access" ? page.customer : null;
  const importOpen = page?.kind === "import";
  const panel: PanelInfo | null = page ? {
    id: panelId(page),
    kind: page.kind === "archive" || page.kind === "evidence" ? page.kind : "form",
    title: selected?.title || customer?.name ||
      (page.kind === "access" ? "申请查看客户档案" : page.kind === "approval" ? "客户准入例外审批" : "导入公开需求"),
  } : null;

  function openPanel(next: PanelPage, fromPanel = false) {
    if (!fromPanel) returnFocus.current = document.activeElement as HTMLElement | null;
    setPanelTrail((trail) => {
      if (!fromPanel) return [next];
      const existing = trail.findIndex((item) => panelId(item) === panelId(next));
      return existing >= 0 ? trail.slice(0, existing + 1) : [...trail, next];
    });
  }
  const closePanel = useCallback(() => {
    setPanelTrail([]);
    const trigger = returnFocus.current;
    returnFocus.current = null;
    requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    });
  }, []);
  function openCustomer(target: DigAccount) {
    openPanel({ kind: "archive", customer: target });
  }
  function openImport() {
    openPanel({ kind: "import" });
  }
  function resetAdmissionPanel() {
    setApprovalStage("");
    if (page?.kind === "approval" || page?.kind === "access") closePanel();
  }
  function requestCustomerAccess(target: DigAccount) {
    openPanel({ kind: "access", customer: target });
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
    setPanelTrail([]);
    setQuery("");
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
  const customers = demo ? demoCustomers : data?.customers || emptyCustomers,
    opps = demo ? demoOpps : data?.opportunities || emptyOpportunities;
  const currentNav = nav.find((item) => item.id === view)!;
  const currentTab = customerTabs.find((tab) => tab.id === customerTab)!;
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
  const list = candidates.filter(
    (s) =>
      !hidden[s.id] &&
      (!query || [s.customer, s.title, s.text].some((v) => v.includes(query))),
  );
  function go(v: View) {
    switchWorkspace(viewContent.current, () => {
      setView(v);
      setQuery("");
      if (v !== view) {
        setPanelTrail([]);
        returnFocus.current = null;
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    });
  }
  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (checking) return;
    const startedAt = Date.now();
    setChecking(true);
    setAdmission(null);
    resetAdmissionPanel();
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
    closePanel();
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
            onClick={() => openPanel({ kind: "evidence", signal: s })}
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
            <button className="g-btn" onClick={openImport}>
              导入公开需求
            </button>
          </div>
        )}
      </div>
    );
  }
  function renderPanelContent() {
    return (
      <>
        {selected && (
          <>

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
            <Dropdown label="暂不跟进原因" value={discardReason} onChange={setDiscardReason} options={[
              "暂不符合经营方向", "客户主体匹配有误", "已有相关商机",
              "资格或交付条件不满足", "客户已确认无需求",
            ]} />
            <div className="g-panel-actions">
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
                  openPanel({ kind: "archive", customer: matched }, true);
                }}
              >
                <FolderOpen size={16} aria-hidden="true" />
                查看客户档案
              </button>
              <button
                className="g-btn"
                onClick={() => {
                  setHidden((h) => ({
                    ...h,
                    [selected.id]: discardReason,
                  }));
                  closePanel();
                  setToast("已暂不跟进，可在名单底部恢复");
                }}
              >
                暂不跟进
              </button>
            </div>
          </>
        )}
        {customer && <CustomerProfile name={customer.name} industry={customer.industry} city={customer.city} cooperation={opportunityTable(customer)} signals={<>{candidates.filter(s => s.customer === customer.name).map(s => <button className="g-related" key={s.id} onClick={() => {openPanel({ kind: "evidence", signal: s }, true);}}>{s.title}<ArrowUpRight size={16}/></button>)}</>}/>}
        {importOpen && (
          <>

            <p>粘贴已核实的公告摘要，立即匹配公司能力。</p>
            <form onSubmit={addSignal}>
              <Dropdown
                label="采购主体完整名称"
                editable
                required
                maxLength={200}
                value={draft.customer}
                options={[...new Set(customers.map((customer) => customer.name))]}
                onChange={(customer) => setDraft((current) => ({ ...current, customer }))}
              />
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
              <Dropdown
                label="信号类型"
                value={draft.kind}
                options={["采购意向", "招标公告", "公开动态", "中标结果"]}
                onChange={(kind) => setDraft((current) => ({ ...current, kind: kind as Signal["kind"] }))}
              />
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
        {accessTarget && admission && (
          accessSaved ? (
            <div className="g-panel-status" role="status">
              <h3>查看申请已暂存 · 待审批</h3>
              <p>客户：{accessTarget.name}</p>
              <p>申请理由：{accessReason}</p>
              <p>审批通过后方可查看客户档案。</p>
              <small>申请仅保存在本浏览器，尚未发送负责人；审批服务接入后可正式提交。</small>
            </div>
          ) : (
            <form onSubmit={(event) => {
              event.preventDefault();
              const reason = accessReason.trim();
              if (!reason) { setToast("请填写查看理由"); return; }
              try {
                localStorage.setItem(`dig-customer-access:${accessTarget.id}`, JSON.stringify({
                  customerId: accessTarget.id, customerName: accessTarget.name, owner: admission.owner || "",
                  reason, status: "pending", createdAt: new Date().toISOString(),
                }));
                setAccessReason(reason);
                setAccessSaved(true);
              } catch {
                setToast("申请未保存，请检查浏览器存储后重试");
              }
            }}>
              <p>客户：{accessTarget.name} · 负责人：{admission.owner || "待确认"}</p>
              <label>
                查看理由
                <textarea required maxLength={1000} value={accessReason}
                  onChange={(event) => setAccessReason(event.target.value)}
                  placeholder="请说明业务合作背景及查看用途" />
              </label>
              <p className="g-footnote">审批通过后方可查看。当前申请暂存本浏览器，尚未发送负责人。</p>
              <div className="g-panel-actions">
                <button className="g-btn primary" disabled={!accessReason.trim()}>保存查看申请</button>
                <button type="button" className="g-btn" onClick={closePanel}>取消</button>
              </div>
            </form>
          )
        )}
        {page?.kind === "approval" && admission && (
          approvalStage === "submitted" ? (
            <div className="g-panel-status" role="status">
              <h3>演示审批已发起</h3>
              <p>DEMO-APPROVAL-001 · 待人工审批（模拟）</p>
              <p>下一节点：法务复核 → 合规审批</p>
              <small>仅保存在本浏览器，未发送真实飞书审批。</small>
              <button className="g-text" onClick={() => setApprovalStage("draft")}>查看申请内容</button>
            </div>
          ) : (
            <form onSubmit={(event) => {
              event.preventDefault();
              const record = {
                id: "DEMO-APPROVAL-001", name: admission.facts.name, score: admission.score,
                note: approvalNote, status: "待人工审批（模拟）", createdAt: new Date().toISOString(),
              };
              try {
                localStorage.setItem("dig-admission-demo-approval", JSON.stringify(record));
              } catch {
                setToast("审批草稿未保存，请检查浏览器存储后重试");
                return;
              }
              setApprovalStage("submitted");
            }}>
              <p>{admission.facts.name} · 准入分 {admission.score}</p>
              <p>审批流程：销售提交 → 法务复核 → 合规审批（模拟）</p>
              <label>申请说明<textarea required value={approvalNote} onChange={(event) => setApprovalNote(event.target.value)} /></label>
              <div className="g-panel-actions">
                <button className="g-btn primary">提交演示审批</button>
                <button type="button" className="g-btn" onClick={() => { setApprovalStage(""); closePanel(); }}>取消</button>
              </div>
            </form>
          )
        )}
      </>
    );
  }

  return (
    <div className="growth-app" ref={workspace} onPointerMove={pullPrimaryAction} onPointerOut={releasePrimaryAction}>
      <aside className="g-sidebar">
        <nav aria-label="主导航">
          {nav.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              aria-current={view === item.id ? "page" : undefined}
              aria-label={item.label}
              title={item.label}
              onClick={() => go(item.id)}
            >
              <span className="g-nav-icon"><item.icon size={19} /></span>
              <span className="g-nav-text">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="g-sidebar-bottom">
          <a
            href="https://dcholdings.feishu.cn/app/NMZEbyNx5a0Fews9qHWctsNVn9g?pageId=pgentnD0whSh1vQB"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="DIG 端到端系统"
            title="DIG 端到端系统"
          >
            <Network size={19} aria-hidden="true" />
            <span className="g-nav-text">DIG 端到端系统 <ArrowUpRight size={13} /></span>
          </a>
        </div>
      </aside>
      <div className="g-body">
        <header className="g-top">
          <div className="g-brand">
            <span className="g-brand-mark"><Layers3 size={22} /></span>
            <strong>DIG</strong>
            <small>客户智能经营</small>
          </div>
          <div className="g-top-trail" aria-label="当前位置">
            {currentNav.label}
            {view === "customers" && <><ChevronRight size={14} />{currentTab.label}</>}
          </div>
          <div className="g-top-tools">
            <a className="g-source-pill" href={demo ? undefined : "/data"} title={demo ? "合成演示" : "查看源数据"}>
              <i className={data || demo ? "connected" : ""} />
              {demo ? "合成演示" : busy ? "正在读取" : data ? "飞书只读" : "数据未连接"}
            </a>
            <button
              className="g-icon-btn"
              aria-label="刷新数据"
              title="刷新数据"
              disabled={busy}
              onClick={() => void refresh()}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </header>
        <WorkspacePanels
          panel={panel}
          content={panel ? renderPanelContent() : null}
          onClose={closePanel}
          onBack={panelTrail.length > 1 ? () => setPanelTrail((trail) => trail.slice(0, -1)) : undefined}
        >
        <main className="g-main">
          <div ref={viewContent}>
          <div className="g-heading">
            <div>
              <h1>{currentNav.label}</h1>
              <p>{descriptions[view]}</p>
            </div>
            {view === "radar" && (
              <button className="g-btn primary" onClick={openImport}>
                <Plus size={16} />导入公开需求
              </button>
            )}
          </div>
          {view === "customers" && (
            <Tabs.Root value={customerTab} activationMode="manual" onValueChange={(value) => {
              if (value === "assets" || value === "value") {
                switchWorkspace(customerContent.current, () => setCustomerTab(value));
              }
            }}>
              <div className="g-tab-bar">
                <Tabs.List className="g-customer-tabs" aria-label="客户经营页签">
                  {customerTabs.map((tab) => (
                    <Tabs.Trigger key={tab.id} value={tab.id}>
                      <tab.icon size={16} />{tab.label}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>
                <button className="g-btn g-list-jump" onClick={() => {
                  const listId = customerTab === "assets" ? "asset-customer-list" : "tier-customer-list";
                  const section = document.getElementById(listId);
                  section?.scrollIntoView({ block: "start" });
                  section?.focus({ preventScroll: true });
                }}>
                  <List size={16} />查看客户名单
                </button>
              </div>
              {!demo && error && !data && (
                <div className="g-error" role="status">
                  客户数据暂不可用：{error}
                  <button type="button" onClick={() => void refresh()}>重试</button>
                </div>
              )}
              <div ref={customerContent}>
                <Tabs.Content value="assets" forceMount hidden={customerTab !== "assets"}>
                  <CustomerAssets
                    customers={customers}
                    opportunities={opps}
                    onCustomer={openCustomer}
                    loading={!demo && !data && !error}
                  />
                </Tabs.Content>
                <Tabs.Content value="value" forceMount hidden={customerTab !== "value"}>
                  <CustomerValueTiers
                    customers={customers}
                    opportunities={opps}
                    signals={candidates}
                    available={demo || data !== null}
                    onCustomer={openCustomer}
                    onAdmission={() => go("admission")}
                    onGrowth={() => go("radar")}
                  />
                </Tabs.Content>
              </div>
            </Tabs.Root>
          )}
          {view === "radar" && (
            <OpportunityGrowth customers={customers} opportunities={opps} signals={candidates}
              onCustomer={openCustomer} demo={demo} feedLabel={feed} />
          )}
          {view === "admission" && (
            <AdmissionPanels phase={checking ? "loading" : admission ? "result" : "form"} form={
              <section className="g-card g-form-card">
                <div className="g-card-heading">
                  <div>
                    <h2>新客户核查</h2>
                    <p>一次提交，汇集主体与风险证据</p>
                  </div>
                  <ScanSearch size={22} aria-hidden="true" />
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
                      onChange={(e) => {setCompany(e.target.value);setAdmission(null);resetAdmissionPanel();}}
                    />
                  </label>
                  {demo && (
                    <Dropdown label="演示核查场景" value={scenario} onChange={setScenario} options={[
                      { value: "normal", label: "资料完整 · 无命中项" },
                      { value: "small", label: "小微企业 · 无命中项" },
                      { value: "risk", label: "命中风险 · 人工复核" },
                      { value: "missing", label: "必查信息不完整" },
                      { value: "blocked", label: "主体注销 · 停止自动准入" },
                    ]} />
                  )}
                  <button className="g-btn primary" disabled={checking}>
                    {checking
                      ? "正在核查…"
                      : demo
                        ? "运行示例核查"
                        : "提交客户核查"}
                    <ArrowRight size={16} />
                  </button>
                  <div className="g-process-space">
                    <div className="g-process" role="group" aria-label="客户核查步骤">
                      {["确认主体", "获取信息", "规则校验", "输出建议"].map(
                        (step, index) => <span key={step}><b>{index + 1}</b>{step}</span>,
                      )}
                    </div>
                  </div>
                </form>
              </section>
            } result={(resetRatio) => (
              <section className="g-card g-result">
                <div className="g-card-heading">
                  <div>
                    <h2>准入核查结果</h2>
                    <p aria-live="polite">{checking ? "正在整理核查结果" : admission?.source || "等待提交客户信息"}</p>
                  </div>
                  {resetRatio && <button type="button" className="g-text g-admission-auto" onClick={resetRatio}>
                    恢复自动比例
                  </button>}
                </div>
                {checking ? (
                  <div className="g-admission-loading" role="status" aria-live="polite">
                    <LoaderCircle size={38} className="g-admission-spinner" aria-hidden="true" />
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
                      <section className="g-result-facts" aria-label="企业信息">
                        <p>企业：{admission.facts.name}</p>
                        {admission.demoCase !== "existing" && <><p>
                          登记状态：{admission.facts.status}
                          {admission.small && ` · 小微企业：${admission.small}`}
                        </p>
                        <p>主体编号：{admission.facts.creditCode || "待核实"}</p></>}
                        {admission.demoCase === "existing" && <div className="g-existing-owner"><UserRound size={17} aria-hidden="true" /> 当前负责人：<strong>{admission.owner || "待确认（暂无关联销售员）"}</strong><small>归属来自关联商机销售员</small></div>}
                      </section>
                      <section className="g-result-feedback" aria-label="核查反馈">
                        {admission.reasons.map((r) => (
                          <div className="g-reason" key={r}>
                            <ClipboardCheck size={16} aria-hidden="true" />
                            {r}
                          </div>
                        ))}
                        {admission.dimensions && <div className="g-demo-dimensions">{admission.dimensions.map(([label, score, max]) => <div key={label}><span>{label}</span><b>{score} / {max}</b></div>)}</div>}
                        {admission.demoCase === "existing" && <div className="g-admission-result-actions">{admission.existingCustomers?.map(c => <button key={c.id} className="g-btn" onClick={() => requestCustomerAccess(c)}>申请查看客户档案{admission.existingCustomers!.length > 1 ? `（${c.number || c.id}）` : ""} <ArrowUpRight size={14} /></button>)}</div>}
                        {admission.demoCase === "pass" && <div className="g-admission-result-actions"><a className="g-btn primary" href={CUSTOMER_CREATE_FORM} target="_blank" rel="noreferrer">开始填写新客户 <ArrowUpRight size={16} /></a><small>打开飞书建档表单，请在表单填写客户名称。</small></div>}
                        {admission.demoCase === "risk" && (
                          <div className="g-admission-result-actions">
                            <button className="g-btn primary" onClick={() => {
                              if (!approvalStage) {
                                setApprovalStage("draft");
                                setApprovalNote("拟开展数据治理项目合作，请法务与合规复核风险处置情况及合作条件。");
                              }
                              openPanel({ kind: "approval" });
                            }}>
                              {approvalStage === "submitted" ? "查看演示审批" : "发起审批"} <ArrowRight size={16} />
                            </button>
                          </div>
                        )}
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
                      </section>
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
            )} />
          )}
          </div>
          <footer className="g-footer">
            <span>DIG · 每次经营有依据，每个机会有下一步</span>
            <span>
              {demo
                ? "合成演示 · 浏览器本地保存"
                : `飞书读取：${data ? new Date(data.syncedAt).toLocaleString("zh-CN") : "尚未成功"}`}
            </span>
          </footer>
        </main>
        </WorkspacePanels>
      </div>
      {toast && (
        <div className="g-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
