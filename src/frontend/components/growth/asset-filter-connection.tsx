import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type Side = "left" | "right";
type Branch = { key: string; name: string; side: Side; y: number };
const hubY = 106;

function branchesFor(values: string[], side: Side): Branch[] {
  const step = Math.min(27, 124 / Math.max(1, values.length - 1));
  return values.map((name, index) => ({
    key: `${side}:${name}`,
    name,
    side,
    y: hubY + (index - (values.length - 1) / 2) * step,
  }));
}

export default function AssetFilterConnection({ left, right, highlight }: {
  left: string[];
  right: string[];
  highlight: { side: Side; name: string } | null;
}) {
  const branches = useMemo(() => [...branchesFor(left, "left"), ...branchesFor(right, "right")], [left, right]);
  const previous = useRef(branches);
  const [leaving, setLeaving] = useState<Branch[]>([]);
  const liveKeys = new Set(branches.map(branch => branch.key));

  useLayoutEffect(() => {
    const live = new Set(branches.map(branch => branch.key));
    const removed = previous.current.filter(branch => !live.has(branch.key));
    previous.current = branches;
    setLeaving(current => {
      const retained = current.filter(branch => !live.has(branch.key) && !removed.some(item => item.key === branch.key));
      return !removed.length && retained.length === current.length ? current : [...retained, ...removed];
    });
  }, [branches]);

  useEffect(() => {
    if (!leaving.length) return;
    const timer = setTimeout(() => setLeaving([]), 420);
    return () => clearTimeout(timer);
  }, [leaving]);

  const shown = [...branches, ...leaving.filter(branch => !liveKeys.has(branch.key))];
  const active = (branch: Branch) => highlight?.side === branch.side && highlight.name === branch.name;
  return (
    <div className="asset-filter-connection" aria-hidden="true">
      <svg className="asset-filter-bridge" viewBox="0 0 100 200" preserveAspectRatio="none">
        {!left.length && <path className="asset-filter-guide" d={`M 0 ${hubY} H 50`} />}
        {!right.length && <path className="asset-filter-guide" d={`M 100 ${hubY} H 50`} />}
        {shown.map(branch => {
          const from = branch.side === "left" ? 0 : 100;
          const control = branch.side === "left" ? 23 : 77;
          return <path key={branch.key} className="asset-filter-cable" pathLength={1}
            data-exiting={!liveKeys.has(branch.key) || undefined} data-highlighted={active(branch) || undefined}
            d={`M ${from} ${branch.y} C ${control} ${branch.y}, ${control} ${hubY}, 50 ${hubY}`} />;
        })}
      </svg>
      <span className="asset-filter-junction" style={{ top: `${hubY / 2}%` }} data-connected={branches.length > 0}>
        {branches.length > 0 && <span className="asset-filter-snap" key={JSON.stringify(branches.map(branch => branch.key))} />}
      </span>
      {shown.map(branch => {
        const exiting = !liveKeys.has(branch.key);
        return <span key={branch.key} className="asset-filter-socket" data-side={branch.side}
          data-exiting={exiting || undefined} data-highlighted={active(branch) || undefined} style={{ top: `${branch.y / 2}%` }} />;
      })}
      {leaving.filter(branch => !liveKeys.has(branch.key)).map(branch => (
        <span key={branch.key} className="asset-filter-loose-plug" data-side={branch.side} style={{ top: `${hubY / 2}%` }} />
      ))}
    </div>
  );
}
