import { getDigOverview } from "@/lib/dig-source";
import { existingCustomerResult } from "@/lib/existing-customer";
import { queryAdmission } from "@/lib/admission-provider";
import { authorized } from "@/lib/dig-access";
import { getDigQcc } from "@/lib/dig-qcc";
import { assessAdmission } from "@/lib/growth-engine";
import { exactCompanyName } from "@/lib/dig-qcc-types";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!authorized(request))
    return Response.json({ message: "无数据访问权限" }, { status: 403 });
  try {
    const body = await request.json();
    if (
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.length > 200
    )
      return Response.json(
        { message: "请填写完整企业名称（不超过200字）" },
        { status: 400 },
      );
    const name = body.name.trim();
    // A failed directory lookup must never be treated as a new customer.
    let overview;
    try { overview = await getDigOverview(); } catch {
      return Response.json({ message: "客户查重暂不可用，请稍后重试；尚未进行新客户准入核查" }, { status: 503 });
    }
    const existing = existingCustomerResult(name, overview);
    if (existing || body.lookupOnly === true) {
      return Response.json(existing || { existing: false }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (process.env.DIG_QCC_LIVE_ENABLED === "true") {
      try {
        const facts = await queryAdmission(name);
        return Response.json(
          {
            ...assessAdmission(facts),
            source: "企查查实时查询",
            checkedAt: new Date().toISOString(),
            notice: "实时结果仅供准入复核；正式自动准入政策尚未启用。",
          },
          { headers: { "Cache-Control": "private, no-store" } },
        );
      } catch {
        return Response.json(
          {
            message:
              "企查查实时查询未完成或主体无法精确确认，请人工核实。未作准入判断。",
          },
          { status: 503 },
        );
      }
    }
    const q = await getDigQcc();
    const ps = q.profiles.filter(
      (p) => exactCompanyName(p.name) === exactCompanyName(name),
    );
    const codes = new Set(ps.map((p) => p.creditCode).filter(Boolean));
    const p =
      codes.size === 1
        ? ps
            .filter((p) => p.creditCode)
            .sort((a, b) => b.cachedAt.localeCompare(a.cachedAt))[0]
        : undefined;
    const risk = q.risks.filter(
      (r) => p?.creditCode && r.creditCode === p.creditCode,
    );
    // Existing archives do not certify complete current checks. Never infer low risk from absence.
    const result = assessAdmission({
      name,
      creditCode: p?.creditCode || "",
      status: p?.status || "",
      small: "未知",
      complete: false,
      fresh: !!p?.expiresAt && new Date(p.expiresAt) > new Date(),
      risks: risk.flatMap((r) => r.risks.map((x) => x.title)),
    });
    return Response.json(
      {
        ...result,
        source: "企查查缓存与已保存评估",
        checkedAt: new Date().toISOString(),
        notice:
          "已读取存档；当前存档不含完整的小微与必查项，不作正式自动审批。",
        errors: [q.databaseError, q.riskError].filter(Boolean),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      { message: "核查未完成，请稍后重试；未作准入判断" },
      { status: 503 },
    );
  }
}
