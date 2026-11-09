"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { Check, Link2, Trash2, X } from "lucide-react";
import { REFERENCE_BLUE } from "./palette";

export const BUSINESS_LINKS_KEY = "dig-growth-prototype-business-links-v1";
type Poc = { id: string; customer: string; title: string; source: string; amount: number; converted: boolean };
type Project = { id: string; customer: string; title: string; source: string; contract: string; status: string };
type Relation = { poc: string; project: string };
type Point = { x: number; y: number };

// Synthetic business records; only matching customer AND source opportunity
// may connect, and only after the POC has converted to signed business.
const pocs: Poc[] = [
  { id: "POC-001", customer: "C-001", title: "企业知识库方案验证", source: "O-001", amount: 6.8, converted: false },
  { id: "POC-004", customer: "C-004", title: "物流自动化场景验证", source: "O-004", amount: 3.2, converted: false },
  { id: "POC-003-A", customer: "C-003", title: "园区资产平台一期验证", source: "HIST-003-A", amount: 4.8, converted: true },
];
const projects: Project[] = [
  { id: "PRJ-003-A", customer: "C-003", title: "智慧园区资产平台一期", source: "HIST-003-A", contract: "CT-2026-030", status: "交付中" },
  { id: "PRJ-003-B", customer: "C-003", title: "园区资产数据接入", source: "HIST-003-A", contract: "CT-2026-030", status: "待启动" },
  { id: "PRJ-001-A", customer: "C-001", title: "现有工单服务平台", source: "HIST-001-A", contract: "CT-2026-011", status: "运行维护" },
  { id: "PRJ-002-A", customer: "C-002", title: "基础设施运维服务", source: "HIST-002-A", contract: "CT-2026-018", status: "服务中" },
  { id: "PRJ-004-A", customer: "C-004", title: "现有人力服务项目", source: "HIST-004-A", contract: "CT-2026-023", status: "服务中" },
];
const initialRelations: Relation[] = [{ poc: "POC-003-A", project: "PRJ-003-A" }];
function valid(r: Relation) {
  if (!r || typeof r !== "object") return false;
  const p = pocs.find(p => p.id === r.poc), j = projects.find(j => j.id === r.project);
  return !!p?.converted && !!j && p.customer === j.customer && p.source === j.source;
}

