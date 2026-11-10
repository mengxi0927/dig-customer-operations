import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { MessageCircle } from "lucide-react";
import type { DigOpportunity } from "@/lib/dig-types";
import { tableBadgeColor } from "./table-badge-color";

type Contact = { name: string; openId?: string; units: Set<string>; opportunities: Set<string> };
let activePopover: { id: string; close: () => void } | undefined;

function SalesAvatar({ contact }: { contact: Contact }) {
  const { name, openId, units, opportunities } = contact;
  const id = useId();
  const anchor = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pinned = useRef(false);
  const focusAction = useRef(false);
  const [open, setOpen] = useState(false);
  const initials = Array.from(name).slice(-2).join("");
  const chat = openId ? `https://applink.feishu.cn/client/chat/open?openId=${encodeURIComponent(openId)}` : null;

  function cancelClose() {
    clearTimeout(timer.current);
  }

  function show() {
    cancelClose();
    if (activePopover?.id !== id) {
      activePopover?.close();
      activePopover = { id, close };
    }
    setOpen(true);
  }

  function close() {
    cancelClose();
    if (activePopover?.id === id) activePopover = undefined;
    pinned.current = false;
    focusAction.current = false;
    setOpen(false);
  }

  function deferClose() {
    cancelClose();
    timer.current = setTimeout(() => {
      if (!pinned.current && !anchor.current?.matches(":focus-visible") && !panel.current?.contains(document.activeElement)) close();
    }, 150);
  }

  useLayoutEffect(() => {
    if (!open || !anchor.current || !panel.current) return;
    const rect = anchor.current.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = panel.current;
    const below = rect.bottom + height + 16 <= window.innerHeight;
    panel.current.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
    panel.current.style.top = `${Math.max(8, below ? rect.bottom + 7 : rect.top - height - 7)}px`;
    if (focusAction.current) {
      focusAction.current = false;
      (panel.current.querySelector("a") ?? panel.current).focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !anchor.current?.contains(event.target) && !panel.current?.contains(event.target)) close();
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const wasFocused = panel.current?.contains(document.activeElement);
      if (wasFocused || anchor.current === document.activeElement) event.stopPropagation();
      if (wasFocused) anchor.current?.focus({ preventScroll: true });
      close();
    }
    function scroll(event: Event) {
      if (!(event.target instanceof Node) || !panel.current?.contains(event.target)) close();
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  useEffect(() => () => {
    clearTimeout(timer.current);
    if (activePopover?.id === id) activePopover = undefined;
  }, [id]);

  return (
    <>
      <button ref={anchor} type="button" className="asset-sales-avatar"
        style={{ "--sales-avatar-color": tableBadgeColor("seller", openId ?? name) } as CSSProperties}
        aria-label={`${name}，销售员资料`} aria-expanded={open} aria-controls={open ? id : undefined}
        onPointerEnter={event => { if (event.pointerType !== "touch") show(); }}
        onPointerLeave={deferClose}
        onFocus={event => { if (event.currentTarget.matches(":focus-visible")) show(); }}
        onBlur={deferClose}
        onClick={event => {
          if (pinned.current) { close(); return; }
          pinned.current = true;
          if (event.detail === 0) {
            if (panel.current) (panel.current.querySelector("a") ?? panel.current).focus();
            else focusAction.current = true;
          }
          show();
        }}>{initials}</button>
      {open && createPortal(
        <div id={id} className="asset-sales-popover" ref={panel} role="group" aria-label={`${name}的销售员资料`} tabIndex={-1}
          onPointerEnter={cancelClose} onPointerLeave={deferClose}
          onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) close();
          }}>
          <strong>{name}</strong>
          <p>关联销售员 · {opportunities.size} 条客户商机</p>
          <p>营销单元：{units.size ? [...units].join("、") : "未关联"}</p>
          {chat ? (
            <a href={chat} target="_blank" rel="noreferrer" className="asset-sales-chat">
              <MessageCircle size={15} aria-hidden="true" />发起飞书会话
            </a>
          ) : (
            <button type="button" disabled className="asset-sales-chat" title="源记录未提供飞书会话标识">
              <MessageCircle size={15} aria-hidden="true" />暂无会话入口
            </button>
          )}
        </div>, document.body)}
    </>
  );
}

export default function SalesContactAvatars({ opportunities }: { opportunities: DigOpportunity[] }) {
  const contacts = new Map<string, Contact>();
  for (const opportunity of opportunities) {
    const verified = opportunity.ownerContacts ?? [];
    const unverified = opportunity.owner.split("、").map(name => name.trim()).filter(name =>
      name && !verified.some(contact => contact.name === name));
    const owners = [...verified, ...unverified.map(name => ({ name, openId: undefined }))];
    for (const { name, openId } of owners) {
      const key = openId ?? `name:${name}`;
      const contact = contacts.get(key) ?? { name, openId, units: new Set<string>(), opportunities: new Set<string>() };
      contact.opportunities.add(opportunity.id);
      for (const unit of opportunity.marketingUnits ?? []) if (unit) contact.units.add(unit);
      contacts.set(key, contact);
    }
  }
  if (!contacts.size) return <span className="asset-cell-tag" data-tone="neutral">未关联</span>;
  return <div className="asset-sales-avatars">
    {[...contacts].map(([key, contact]) => <SalesAvatar key={key} contact={contact} />)}
  </div>;
}
