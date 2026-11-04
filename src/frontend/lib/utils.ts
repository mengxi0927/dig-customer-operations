import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export const riskLabel = { low: "低风险", medium: "中风险", high: "高风险" } as const;
export function dateTime(value?: string) { return value ? new Intl.DateTimeFormat("zh-CN", {month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value)) : "—"; }
