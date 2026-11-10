"use client";

import { useEffect, useMemo, useState } from "react";

type Feature = {
  properties: { name: string; center?: number[]; centroid?: number[] };
  geometry: { type: string; coordinates: number[][][] | number[][][][] };
};
type Shape = { name: string; path: string; position?: [number, number] };
type Props = {
  counts: Record<string, number>;
  selected: string;
  onSelect: (province: string) => void;
  tone?: "glass";
};

const short = (name: string) => name.replace(/特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|省|市/g, "");
const project = ([x, y]: number[]): [number, number] => [(x - 73) * 12 + 24, (54 - y) * 14 + 20];

function projectFeature(feature: Feature): Shape {
  const { geometry, properties } = feature;
  const polygons = geometry.type === "Polygon"
    ? [geometry.coordinates as number[][][]]
    : geometry.coordinates as number[][][][];
  const path = polygons.map((polygon) => polygon.map((ring) =>
    ring.map((point, index) => `${index ? "L" : "M"}${project(point).join(",")}`).join(" ") + "Z",
  ).join(" ")).join(" ");
  const center = properties.centroid || properties.center;
  return { name: short(properties.name), path, position: center ? project(center) : undefined };
}

export function CustomerMap({ counts, selected, onSelect, tone }: Props) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [error, setError] = useState(false);
  const [hovered, setHovered] = useState("");
  const [focused, setFocused] = useState("");
  const shapes = useMemo(() => features.map(projectFeature), [features]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/maps/china.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw Error();
        return response.json();
      })
      .then((data) => setFeatures(data.features))
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, []);

  const previewName = hovered || focused;
  const selectedShape = selected ? shapes.find((shape) => shape.name === selected) : undefined;
  const preview = previewName ? shapes.find((shape) => shape.name === previewName) : undefined;
  const focusShape = focused && focused !== preview?.name && focused !== selected
    ? shapes.find((shape) => shape.name === focused)
    : undefined;
  const glass = tone === "glass";
  const outlineColor = "var(--palette-blue-ink)";
  const maxCount = Math.max(1, ...Object.values(counts));

  function provinceFill(name: string) {
    const count = counts[name] || 0;
    if (name === selected && name) return outlineColor;
    if (name && (name === hovered || name === focused)) return "color-mix(in srgb, var(--palette-blue) 44%, var(--palette-gray))";
    if (!count) return "var(--palette-gray)";
    const strength = Math.sqrt(count / maxCount);
    return `color-mix(in srgb, var(--palette-blue) ${14 + strength * (glass ? 73 : 86)}%, var(--palette-gray))`;
  }

  return (
    <div>
      {error ? (
        <p className="p-16 text-center text-slate-500">地图加载失败，请刷新页面；仍可使用区域列表筛选。</p>
      ) : (
        <svg viewBox="0 0 820 570" className="w-full" role="group" aria-label="中国客户省级分布地图">
          {shapes.map(({ name, path }, index) => {
            const region = <path d={path} fill={provinceFill(name)} stroke="#cbd5e1" strokeWidth={.8}
              strokeLinejoin="round" vectorEffect="non-scaling-stroke"
              className="motion-safe:transition-colors motion-safe:duration-150" />;
            if (!name) return <g key={index}>{region}</g>;
            const count = counts[name] || 0;
            const pressed = selected === name;
            const toggle = () => onSelect(pressed ? "" : name);
            return (
              <g key={index} role="button" tabIndex={0} aria-label={`${name}，${count}家客户`}
                aria-pressed={pressed} className="cursor-pointer outline-none"
                onPointerEnter={(event) => { if (event.pointerType !== "touch") setHovered(name); }}
                onPointerLeave={() => setHovered((current) => current === name ? "" : current)}
                onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) setFocused(name); }}
                onBlur={() => setFocused((current) => current === name ? "" : current)}
                onClick={toggle}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggle();
                  }
                }}
              >
                {region}
              </g>
            );
          })}
          <g aria-hidden="true" pointerEvents="none" fill="none" strokeLinejoin="round" strokeLinecap="round">
            {selectedShape && <path d={selectedShape.path} stroke={outlineColor} strokeWidth={2} vectorEffect="non-scaling-stroke" />}
            {focusShape && <path d={focusShape.path} stroke={outlineColor} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />}
            {preview && preview.name !== selected && (
              <path d={preview.path} stroke={outlineColor} strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
            )}
          </g>
          <g aria-hidden="true" pointerEvents="none">
            {shapes.map(({ name, position }, index) => name && position && (
              <text key={index} x={position[0]} y={position[1]} textAnchor="middle"
                fontSize="9" fontWeight={name === preview?.name ? 650 : 400}
                fill={name === selected ? "white" : "var(--palette-ink)"}>{name}</text>
            ))}
            {preview && (
              <g transform="translate(12 12)">
                <rect width="166" height="32" rx="6" fill="var(--palette-ink)" />
                <text x="11" y="21" fill="white" fontSize="14">
                  {preview.name} · {(counts[preview.name] || 0).toLocaleString("zh-CN")} 家客户
                </text>
              </g>
            )}
          </g>
        </svg>
      )}
      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>点击省份联动客户明细 · 含港澳台及南海诸岛</span>
        <span className="flex items-center gap-2">
          少 <i className="inline-block h-2 w-24 rounded"
            style={{ background: "linear-gradient(90deg, var(--palette-gray), var(--palette-blue))" }} /> 多
        </span>
      </div>
    </div>
  );
}
