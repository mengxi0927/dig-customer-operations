"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

type Props = {
  label: string;
  controls: string;
  side: "left" | "right";
  value: number;
  min: number;
  max: number;
  onResize: (width: number) => void;
  onReset?: () => void;
};

export default function PanelResizeHandle({ label, controls, side, value, min, max, onResize, onReset }: Props) {
  const drag = useRef<{ start: number; width: number } | null>(null);
  const [resizing, setResizing] = useState(false);
  const direction = side === "left" ? 1 : -1;

  function start(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    const element = event.currentTarget;
    const panel = side === "left" ? element.previousElementSibling : element.nextElementSibling;
    drag.current = { start: event.clientX, width: panel?.getBoundingClientRect().width ?? value };
    element.setPointerCapture(event.pointerId);
    setResizing(true);
    event.preventDefault();
    element.focus({ preventScroll: true });
  }

  function end() {
    drag.current = null;
    setResizing(false);
  }

  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    const step = (event.shiftKey ? 80 : 24) * direction;
    const widths: Record<string, number> = {
      ArrowLeft: value - step,
      ArrowRight: value + step,
      Home: min,
      End: max,
    };
    const next = widths[event.key];
    if (typeof next !== "number") return;
    event.preventDefault();
    onResize(next);
  }

  return (
    <div
      className="g-panel-separator"
      data-resizing={resizing || undefined}
      role="separator"
      aria-label={label}
      aria-controls={controls}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      title={onReset ? "拖动调整宽度，双击恢复自动比例" : "拖动或使用方向键调整宽度"}
      tabIndex={0}
      onPointerDown={start}
      onPointerMove={(event) => {
        if (drag.current && event.currentTarget.hasPointerCapture(event.pointerId)) {
          onResize(drag.current.width + (event.clientX - drag.current.start) * direction);
        }
      }}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onKeyDown={keyboard}
      onDoubleClick={onReset}
    />
  );
}
