export type Capability = {
  id: string;
  name: string;
  family: string;
  terms: string[];
  evidence: string;
  status: string;
  owner: string;
  limits: string;
};
export const capabilities: Capability[] = [
  {
    id: "data",
    name: "燕云 DaaS / Infinity",
    family: "数据治理",
    terms: [
      "数据治理",
      "数据孤岛",
      "数据整合",
      "主数据",
      "统一指标",
      "异构",
      "数据接入",
    ],
    evidence:
      "燕云 AI First FDE 客户版 0817 · 第8–11页；DIG能力简介 202610 · 第12页",
    status: "产品能力 · 按项目确认范围",
    owner: "数据产品团队",
    limits: "需核实数据源、接口授权、治理范围及交付标准",
  },
  {
    id: "asset",
    name: "神州知了资产智管",
    family: "资产智管",
    terms: [
      "资产盘点",
      "固定资产",
      "RFID",
      "账实",
      "机柜",
      "资产管理",
      "资产全生命周期",
    ],
    evidence: "神州知了产品发布会 20260518 · 第6–9页",
    status: "产品能力 · 已有案例",
    owner: "资产智管团队",
    limits: "需核实资产类型、标签设备与系统集成",
  },
  {
    id: "compute",
    name: "算力维保与迁移服务",
    family: "算力服务",
    terms: [
      "GPU",
      "服务器维保",
      "机房搬迁",
      "设备迁移",
      "液冷",
      "多品牌维保",
      "算力运维",
    ],
    evidence: "DIG能力简介 202610 · 算力服务章节",
    status: "服务能力 · 按地域与资质确认",
    owner: "算力服务团队",
    limits: "需核实品牌授权、服务地域、SLA及施工资质",
  },
  {
    id: "business",
    name: "燕云 × AI First FDE",
    family: "业务智能",
    terms: [
      "库存优化",
      "经营分析",
      "智能问数",
      "工艺异常",
      "设备效率",
      "质量分析",
      "OEE",
    ],
    evidence: "DIG能力简介 202610 · 第16–24页",
    status: "案例与POC · 按场景核验",
    owner: "FDE解决方案团队",
    limits: "部分场景仍在验证或建设中，不代表通用成熟产品",
  },
];
export type Signal = {
  id: string;
  customer: string;
  title: string;
  text: string;
  url: string;
  published: string;
  deadline: string;
  kind: "采购意向" | "招标公告" | "公开动态" | "中标结果";
  createdAt?: string;
};
export type Candidate = Signal & {
  matches: Capability[];
  priority: string;
  reason: string;
};
export function matchSignal(s: Signal, now = new Date()): Candidate {
  const hay = (s.title + " " + s.text).toLowerCase();
  const matches = capabilities.filter((c) =>
    c.terms.some((t) => hay.includes(t.toLowerCase())),
  );
  const expired =
    !!s.deadline &&
    new Date(s.deadline + "T23:59:59+08:00").getTime() < now.getTime();
  const future =
    new Date(s.published + "T00:00:00+08:00").getTime() > now.getTime();
  const validDate =
    !!s.published && Number.isFinite(new Date(s.published).getTime());
  const priority =
    s.kind === "中标结果"
      ? "采购已结束"
      : expired
        ? "已过截止时间"
        : future || !validDate
          ? "日期待核实"
          : !matches.length
            ? "能力待核实"
            : s.kind === "公开动态"
              ? "方向待验证"
              : "优先验证";
  return {
    ...s,
    matches,
    priority,
    reason: matches.length
      ? `原文包含 ${matches.flatMap((c) => c.terms.filter((t) => hay.includes(t.toLowerCase()))).join("、")}；需核实主体和资格条件`
      : "未命中现有能力目录，请人工核实",
  };
}
export function signalKey(s: Signal) {
  return s.url.trim().replace(/\/$/, "") + "|" + s.customer.trim();
}
export type AdmissionFacts = {
  name: string;
  creditCode: string;
  status: string;
  small: string;
  complete: boolean;
  fresh: boolean;
  risks: string[];
};
export function assessAdmission(f: AdmissionFacts, policyApproved = false) {
  const reasons: string[] = [];
  const blocked = /注销|吊销|撤销/.test(f.status);
  if (!f.creditCode) reasons.push("统一社会信用代码缺失，主体待核实");
  if (!f.complete) reasons.push("必查数据不完整，不能按无风险处理");
  if (!f.fresh) reasons.push("核查数据已过期或有效期未知");
  if (blocked) reasons.push("登记状态命中自动准入拦截项");
  if (f.risks.length) reasons.push(...f.risks);
  if (!policyApproved) reasons.push("自动准入政策尚未启用，结果仅供复核");
  const score =
    f.complete && f.fresh && !!f.creditCode
      ? Math.max(
          0,
          100 - (blocked ? 100 : 0) - Math.min(60, f.risks.length * 20),
        )
      : null;
  const pass =
    policyApproved &&
    f.complete &&
    f.fresh &&
    !!f.creditCode &&
    !!f.status &&
    !blocked &&
    !f.risks.length;
  return {
    decision: blocked ? "停止自动准入" : pass ? "规则校验通过" : "需人工复核",
    score,
    reasons: reasons.length
      ? reasons
      : ["主体明确、数据齐全且有效，未命中已配置拦截规则"],
    ruleVersion: "admission-pilot-1",
    small: f.small || "未知",
    facts: f,
  };
}
