import { Fragment, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import AssetFilterConnection from "./asset-filter-connection";

export const assetFilterGroups = [
  { id: "department", label: "部门" },
  { id: "owner", label: "关联销售员" },
  { id: "industry", label: "行业" },
  { id: "region", label: "地区" },
  { id: "level", label: "客户级别" },
] as const;
type AssetFilterId = (typeof assetFilterGroups)[number]["id"];
export type AssetFilterSelection = string[] | null;
export type AssetFilters = Record<AssetFilterId, AssetFilterSelection>;
export type AssetFilterOptions = Record<AssetFilterId, string[]>;
export const emptyAssetFilters: AssetFilters = { department: [], owner: [], industry: [], region: [], level: [] };

export default function CustomerAssetFilters({ options, value, onChange, onReset }: {
  options: AssetFilterOptions;
  value: AssetFilters;
  onChange: (value: AssetFilters) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<{ group: number; name: string } | null>(null);
  const [focusedOption, setFocusedOption] = useState<{ group: number; name: string } | null>(null);
  const highlight = hoveredOption ?? focusedOption;
  const controlsId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerInside = useRef(false);

  function cancelClose() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }

  function close() {
    cancelClose();
    if (controls.current?.contains(document.activeElement)) trigger.current?.focus({ preventScroll: true });
    setOpen(false);
  }

  function scheduleClose() {
    cancelClose();
    timer.current = setTimeout(() => {
      timer.current = null;
      if (!pointerInside.current && !controls.current?.querySelector(":focus-visible")) close();
    }, 1000);
  }

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  function toggleAll(id: AssetFilterId) {
    cancelClose();
    setOpen(true);
    onChange({ ...value, [id]: value[id] === null ? [] : null });
  }

  return (
    <section className="asset-filters" aria-label="客户资产筛选" data-open={open}
      onPointerEnter={event => {
        if (event.pointerType !== "mouse") return;
        pointerInside.current = true;
        cancelClose();
        setOpen(true);
      }}
      onPointerLeave={event => {
        if (event.pointerType !== "mouse") return;
        pointerInside.current = false;
        scheduleClose();
      }}
      onFocusCapture={cancelClose}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget) && !pointerInside.current) scheduleClose();
      }}
      onKeyDown={event => {
        if (event.key !== "Escape" || !open) return;
        event.preventDefault();
        event.stopPropagation();
        close();
      }}>
      <div className="asset-filter-top">
        <SlidersHorizontal className="asset-filter-icon" size={17} aria-hidden="true" />
        <div className="asset-filter-summary">
          {assetFilterGroups.map(({ id, label }) => {
            const selected = value[id];
            return (
              <span className="asset-filter-status" key={id} data-selected={Boolean(selected?.length) || undefined}
                title={selected?.length ? selected.join("、") : undefined}>
                <span>{label}：</span>
                <span className="asset-filter-values">
                  {selected?.length
                    ? selected.map(option => <b key={option}>{option}</b>)
                    : <button type="button" aria-label={`${label}全部（筛选摘要）`} aria-pressed={selected === null}
                        disabled={!options[id].length} onClick={() => toggleAll(id)}>全部</button>}
                </span>
              </span>
            );
          })}
        </div>
        <button ref={trigger} type="button" className="asset-filter-trigger" aria-label="筛选选项" aria-expanded={open} aria-controls={controlsId}
          onClick={event => { if (open && (!pointerInside.current || event.detail === 0)) close(); else setOpen(true); }}>
          <ChevronDown className="asset-filter-chevron" size={16} aria-hidden="true" />
        </button>
        <button type="button" className="g-btn asset-filter-reset" onClick={onReset}>
          <RotateCcw size={13} aria-hidden="true" />重置筛选
        </button>
      </div>
      <div id={controlsId} className="asset-filter-expansion" ref={controls} inert={!open}>
        <div className="asset-filter-scroll">
          <div className="asset-filter-rack">
            {assetFilterGroups.map(({ id, label }, index) => {
              const all = value[id] === null;
              const selected = value[id] ?? options[id];
              const next = assetFilterGroups[index + 1];
              return (
                <Fragment key={id}>
                  <fieldset className="asset-filter-group" aria-labelledby={`${controlsId}-${id}`}
                    data-connected={!all && selected.length > 0 || undefined} data-all={all || undefined}>
                    <div className="asset-filter-group-head">
                      <strong id={`${controlsId}-${id}`}>{label}</strong>
                      <div className="asset-filter-group-actions">
                        <button type="button" className="asset-filter-all" aria-label={`${label}全部`} aria-pressed={all}
                          disabled={!options[id].length} onClick={() => toggleAll(id)}>全部</button>
                        {!all && selected.length > 0 && <button type="button" className="asset-filter-clear" aria-label={`清除${label}筛选`}
                          onClick={() => onChange({ ...value, [id]: [] })}>清除</button>}
                      </div>
                    </div>
                    <div className="asset-filter-options">
                      {options[id].map(option => (
                        <label className="asset-filter-option" key={option}
                          onPointerEnter={() => setHoveredOption({ group: index, name: option })}
                          onPointerLeave={() => setHoveredOption(null)}>
                          <input type="checkbox" checked={selected.includes(option)}
                            onFocus={() => setFocusedOption({ group: index, name: option })}
                            onBlur={() => setFocusedOption(null)}
                            onChange={event => {
                              const updated = event.currentTarget.checked ? [...selected, option] : selected.filter(item => item !== option);
                              onChange({ ...value, [id]: options[id].every(item => updated.includes(item)) ? null : updated });
                            }} />
                          <span className="asset-filter-checkbox"><Check size={12} strokeWidth={2.5} aria-hidden="true" /></span>
                          <span>{option}</span>
                        </label>
                      ))}
                      {!options[id].length && <span className="asset-filter-empty">暂无可选项</span>}
                    </div>
                  </fieldset>
                  {next && <AssetFilterConnection left={value[id]} right={value[next.id]} moving={open} highlight={
                    highlight?.group === index ? { side: "left", name: highlight.name }
                      : highlight?.group === index + 1 ? { side: "right", name: highlight.name } : null
                  } />}
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
