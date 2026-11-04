"use client";
import { useEffect, useState } from "react";
type Feature={properties:{name:string;center?:number[];centroid?:number[]};geometry:{type:string;coordinates:number[][][]|number[][][][]}};
const short=(s:string)=>s.replace(/特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|省|市/g,"");
const project=([x,y]:number[])=>[(x-73)*12+24,(54-y)*14+20];
export function CustomerMap({counts,selected,onSelect}:{counts:Record<string,number>;selected:string;onSelect:(s:string)=>void}){
 const [features,setFeatures]=useState<Feature[]>([]);const [error,setError]=useState(false);
 useEffect(()=>{fetch('/maps/china.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>setFeatures(d.features)).catch(()=>setError(true))},[]);
 const max=Math.max(1,...Object.values(counts));
 return <div>{error?<p className="p-16 text-center text-slate-500">地图加载失败，请刷新页面；仍可使用右侧区域列表筛选。</p>:<svg viewBox="0 0 820 570" className="w-full" role="group" aria-label="中国客户省级分布地图">{features.map((f,i)=>{
 const name=short(f.properties.name);const n=counts[name]||0;const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates as number[][][]]:f.geometry.coordinates as number[][][][];
 const d=polygons.map(poly=>poly.map(ring=>ring.map((p,j)=>`${j?'L':'M'}${project(p).join(',')}`).join(' ')+'Z').join(' ')).join(' ');
 const pos=f.properties.centroid||f.properties.center; const fill=(name&&selected===name)?'#1d4ed8':n?`hsl(215 88% ${92- Math.sqrt(n/max)*48}%)`:'#f1f5f9';
 if(!name)return <path key={i} d={d} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={0.8}/>;
 return <g key={i} role="button" tabIndex={0} aria-label={`${name}，${n}家客户`} aria-pressed={selected===name} onClick={()=>onSelect(selected===name?'':name)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(selected===name?'':name)}}} className="cursor-pointer outline-none [&:focus_path]:stroke-blue-700 [&:hover_path]:stroke-blue-600"><title>{name}：{n} 家客户（点击筛选）</title><path d={d} fill={fill} stroke={selected===name?'#1e40af':'#cbd5e1'} strokeWidth={selected===name?2:0.8}/>{pos&&<text x={project(pos)[0]} y={project(pos)[1]} textAnchor="middle" fontSize="9" fill={selected===name?'white':'#475569'} pointerEvents="none">{name}</text>}</g>})}</svg>}<div className="flex items-center justify-between gap-3 text-xs text-slate-400"><span>点击省份联动客户明细 · 含港澳台及南海诸岛</span><span className="flex items-center gap-2">少 <i className="inline-block h-2 w-24 rounded bg-gradient-to-r from-blue-100 to-blue-600"/> 多</span></div></div>
}
