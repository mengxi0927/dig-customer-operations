import { authorized } from "@/lib/dig-access";
import type { Signal } from "@/lib/growth-engine";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A server-configured licensed feed. The URL is never accepted from the browser.
export async function GET(request: Request) {
  if (!authorized(request))
    return Response.json({ message: "无数据访问权限" }, { status: 403 });
  if (!process.env.DIG_SIGNAL_FEED_URL)
    return Response.json({
      signals: [],
      configured: false,
      message: "自动订阅尚未配置，可导入已核实的公开公告。",
    });
  try {
    const r = await fetch(process.env.DIG_SIGNAL_FEED_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: process.env.DIG_SIGNAL_FEED_TOKEN
        ? { Authorization: `Bearer ${process.env.DIG_SIGNAL_FEED_TOKEN}` }
        : {},
    });
    if (!r.ok) throw Error();
    const data = await r.json();
    if (!Array.isArray(data) || data.length > 1000) throw Error();
    const signals: Signal[] = data.filter(
      (s: Signal) =>
        typeof s.id === "string" &&
        typeof s.customer === "string" &&
        typeof s.title === "string" &&
        typeof s.text === "string" &&
        typeof s.url === "string" &&
        /^https?:\/\//.test(s.url) &&
        typeof s.published === "string" &&
        typeof s.deadline === "string" &&
        ["采购意向", "招标公告", "公开动态", "中标结果"].includes(s.kind),
    );
    return Response.json(
      {
        signals,
        configured: true,
        rejected: data.length - signals.length,
        fetchedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      { message: "订阅读取失败，保留已有名单，请稍后重试。" },
      { status: 503 },
    );
  }
}
