"use client";
import { ArrowDownLeft, ChevronRight, Flag, MoreHorizontal, Plus } from "lucide-react";
import { stages, type Customer, type Opportunity } from "./demo-data";
export const WIRE_STORAGE_KEY = "dig-growth-prototype-links-v1";
type Props = { opportunities: Opportunity[]; customers: Customer[]; compact: boolean; onOpen: (id: string) => void; onCreate: () => void };
export default function JourneyBoard({ opportunities, customers, compact, onOpen, onCreate }: Props) {
  const customer = (id: string) => customers.find(c => c.id === id);
  const money = (n: number) => n.toLocaleString("zh-CN", { maximumFractionDigits: 1 });
  return <div><p className="p-board-context">按阶段查看独立商机，每张卡片保留自己的客户、负责人和下一步。</p><div className="p-board-scroll"><div className="p-board">
    {stages.map((stage, i) => { const items = opportunities.filter(o => o.stage === i); return <section className="p-board-column" key={stage} aria-label={stage}>
      <div className="p-stage-label"><span className={"p-stage-dot stage-"+i} />{stage}<b>{items.length}</b><span>¥{money(items.reduce((s,o)=>s+o.amount,0))}万</span></div>
      {(compact ? items.slice(0,1) : items).map(o => <button className={"p-op-card "+(o.stalled?"stalled":"")} key={o.id} onClick={()=>onOpen(o.id)}>
        <span className="p-op-customer"><span className={"p-tiny-logo "+customer(o.customer)?.color}>{customer(o.customer)?.short.slice(0,1)}</span>{customer(o.customer)?.short}<MoreHorizontal size={14}/></span>
        <h3>{o.title}</h3><div className="p-op-value">¥ {money(o.amount)}<small>万</small><span className="p-tag">{o.business}</span></div>
        <div className="p-op-next">{o.stalled?<Flag size={14}/>:<ArrowDownLeft size={14}/>}<span>{o.next}</span></div>
        <div className="p-op-foot"><span className={"p-avatar small "+(i%2?"sage":"blue")}>林悦</span><span>{o.stalled?"停滞 12 天":o.date}</span><ChevronRight size={14}/></div>
      </button>)}
      {compact&&!items.length&&<button className="p-empty-stage" onClick={onCreate}><Plus size={18}/><span>发现下一次机会</span></button>}
      {!compact&&<button className="p-board-add" onClick={onCreate}><Plus size={15}/>从线索创建</button>}
    </section>;})}
  </div></div></div>;
}