export default function CustomerBusinessLinks({ customerId }: { customerId: string }) {
  const [relations, setRelations] = useState<Relation[]>(initialRelations);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [message, setMessage] = useState("");
  const [geometry, setGeometry] = useState<{ width: number; height: number; points: Record<string, Point> }>({ width: 0, height: 0, points: {} });
  const area = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const ownPocs = pocs.filter(p => p.customer === customerId);
  const ownProjects = projects.filter(p => p.customer === customerId);
  const ownRelations = relations.filter(r => ownPocs.some(p => p.id === r.poc));
  const canAssociate = ownPocs.some(p => p.converted && ownProjects.some(j => j.source === p.source));

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(BUSINESS_LINKS_KEY) || "null"); if (Array.isArray(saved)) setRelations(saved.filter(valid)); } catch { /* Keep initial demo records. */ }
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) try { localStorage.setItem(BUSINESS_LINKS_KEY, JSON.stringify(relations)); } catch { /* Session-only editing remains available. */ } }, [loaded, relations]);
  useEffect(() => { setSource(null); setPointer(null); setEditing(false); setMessage(""); }, [customerId]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") { setSource(null); setPointer(null); drag.current = false; } };
    window.addEventListener("keydown", escape); return () => window.removeEventListener("keydown", escape);
  }, []);
  useLayoutEffect(() => {
    if (!area.current) return;
    const measure = () => {
      const root = area.current!.getBoundingClientRect(); const points: Record<string, Point> = {};
      area.current!.querySelectorAll<HTMLElement>("[data-business-node]").forEach(el => {
        const r = el.getBoundingClientRect(), isPoc = el.dataset.businessType === "poc";
        points[el.dataset.businessNode!] = { x: (isPoc ? r.right : r.left) - root.left, y: r.top - root.top + r.height / 2 };
      });
      setGeometry({ width: root.width, height: root.height, points });
    };
    measure(); const observer = new ResizeObserver(measure); observer.observe(area.current);
    area.current.querySelectorAll<HTMLElement>("[data-business-node]").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [customerId]);

  function save(next: Relation[]) {
    setRelations(next); try { localStorage.setItem(BUSINESS_LINKS_KEY, JSON.stringify(next)); } catch { /* Keep session edits. */ }
  }
  function connect(projectId: string) {
    if (!source) { setMessage("先选择左侧已经转化的 POC。"); return; }
    const next = { poc: source, project: projectId };
    if (!valid(next)) { setMessage("仅可关联同一客户、同一来源商机下的正式项目。"); return; }
    if (relations.some(r => r.poc === source && r.project === projectId)) { setMessage("这条业务关联已经存在。"); return; }
    save([...relations, next]); setSource(null); setPointer(null); setMessage("关联草稿已保存，尚未执行成本结转。");
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current || !source || !area.current) return;
    const r = area.current.getBoundingClientRect(); setPointer({ x: e.clientX - r.left, y: e.clientY - r.top });
  }
  function end(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-project-port]");
    if (target?.dataset.projectPort) connect(target.dataset.projectPort);
    drag.current = false; setPointer(null);
  }
  const path = (a: Point, b: Point) => { const bend = Math.max(18, Math.abs(b.x - a.x) / 2); return `M ${a.x} ${a.y} C ${a.x + bend} ${a.y}, ${b.x - bend} ${b.y}, ${b.x} ${b.y}`; };

  return <section className="p-business-associations">
    <div className="p-business-association-title"><div><h3>POC 与正式项目</h3><p>核对客户和来源商机，明确售前投入去向。</p></div>{canAssociate && <button className="p-btn" aria-pressed={editing} onClick={() => { setEditing(!editing); setSource(null); setPointer(null); setMessage(""); }}>{editing ? <Check size={15} /> : <Link2 size={15} />}{editing ? "完成关联" : "关联项目"}</button>}</div>
    {editing && <div className="p-association-instruction" role="status">{message || "拖动 POC 连接点到项目，或依次点击两个连接点。"}{source && <button aria-label="取消业务关联" onClick={() => { setSource(null); setPointer(null); }}><X size={14} /></button>}</div>}
    <div className="p-business-graph" ref={area} onPointerMove={move} onPointerUp={end} onPointerCancel={() => { drag.current = false; setPointer(null); setSource(null); }}>
      <div className="p-business-node-column"><h4>售前验证 / POC</h4>{ownPocs.map(p => <article key={p.id} data-business-node={p.id} data-business-type="poc" className={source === p.id ? "selected" : ""}><b>{p.title}</b><small>{p.id} · 来源 {p.source}</small><p>已投入 <strong>¥ {p.amount} 万</strong></p><span className={`p-tag ${p.converted ? "blue" : "neutral"}`}>{p.converted ? "已签约转化" : "待签约后关联"}</span>{editing && p.converted && <button className="p-business-port output" aria-label={`关联${p.title}`} onPointerDown={e => { e.preventDefault(); setSource(p.id); setPointer(geometry.points[p.id]); drag.current = true; area.current?.setPointerCapture(e.pointerId); }} onClick={e => { if (e.detail === 0) setSource(p.id); }} />}</article>)}{!ownPocs.length && <p className="p-association-empty">暂无 POC 投入记录。</p>}</div>
      <div className="p-business-node-column"><h4>正式交付项目</h4>{ownProjects.map(j => { const eligible = !!source && valid({ poc: source, project: j.id }); return <article key={j.id} data-business-node={j.id} data-business-type="project"><b>{j.title}</b><small>{j.id} · {j.status}</small><p>合同 <strong>{j.contract}</strong></p><small>来源商机 {j.source}</small>{editing && <button className={`p-business-port input ${eligible ? "eligible" : ""}`} data-project-port={j.id} disabled={!eligible} aria-label={`连接到${j.title}`} onClick={() => connect(j.id)} />}</article>; })}{!ownProjects.length && <p className="p-association-empty">暂无已签约项目。</p>}</div>
      <svg className="p-business-link-layer" width={geometry.width} height={geometry.height} aria-label="业务记录关联">{ownRelations.map(r => { const a = geometry.points[r.poc], b = geometry.points[r.project]; return a && b ? <path key={`${r.poc}:${r.project}`} d={path(a, b)} fill="none" stroke={REFERENCE_BLUE} strokeWidth="1.6" strokeLinecap="round" /> : null; })}{source && pointer && geometry.points[source] && <path d={path(geometry.points[source], pointer)} fill="none" stroke={REFERENCE_BLUE} strokeWidth="1.5" strokeDasharray="4 4" />}</svg>
    </div>
    {!canAssociate && ownPocs.length > 0 && <p className="p-association-rule">当前 POC 尚未签约转化，不能挂到现有的其他项目下。转化后再关联对应的正式项目。</p>}
    {ownRelations.length > 0 && <div className="p-business-relation-list"><h4>已建立的业务关联</h4>{ownRelations.map(r => <div key={`${r.poc}:${r.project}`}><Link2 size={14} /><span>{pocs.find(p => p.id === r.poc)?.title}<span className="p-relation-arrow">→</span>{projects.find(j => j.id === r.project)?.title}</span>{editing && <button aria-label={`取消关联${projects.find(j => j.id === r.project)?.title}`} onClick={() => { save(relations.filter(x => x.poc !== r.poc || x.project !== r.project)); setMessage("关联草稿已取消，不改变 POC 与项目原记录。"); }}><Trash2 size={14} /></button>}</div>)}</div>}
    <p className="p-association-caption">演示记录 · 仅建立关联草稿，不自动结转成本或改变审批状态。</p>
  </section>;
}
