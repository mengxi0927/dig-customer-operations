import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
export const metadata:Metadata={title:"客户智盾",description:"企业客户准入与风险监控平台"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body><AppShell>{children}</AppShell></body></html>}
