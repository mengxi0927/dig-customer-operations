import { useState, type CSSProperties, type FocusEvent, type PointerEvent } from "react";

type Level = { name: string; count: number; color: string };

const center = 90;
const radius = 73;
const turn = 2 * Math.PI;
const point = (angle: number, r: number) =>
  `${center + r * Math.sin(angle)} ${center - r * Math.cos(angle)}`;

function segmentPath(start: number, end: number, width: number) {
  const outer = radius + width / 2;
  const inner = radius - width / 2;
  const sweep = end - start;
  if (sweep >= turn - 1e-8) {
    return `M ${point(0, outer)} A ${outer} ${outer} 0 0 1 ${point(Math.PI, outer)} A ${outer} ${outer} 0 0 1 ${point(0, outer)} Z M ${point(0, inner)} A ${inner} ${inner} 0 0 0 ${point(Math.PI, inner)} A ${inner} ${inner} 0 0 0 ${point(0, inner)} Z`;
  }
  const gap = Math.min(.014, sweep * .14);
  const from = start + gap;
  const to = end - gap;
  const corner = Math.min(3.4, (to - from) * inner / 4);
  const outerInset = corner / outer;
  const innerInset = corner / inner;
  return [
    `M ${point(from + outerInset, outer)}`,
    `A ${outer} ${outer} 0 ${to - from - 2 * outerInset > Math.PI ? 1 : 0} 1 ${point(to - outerInset, outer)}`,
    `Q ${point(to, outer)} ${point(to, outer - corner)}`,
    `L ${point(to, inner + corner)}`,
    `Q ${point(to, inner)} ${point(to - innerInset, inner)}`,
    `A ${inner} ${inner} 0 ${to - from - 2 * innerInset > Math.PI ? 1 : 0} 0 ${point(from + innerInset, inner)}`,
    `Q ${point(from, inner)} ${point(from, inner + corner)}`,
    `L ${point(from, outer - corner)}`,
    `Q ${point(from, outer)} ${point(from + outerInset, outer)} Z`,
  ].join(" ");
}

export default function CustomerLevelChart({
  levels, total, loading,
}: { levels: Level[]; total: number; loading: boolean }) {
  const [selected, setSelected] = useState("");
  const [hovered, setHovered] = useState("");
  const [focused, setFocused] = useState("");
  const highlighted = [hovered, focused, selected].find(name => levels.some(level => level.name === name));
  const active = levels.find(level => level.name === highlighted);
  let offset = 0;

  function toggle(name: string) {
    setSelected(current => current === name ? "" : name);
  }

  function interaction(name: string) {
    return {
      "aria-pressed": selected === name,
      "data-highlighted": highlighted === name || undefined,
      onPointerEnter: (event: PointerEvent) => {
        if (event.pointerType !== "touch") setHovered(name);
      },
      onPointerLeave: () => setHovered(current => current === name ? "" : current),
      onFocus: (event: FocusEvent) => {
        if (event.currentTarget.matches(":focus-visible")) setFocused(name);
      },
      onBlur: () => setFocused(current => current === name ? "" : current),
      onClick: () => toggle(name),
    };
  }

  return (
    <div className="asset-structure">
      <div className="asset-donut" data-has-highlight={Boolean(highlighted) || undefined}>
        <svg viewBox="0 0 180 180" role="group"
          aria-label={loading ? "正在读取客户总数" : `客户级别分布，共 ${total} 家`}>
          {!levels.length && <circle className="asset-donut-track" cx={center} cy={center} r={radius} />}
          {levels.map(({ name, count, color }) => {
            const start = offset;
            offset += (count / total) * turn;
            const width = name === highlighted ? 24 : name === selected ? 20 : 15;
            return (
              <path key={name} className="asset-donut-segment" d={segmentPath(start, offset, width)} fill={color} fillRule="evenodd"
                role="button" tabIndex={0} aria-label={`${name}，${count} 家客户，占 ${((count / total) * 100).toFixed(1)}%`}
                {...interaction(name)}
                onKeyDown={event => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  if (!event.repeat) toggle(name);
                }}>
                <title>{name} · {count.toLocaleString("zh-CN")} 家</title>
              </path>
            );
          })}
        </svg>
        <div className="asset-donut-center">
          <strong>{loading ? "—" : total.toLocaleString("zh-CN")}</strong>
          <small>{active ? `${active.name} · ${((active.count / total) * 100).toFixed(1)}%` : "家客户"}</small>
        </div>
      </div>
      <div className="asset-level-summary">
        <h3>客户级别结构</h3>
        <p>按飞书客户级别统计</p>
        <div className="asset-legend">
          {levels.map(({ name, count, color }) => (
            <button key={name} type="button" style={{ "--level-color": color } as CSSProperties} {...interaction(name)}>
              <i aria-hidden="true" />
              <span>{name}</span>
              <b>{count.toLocaleString("zh-CN")}</b>
              <small>{((count / total) * 100).toFixed(1)}%</small>
            </button>
          ))}
          {!levels.length && <p className="asset-empty">{loading ? "正在读取级别…" : "当前筛选无客户"}</p>}
        </div>
      </div>
    </div>
  );
}
