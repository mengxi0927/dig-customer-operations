"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Users, UserPlus, ShieldCheck, Bell, Search, HelpCircle, ChartNoAxesCombined } from "lucide-react";
import { cn } from "@/lib/utils";

const nav=[{href:"/",label:"客户全景驾驶舱",icon:LayoutDashboard},{href:"/customers/new",label:"客户准入",icon:UserPlus},{href:"/insights",label:"客户洞察",icon:ChartNoAxesCombined}];
export function AppShell({children}:{children:React.ReactNode}) { const path=usePathname(); return <div className="min-h-screen bg-[#f5f7fb] text-ink">
  <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-[#111b33] text-white lg:block">
    <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500"><ShieldCheck size={21}/></span><div><p className="font-semibold tracking-tight">客户智盾</p><p className="text-[10px] tracking-[.16em] text-slate-400">CUSTOMER OPERATIONS</p></div></div>
    <nav className="space-y-1 p-4">{nav.map(({href,label,icon:Icon})=>{const active=href==="/"?path===href:href==="/customers"?path.startsWith(href)&&path!=="/customers/new":path===href;return <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/10",active&&"bg-blue-600 text-white shadow-lg shadow-blue-950/20")}><Icon size={18}/>{label}</Link>})}</nav>
    <div className="absolute bottom-5 left-4 right-4 rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-medium text-slate-300">数据服务</p><p className="mt-2 flex items-center gap-2 text-xs text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400"/>企查查真实数据已连接</p></div>
  </aside>
  <div className="lg:pl-64"><header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur md:px-8"><div className="flex items-center gap-2 lg:hidden"><Building2 className="text-brand"/><b>客户智盾</b></div><div className="relative hidden w-80 md:block"><Search className="absolute left-3 top-2.5 text-slate-400" size={17}/><input className="h-9 w-full rounded-lg bg-slate-100 pl-10 pr-3 text-sm outline-none" placeholder="搜索客户、编号…"/></div><div className="flex items-center gap-2"><button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><HelpCircle size={19}/></button><button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Bell size={19}/><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500"/></button><span className="ml-2 grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">CM</span></div></header>
    <nav className="flex border-b bg-white px-3 lg:hidden">{nav.map(({href,label})=><Link key={href} className="px-3 py-3 text-xs font-medium text-slate-600" href={href}>{label}</Link>)}</nav>
    <main className="mx-auto max-w-[1440px] p-5 md:p-8">{children}</main>
  </div>
 </div> }
