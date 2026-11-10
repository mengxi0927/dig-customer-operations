"use client";

import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import PanelResizeHandle from "./panel-resize-handle";

type SettledPhase = "form" | "result";
type Props = {
  phase: SettledPhase | "loading";
  form: ReactNode;
  result: (resetRatio: (() => void) | null) => ReactNode;
};

const gutter = 18;
const minForm = 300;
const minResult = 360;
const splitAt = 780;
const autoRatio = { form: .52, result: .35 };
const clamp = (width: number, max: number) => Math.round(Math.min(max, Math.max(minForm, width)));

export default function AdmissionPanels({ phase, form, result }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const formId = useId();
  const [width, setWidth] = useState(0);
  const [lastSettled, setLastSettled] = useState<SettledPhase>("form");
  const [manualRatios, setManualRatios] = useState<Partial<Record<SettledPhase, number>>>({});
  const focus = phase === "loading" ? lastSettled : phase;
  const split = width >= splitAt;
  const available = width - gutter;
  const maxForm = available - minResult;
  const ratio = manualRatios[focus] ?? autoRatio[focus];
  const formWidth = split ? clamp(available * ratio, maxForm) : 0;
  const adjusted = manualRatios[focus] !== undefined;

  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => setWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (phase !== "loading") setLastSettled(phase);
  }, [phase]);

  function resize(next: number) {
    const ratio = clamp(next, maxForm) / available;
    setManualRatios((current) => ({ ...current, [focus]: ratio }));
  }

  function reset() {
    setManualRatios((current) => ({ ...current, [focus]: undefined }));
    container.current?.querySelector<HTMLElement>(".g-panel-separator")?.focus({ preventScroll: true });
  }

  return (
    <div className="g-two-col g-admission-layout" ref={container}
      data-split={split || undefined}
      style={split ? { "--admission-form-width": `${formWidth}px`, "--admission-gutter": `${gutter}px` } as CSSProperties : undefined}
    >
      <div id={formId} className="g-admission-panel">{form}</div>
      {split && <PanelResizeHandle
        label="调整核查和结果面板宽度" controls={formId} side="left"
        min={minForm} max={maxForm} value={formWidth} onResize={resize} onReset={reset}
      />}
      <div className="g-admission-panel">{result(split && adjusted ? reset : null)}</div>
    </div>
  );
}
