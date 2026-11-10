"use client";

import {
  useEffect, useId, useLayoutEffect, useRef, useState,
  type CSSProperties, type KeyboardEvent, type ReactNode,
} from "react";
import { ArrowLeft, Columns2, Maximize2, PanelBottom, Square, X } from "lucide-react";
import PanelResizeHandle from "./panel-resize-handle";
import "./workspace-panels.css";

type Layout = "split" | "center" | "expanded" | "sheet";
export type PanelInfo = {
  id: string;
  title: string;
  kind: "archive" | "evidence" | "form";
};

type Props = {
  panel: PanelInfo | null;
  content: ReactNode;
  children: ReactNode;
  onClose: () => void;
  onBack?: () => void;
};

const layouts = {
  split: { label: "并排", icon: Columns2 },
  center: { label: "居中", icon: Square },
  expanded: { label: "展开", icon: Maximize2 },
  sheet: { label: "底部", icon: PanelBottom },
};
const desktopLayouts = ["split", "center", "expanded"] as const;
const compactLayouts = ["sheet", "expanded"] as const;
const minPanel = 360;
const minWorkspace = 440;
const separatorWidth = 12;
const workspaceInset = 18;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(value, min));

export default function WorkspacePanels({ panel, content, children, onClose, onBack }: Props) {
  const titleId = useId();
  const workspace = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [desktop, setDesktop] = useState(false);
  const [workspaceWidth, setWorkspaceWidth] = useState(0);
  const [layoutChoice, setLayoutChoice] = useState<{ id: string; value: Layout } | null>(null);
  const [widths, setWidths] = useState<Record<PanelInfo["kind"], number>>({ archive: 620, evidence: 470, form: 480 });
  const panelId = panel?.id;
  const panelKind = panel?.kind;
  const splitAvailable = desktop && workspaceWidth >= minPanel + minWorkspace + separatorWidth + workspaceInset;
  const defaultLayout = panelKind === "form" ? "center" : "split";
  const choice = layoutChoice?.id === panelId ? layoutChoice?.value ?? defaultLayout : defaultLayout;
  let layout: Layout = choice;
  if (!desktop && layout !== "expanded") layout = "sheet";
  else if (layout === "sheet" || (layout === "split" && !splitAvailable)) layout = "center";
  const modal = Boolean(panel) && layout !== "split";
  const maxWidth = Math.max(minPanel, workspaceWidth - minWorkspace - separatorWidth - workspaceInset);
  const panelWidth = clamp(panelKind ? widths[panelKind] : widths.archive, minPanel, maxWidth);

  useLayoutEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => {
      setDesktop(media.matches);
      if (workspace.current) setWorkspaceWidth(workspace.current.clientWidth);
    };
    update();
    media.addEventListener("change", update);
    const observer = new ResizeObserver(update);
    if (workspace.current) observer.observe(workspace.current);
    return () => {
      media.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    if (panelId) {
      title.current?.focus({ preventScroll: true });
      if (body.current) body.current.scrollTop = 0;
    } else {
      setLayoutChoice(null);
    }
  }, [panelId]);

  useEffect(() => {
    if (!panelId) return;
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [panelId, onClose]);

  useEffect(() => {
    if (!modal) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusInside = (event: FocusEvent) => {
      if (surface.current && !surface.current.contains(event.target as Node)) {
        title.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("focusin", focusInside);
    if (!surface.current?.contains(document.activeElement)) title.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("focusin", focusInside);
    };
  }, [modal]);

  function resize(next: number) {
    if (panelKind) setWidths((current) => ({ ...current, [panelKind]: clamp(next, minPanel, maxWidth) }));
  }

  function keepFocus(event: KeyboardEvent<HTMLElement>) {
    if (!modal || event.key !== "Tab") return;
    const controls = [...(surface.current?.querySelectorAll<HTMLElement>(
      'button, a[href], input, textarea, select, [tabindex]',
    ) ?? [])].filter((element) => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    const outsideControls = !controls.includes(document.activeElement as HTMLElement);
    const boundary = event.shiftKey ? first : last;
    if (outsideControls || document.activeElement === boundary) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus({ preventScroll: true });
    }
  }

  const availableLayouts = desktop ? desktopLayouts : compactLayouts;

  return (
    <div
      className="g-panel-layout"
      data-layout={panel ? layout : undefined}
      ref={workspace}
      style={{ "--panel-width": `${panelWidth}px` } as CSSProperties}
    >
      <div className="g-panel-main" inert={modal || undefined}>{children}</div>
      {panel && layout === "split" && (
        <PanelResizeHandle label="调整详情面板宽度" controls={`${titleId}-panel`} side="right"
          min={minPanel} max={maxWidth} value={panelWidth} onResize={resize} />
      )}
      {panel && <div className="g-panel-host">
        {modal && <div className="g-panel-scrim" aria-hidden="true" />}
        <section
          className="g-panel"
          id={`${titleId}-panel`}
          data-kind={panel.kind}
          role={modal ? "dialog" : "region"}
          aria-modal={modal || undefined}
          aria-labelledby={titleId}
          ref={surface}
          onKeyDown={keepFocus}
        >
          <header className="g-panel-header">
            {onBack && <button type="button" className="g-panel-icon" aria-label="返回上一级" onClick={onBack}><ArrowLeft size={17} /></button>}
            <h2 id={titleId} ref={title} tabIndex={-1}>{panel.title}</h2>
            <div className="g-panel-tools" role="group" aria-label="面板布局">
              {availableLayouts.map((value) => {
                const { label, icon: Icon } = layouts[value];
                return <button key={value} type="button" aria-pressed={layout === value}
                  aria-label={`${label}布局`} title={label} disabled={value === "split" && !splitAvailable}
                  onClick={() => setLayoutChoice({ id: panel.id, value })}>
                  <Icon size={15} /><span>{label}</span>
                </button>;
              })}
            </div>
            <button type="button" className="g-panel-icon" aria-label="关闭面板" title="关闭面板" onClick={onClose}><X size={19} /></button>
          </header>
          <div className="g-panel-body" ref={body}>{content}</div>
        </section>
      </div>}
    </div>
  );
}
