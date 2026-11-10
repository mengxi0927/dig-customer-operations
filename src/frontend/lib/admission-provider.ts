import "server-only";
import { createHash } from "node:crypto";
import type { AdmissionFacts } from "./growth-engine";
// Direct query is opt-in and only runs on the explicit customer-check action.
export async function queryAdmission(name: string): Promise<AdmissionFacts> {
  const key = process.env.DIG_QCC_API_KEY,
    secret = process.env.DIG_QCC_API_SECRET;
  if (!key || !secret) throw Error("credentials");
  const stamp = Math.floor(Date.now() / 1000).toString();
  const url = new URL("https://api.qichacha.com/RiskControl/Scan");
  url.searchParams.set("key", key);
  url.searchParams.set("searchKey", name);
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Timespan: stamp,
      Token: createHash("md5")
        .update(key + stamp + secret)
        .digest("hex")
        .toUpperCase(),
    },
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw Error("provider");
  const payload = await response.json();
  if (String(payload.Status) !== "200") throw Error("provider");
  const data = payload.Result?.Data || payload.Result;
  if (!data || data.Name?.trim() !== name.trim() || !data.CreditCode)
    throw Error("identity");
  const checks = [
    "ShiXin",
    "ZhiXing",
    "AdminPenalty",
    "Exception",
    "SeriousIllegal",
    "Bankruptcy",
    "TaxIllegal",
  ];
  const labels = [
    "失信被执行",
    "被执行",
    "行政处罚",
    "经营异常",
    "严重违法",
    "破产重整",
    "税收违法",
  ];
  const risks: string[] = [];
  const totals = checks.map((k, i) => {
    const v = data[k];
    const raw = v?.Total ?? v?.Count;
    const total =
      typeof raw === "number"
        ? raw
        : typeof raw === "string" && /^\d+$/.test(raw)
          ? Number(raw)
          : null;
    if (total !== null && total > 0)
      risks.push(`${labels[i]} ${total} 条，需核实发生时间及处置状态`);
    return total;
  });
  return {
    name: data.Name,
    creditCode: data.CreditCode,
    status: typeof data.Status === "string" ? data.Status : "",
    small: data.IsSmall === "1" ? "是" : data.IsSmall === "0" ? "否" : "未知",
    complete:
      totals.every((n) => n !== null) && ["0", "1"].includes(data.IsSmall),
    fresh: true,
    risks,
  };
}
