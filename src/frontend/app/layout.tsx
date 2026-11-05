import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
export const metadata:Metadata={title:"DIG 客户经营与增长",description:"连接客户需求、增长机会与经营行动"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body><AppShell>{children}</AppShell></body></html>}
