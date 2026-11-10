"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export type DropdownOption = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  options: readonly (string | DropdownOption)[];
  onChange: (value: string) => void;
  inline?: boolean;
  searchable?: boolean;
  editable?: boolean;
  required?: boolean;
  maxLength?: number;
};

const normalize = (text: string) => text.normalize("NFKC").trim().toLocaleLowerCase();

export default function Dropdown({
  label, value, options, onChange, inline, searchable, editable, required, maxLength,
}: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [placement, setPlacement] = useState({ above: false, height: 232 });
  const items = options.map((option) => typeof option === "string" ? { value: option, label: option } : option);
  const selected = items.find((option) => option.value === value);
  const filter = normalize(editable ? value : query);
  const visible = items.filter(({ label, value }) =>
    !filter || normalize(label).includes(filter) || normalize(value).includes(filter),
  );
  const shown = editable ? visible.slice(0, 20) : visible;
  const expanded = open && (!editable || shown.length > 0);

  useLayoutEffect(() => {
    if (!expanded || !field.current) return;
    const place = () => {
      if (!field.current) return;
      const rect = field.current.getBoundingClientRect();
      const panel = field.current.closest(".g-panel-body")?.getBoundingClientRect();
      const below = Math.min(window.innerHeight, panel?.bottom ?? Infinity) - rect.bottom - 13;
      const above = rect.top - Math.max(0, panel?.top ?? 0) - 13;
      const flip = below < 244 && above > below;
      setPlacement({ above: flip, height: Math.min(244, Math.max(72, (flip ? above : below) - (searchable && !editable ? 42 : 0))) });
    };
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && menu.current?.contains(event.target)) return;
      place();
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    if (!editable) {
      if (searchable) input.current?.focus({ preventScroll: true });
      else menu.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus({ preventScroll: true });
    }
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [expanded, searchable, editable]);

  useLayoutEffect(() => {
    if (editable && expanded && active >= 0) {
      menu.current?.children[active]?.scrollIntoView({ block: "nearest" });
    }
  }, [active, editable, expanded]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  function openMenu() {
    setQuery("");
    setActive(-1);
    setOpen(true);
  }

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    if (!editable) trigger.current?.focus({ preventScroll: true });
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      if (!editable) trigger.current?.focus({ preventScroll: true });
      return;
    }
    if (editable && expanded && event.key === "Enter" && shown[active]) {
      event.preventDefault();
      choose(shown[active].value);
      return;
    }
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    if (!open && !editable) {
      event.preventDefault();
      openMenu();
      return;
    }
    if (!shown.length) return;
    event.preventDefault();
    if (!open) setOpen(true);
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const buttons = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
    const current = editable ? active : buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = current < 0 ? (direction === 1 ? 0 : shown.length - 1) : (current + direction + shown.length) % shown.length;
    if (editable) setActive(next);
    else {
      buttons[next]?.focus({ preventScroll: true });
      buttons[next]?.scrollIntoView({ block: "nearest" });
    }
  }

  return (
    <div
      ref={root}
      className={`g-dropdown ${inline ? "g-dropdown-inline" : "g-dropdown-field"}`}
      data-open={expanded || undefined}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
      onKeyDown={handleKey}
    >
      {!inline && (editable
        ? <label className="g-dropdown-label" htmlFor={`${id}-input`}>{label}</label>
        : <span className="g-dropdown-label" id={`${id}-label`}>{label}</span>)}
      <div className="g-dropdown-anchor" ref={field}>
        {editable ? (
          <input
            ref={input}
            id={`${id}-input`}
            className="g-dropdown-editable"
            role="combobox"
            aria-expanded={expanded}
            aria-autocomplete="list"
            aria-controls={expanded ? `${id}-options` : undefined}
            aria-activedescendant={expanded && active >= 0 ? `${id}-option-${active}` : undefined}
            autoComplete="off"
            required={required}
            maxLength={maxLength}
            value={value}
            onChange={(event) => { onChange(event.target.value); openMenu(); }}
            onClick={openMenu}
          />
        ) : (
          <button
            ref={trigger}
            type="button"
            className="g-dropdown-trigger"
            aria-haspopup="listbox"
            aria-expanded={expanded}
            aria-controls={expanded ? `${id}-options` : undefined}
            aria-label={inline ? `${label}：${selected?.label ?? value}` : undefined}
            aria-labelledby={inline ? undefined : `${id}-label ${id}-value`}
            onClick={() => { if (open) setOpen(false); else openMenu(); }}
          >
            <span id={`${id}-value`}>{selected?.label ?? value}</span>
            <ChevronDown size={15} />
          </button>
        )}
        {expanded && (
          <div className="g-dropdown-popup" data-placement={placement.above ? "above" : "below"}>
            {!editable && searchable && (
              <div className="g-dropdown-search">
                <Search size={15} />
                <input ref={input} aria-label={`搜索${label}`} placeholder={`搜索${label}`}
                  value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
            )}
            <div className="g-dropdown-options" ref={menu} id={`${id}-options`} role="listbox"
              aria-label={label} style={{ maxHeight: placement.height }}>
              {shown.map((option, index) => (
                <button
                  id={`${id}-option-${index}`}
                  key={option.value}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={value === option.value}
                  data-highlighted={editable && active === index || undefined}
                  onPointerDown={(event) => { if (editable) event.preventDefault(); }}
                  onClick={() => choose(option.value)}
                >
                  <span>{option.label}</span>{value === option.value && <Check size={15} />}
                </button>
              ))}
            </div>
            {!shown.length && <p className="g-dropdown-empty" role="status">没有匹配选项</p>}
          </div>
        )}
      </div>
    </div>
  );
}
