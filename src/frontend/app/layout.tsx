import type { Metadata } from "next";
import "./globals.css";
import { PrototypeBoundary } from "@/components/prototype/prototype-boundary";
export const metadata:Metadata={title:"DIG · 客户智能经营",description:"新客户准入核查、客户价值分层与老客户增长机会。"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body><PrototypeBoundary>{children}</PrototypeBoundary></body></html>}
