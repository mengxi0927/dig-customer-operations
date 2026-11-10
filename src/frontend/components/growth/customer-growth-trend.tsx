import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";

type TrendPoint = { month: string; added: number; total: number };
type Series = "added" | "total";
type Highlight = { month: string; series: Series };

const chartWidth = 820;
const chartBoxHeight = 288;
const chartBase = 224;
const chartHeight = 182;
const formatCount = (value: number) => value.toLocaleString("zh-CN");

export default function CustomerGrowthTrend({ points }: { points: TrendPoint[] }) {
  const gradientId = useId();
  const lineClipId = useId();
  const tooltipId = useId();
  const plot = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Highlight | null>(null);
  const [focus, setFocus] = useState<Highlight | null>(null);
  const highlight = hover ?? focus;
  const maxAdded = Math.max(1, ...points.map(point => point.added));
  const maxTotal = Math.max(1, ...points.map(point => point.total));
  const barMotion = (index: number) => ({
    "--bar-delay": `${index * 25}ms`,
    "--bar-reverse-delay": `${(points.length - 1 - index) * 14}ms`,
  } as CSSProperties);
  const chartPoints = points.map((point, i) => {
    const barHeight = (point.added / maxAdded) * chartHeight;
    const totalY = chartBase - (point.total / maxTotal) * chartHeight;
    const addedY = barHeight >= 16 ? chartBase - barHeight / 2
      : point.added ? chartBase - barHeight - 10 : chartBase + 12;
    const totalLabelY = totalY - 15;
    return {
      ...point,
      x: 76 + i * (668 / Math.max(1, points.length - 1)),
      barHeight, totalY, addedY,
      totalLabelY: Math.abs(totalLabelY - addedY) < 19 ? addedY - 21 : totalLabelY,
    };
  });
  const slopes = chartPoints.slice(1).map((point, i) =>
    (point.totalY - chartPoints[i].totalY) / (point.x - chartPoints[i].x));
  const tangents = chartPoints.map((_, i) => {
    const left = slopes[i - 1] ?? slopes[i] ?? 0;
    const right = slopes[i] ?? left;
    return left * right > 0 ? Math.sign(left) * Math.min(Math.abs(left), Math.abs(right)) : 0;
  });
  const trendLine = chartPoints.map(({ x, totalY }, i) => {
    if (!i) return `M ${x} ${totalY}`;
    const previous = chartPoints[i - 1];
    const dx = (x - previous.x) / 3;
    return `C ${previous.x + dx} ${previous.totalY + tangents[i - 1] * dx}, ${x - dx} ${totalY - tangents[i] * dx}, ${x} ${totalY}`;
  }).join(" ");
  const active = chartPoints.find(point => point.month === highlight?.month);
  const anchorX = active?.x;
  const anchorY = active && (highlight?.series === "added" ? chartBase - active.barHeight : active.totalY);

  useLayoutEffect(() => {
    const surface = plot.current;
    const scrollArea = scroller.current;
    const chart = svg.current;
    const tip = tooltip.current;
    if (!surface || !scrollArea || !chart || !tip || anchorX === undefined || anchorY === undefined) return;
    const place = () => {
      const area = surface.getBoundingClientRect();
      const bounds = chart.getBoundingClientRect();
      const visible = scrollArea.getBoundingClientRect();
      const pageX = bounds.left + anchorX / chartWidth * bounds.width;
      const x = pageX - area.left;
      const y = bounds.top + anchorY / chartBoxHeight * bounds.height - area.top;
      const { offsetWidth: width, offsetHeight: height } = tip;
      const left = x + width + 18 < area.width ? x + 12 : x - width - 12;
      tip.style.left = `${Math.max(6, Math.min(area.width - width - 6, left))}px`;
      tip.style.top = `${Math.max(4, Math.min(area.height - height - 4, y - height / 2))}px`;
      tip.style.visibility = pageX >= visible.left && pageX <= visible.right ? "visible" : "hidden";
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(surface);
    scrollArea.addEventListener("scroll", place, { passive: true });
    return () => {
      observer.disconnect();
      scrollArea.removeEventListener("scroll", place);
    };
  }, [anchorX, anchorY, active?.added, active?.total]);

  function showHover(month: string, series: Series) {
    setHover(current => current?.month === month && current.series === series ? current : { month, series });
  }

  function hoverLine(event: PointerEvent<SVGPathElement>) {
    const bounds = svg.current?.getBoundingClientRect();
    if (!bounds?.width || event.pointerType === "touch") return;
    const x = (event.clientX - bounds.left) / bounds.width * chartWidth;
    const nearest = chartPoints.reduce((best, point) =>
      Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best);
    showHover(nearest.month, "total");
  }

  function interaction(point: TrendPoint, series: Series) {
    const label = series === "added" ? "每月新增客户" : "累计客户";
    return {
      role: "graphics-symbol",
      tabIndex: 0,
      "aria-label": `${point.month}，${label} ${formatCount(point[series])} 家`,
      "aria-describedby": highlight?.month === point.month && highlight.series === series ? tooltipId : undefined,
      onPointerEnter: (event: PointerEvent<SVGElement>) => {
        if (event.pointerType !== "touch") showHover(point.month, series);
      },
      onPointerLeave: () => setHover(current => current?.month === point.month && current.series === series ? null : current),
      onFocus: () => { setHover(null); setFocus({ month: point.month, series }); },
      onBlur: () => setFocus(null),
    };
  }

  return (
    <div className="asset-trend-plot" ref={plot}>
      <div className="asset-trend-chart" data-period={points.length} ref={scroller}
        onKeyDown={event => {
          if (event.key !== "Escape" || !highlight) return;
          event.stopPropagation();
          setHover(null);
          setFocus(null);
        }}>
        <svg ref={svg} viewBox={`0 0 ${chartWidth} ${chartBoxHeight}`} role="group" aria-label="客户增长趋势图">
          <defs>
            <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="var(--asset-trend-bar)" stopOpacity=".78" />
              <stop offset="100%" stopColor="var(--asset-trend-bar)" stopOpacity=".24" />
            </linearGradient>
            <clipPath id={lineClipId}>
              <rect className="asset-trend-sweep" width={chartWidth} height={chartBoxHeight} />
            </clipPath>
          </defs>
          {[0, 1, 2, 3, 4].map(i => {
            const y = chartBase - (i / 4) * chartHeight;
            return <g key={i} aria-hidden="true">
              <line x1="54" x2="766" y1={y} y2={y} stroke={i === 0 ? "#d5deeb" : "#e5ecf5"} />
              <text x="45" y={y + 5} textAnchor="end">{Math.round(maxAdded * i / 4)}</text>
              <text x="775" y={y + 5}>{Math.round(maxTotal * i / 4)}</text>
            </g>;
          })}
          {active && <line className="asset-trend-guide" x1={active.x} x2={active.x} y1="42" y2={chartBase} aria-hidden="true" />}
          {chartPoints.map(({ month, x, barHeight }, index) => (
            <g key={month} aria-hidden="true">
              <rect className="asset-trend-bar" data-highlighted={highlight?.month === month && highlight.series === "added" || undefined}
                style={barMotion(index)}
                fill={`url(#${gradientId})`} x={x - 18} y={chartBase - barHeight} width="36" height={barHeight} rx="4" />
              <text x={x} y="264" textAnchor="middle">{month}</text>
            </g>
          ))}
          <g clipPath={`url(#${lineClipId})`} aria-hidden="true">
            <path className="asset-trend-line" data-highlighted={active && highlight?.series === "total" || undefined} d={trendLine} />
            {chartPoints.map(point => (
              <g key={point.month}>
                <circle className="asset-trend-point" data-highlighted={highlight?.month === point.month && highlight.series === "total" || undefined}
                  cx={point.x} cy={point.totalY} r="4" />
                <text className="asset-trend-total" x={point.x} y={point.totalLabelY} dominantBaseline="central" textAnchor="middle">{point.total}</text>
              </g>
            ))}
          </g>
          {chartPoints.map((point, index) => (
            <text key={point.month} className="asset-trend-added" x={point.x} y={point.addedY} dominantBaseline="central" textAnchor="middle"
              style={barMotion(index)} aria-hidden="true">{point.added}</text>
          ))}
          {chartPoints.map((point, index) => {
            const height = Math.max(16, point.barHeight);
            return <rect key={point.month} className="asset-trend-hit asset-trend-bar-hit" x={point.x - 18} y={chartBase - height} width="36" height={height}
              style={barMotion(index)}
              {...interaction(point, "added")} />;
          })}
          <g clipPath={`url(#${lineClipId})`}>
            <path className="asset-trend-line-hit" d={trendLine} aria-hidden="true"
              onPointerEnter={hoverLine} onPointerMove={hoverLine}
              onPointerLeave={() => setHover(current => current?.series === "total" ? null : current)} />
            {chartPoints.map(point => (
              <circle key={point.month} className="asset-trend-hit" cx={point.x} cy={point.totalY} r="10"
                {...interaction(point, "total")} />
            ))}
          </g>
        </svg>
      </div>
      {active && <div className="asset-trend-tooltip" id={tooltipId} role="tooltip" ref={tooltip}>
        <strong>{active.month}</strong>
        <span data-series="added" data-highlighted={highlight?.series === "added" || undefined}>
          <i aria-hidden="true" />每月新增 <b>{formatCount(active.added)} 家</b>
        </span>
        <span data-series="total" data-highlighted={highlight?.series === "total" || undefined}>
          <i aria-hidden="true" />累计客户 <b>{formatCount(active.total)} 家</b>
        </span>
      </div>}
    </div>
  );
}
