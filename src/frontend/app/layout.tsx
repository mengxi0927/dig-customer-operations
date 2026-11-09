import type { Metadata } from "next";
import "./globals.css";
import { PrototypeBoundary } from "@/components/prototype/prototype-boundary";
export const metadata:Metadata={title:"DIG · 客户增长工作台",description:"把时间留给客户，让每一次连接带来增长。DIG 客户经营平台交互原型。"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body><PrototypeBoundary>{children}</PrototypeBoundary></body></html>}
