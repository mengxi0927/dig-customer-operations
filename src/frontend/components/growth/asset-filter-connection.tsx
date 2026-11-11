import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { AssetFilterSelection } from "./customer-asset-filters";

type Side = "left" | "right";
type Branch = { key: string; name: string; side: Side; y: number };
const hubY = 106;
const fan = "M 0 8 C 19 11 24 63 34 87 Q 40 101 50 104 L 50 108 Q 40 112 34 125 C 24 149 19 191 0 194 C 12 173 17 126 1 106 C 17 86 12 29 0 8 Z";
const lanes = [39, 62, 85, 123, 147, 173];

function FilterFlow({ channel, spread, moving }: { channel: boolean; spread: boolean; moving: boolean }) {
  const id = useId();
  const clipId = `${id}-clip`;
  const shape = channel
    ? <rect x="0" y="8" width="100" height="186" rx="3" />
    : <path d={fan} />;
  return (
    <g transform={spread ? "translate(100 0) scale(-1 1)" : undefined}>
      <defs>
        <linearGradient id={id} x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="var(--risk)" stopOpacity={channel ? ".48" : ".17"} />
          <stop offset="100%" stopColor="var(--risk)" stopOpacity={channel ? ".19" : ".62"} />
        </linearGradient>
        <clipPath id={clipId}>{shape}</clipPath>
      </defs>
      <g className={`asset-filter-area ${channel ? "asset-filter-channel" : "asset-filter-fan"}`}
        data-flow={channel ? "channel" : spread ? "spread" : "converge"} fill={`url(#${id})`}>
        {shape}
        {moving && <g className="asset-filter-particles" clipPath={`url(#${clipId})`}>
          {lanes.map((y, index) => {
            const start = `11 ${y}`;
            const tip = `50 ${hubY}`;
            const bend = `25 ${y}`;
            const nearTip = `35 ${hubY}`;
            const path = channel ? `M 1 ${y} H 99`
              : spread ? `M ${tip} C ${nearTip}, ${bend}, ${start}`
                : `M ${start} C ${bend}, ${nearTip}, ${tip}`;
            const duration = `${1.35 + (index % 3) * .27}s`;
            const phase = `-${.19 + index * .24}s`;
            return (
              <ellipse key={y} className="asset-filter-particle" data-accent={index % 3 === 1 || undefined}
                rx={index % 2 ? 3.4 : 2.4} ry={index % 2 ? 1.45 : 1.1} opacity="0">
                <animateMotion path={path} dur={duration} begin={phase} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;.9;.65;0" keyTimes="0;.22;.72;1"
                  dur={duration} begin={phase} repeatCount="indefinite" />
              </ellipse>
            );
          })}
        </g>}
      </g>
    </g>
  );
}

function branchesFor(values: AssetFilterSelection, side: Side): Branch[] {
  if (!values) return [];
  const step = Math.min(27, 124 / Math.max(1, values.length - 1));
  return values.map((name, index) => ({
    key: `${side}:${name}`,
    name,
    side,
    y: hubY + (index - (values.length - 1) / 2) * step,
  }));
}

export default function AssetFilterConnection({ left, right, highlight, moving }: {
  left: AssetFilterSelection;
  right: AssetFilterSelection;
  highlight: { side: Side; name: string } | null;
  moving: boolean;
}) {
  const branches = useMemo(() => [...branchesFor(left, "left"), ...branchesFor(right, "right")], [left, right]);
  const previous = useRef(branches);
  const [leaving, setLeaving] = useState<Branch[]>([]);
  const leftAll = left === null;
  const rightAll = right === null;
  const channel = leftAll && rightAll;
  const liveKeys = new Set(branches.map(branch => branch.key));

  useLayoutEffect(() => {
    const live = new Set(branches.map(branch => branch.key));
    const stillHasLines = (branch: Branch) => branch.side === "left" ? !leftAll : !rightAll;
    const removed = previous.current.filter(branch => stillHasLines(branch) && !live.has(branch.key));
    previous.current = branches;
    setLeaving(current => {
      const retained = current.filter(branch => stillHasLines(branch) && !live.has(branch.key) && !removed.some(item => item.key === branch.key));
      return !removed.length && retained.length === current.length ? current : [...retained, ...removed];
    });
  }, [branches, leftAll, rightAll]);

  useEffect(() => {
    if (!leaving.length) return;
    const timer = setTimeout(() => setLeaving([]), 420);
    return () => clearTimeout(timer);
  }, [leaving]);

  const departing = leaving.filter(branch => !liveKeys.has(branch.key) && (branch.side === "left" ? !leftAll : !rightAll));
  const shown = [...branches, ...departing];
  const active = (branch: Branch) => highlight?.side === branch.side && highlight.name === branch.name;
  return (
    <div className="asset-filter-connection" aria-hidden="true">
      <svg className="asset-filter-bridge" viewBox="0 0 100 200" preserveAspectRatio="none">
        {(leftAll || rightAll) && <FilterFlow key={channel ? "channel" : leftAll ? "left" : "right"}
          channel={channel} spread={rightAll && !leftAll} moving={moving} />}
        {left?.length === 0 && <path className="asset-filter-guide" d={`M 0 ${hubY} H 50`} />}
        {right?.length === 0 && <path className="asset-filter-guide" d={`M 100 ${hubY} H 50`} />}
        {shown.map(branch => {
          const from = branch.side === "left" ? 0 : 100;
          const control = branch.side === "left" ? 23 : 77;
          return <path key={branch.key} className="asset-filter-cable" pathLength={1}
            data-exiting={!liveKeys.has(branch.key) || undefined} data-highlighted={active(branch) || undefined}
            d={`M ${from} ${branch.y} C ${control} ${branch.y}, ${control} ${hubY}, 50 ${hubY}`} />;
        })}
      </svg>
      {!channel && <span className="asset-filter-junction" style={{ top: `${hubY / 2}%` }}
        data-connected={branches.length > 0 || leftAll || rightAll}>
        {branches.length > 0 && <span className="asset-filter-snap" key={JSON.stringify(branches.map(branch => branch.key))} />}
      </span>}
      {shown.map(branch => {
        const exiting = !liveKeys.has(branch.key);
        return <span key={branch.key} className="asset-filter-socket" data-side={branch.side}
          data-exiting={exiting || undefined} data-highlighted={active(branch) || undefined} style={{ top: `${branch.y / 2}%` }} />;
      })}
      {departing.map(branch => (
        <span key={branch.key} className="asset-filter-loose-plug" data-side={branch.side} style={{ top: `${hubY / 2}%` }} />
      ))}
    </div>
  );
}
