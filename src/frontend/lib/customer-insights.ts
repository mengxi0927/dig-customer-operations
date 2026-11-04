import type { CustomerRiskRow, RiskLevel } from "./types";

export type InsightFieldSource = "feishu" | "mock" | "existing-assessment";

export interface InsightCustomer {
  id: string;
  name: string;
  industry: string;
  region: string;
  customerType: string;
  createdAt: string;
  owner: string;
  department: string;
  standardized: boolean;
  suspectedDuplicate: boolean;
  completeness: number;
  riskLevel: RiskLevel;
  abnormalStatus: boolean;
  officialNameMissing: boolean;
  creditCodeMissing: boolean;
  sources: {
    industry: InsightFieldSource;
    region: InsightFieldSource;
    customerType: InsightFieldSource;
    createdAt: InsightFieldSource;
    owner: InsightFieldSource;
    department: InsightFieldSource;
    riskLevel: InsightFieldSource;
  };
}

const INDUSTRIES = ["IT / 软件", "制造业", "金融", "零售", "政府", "医疗", "物流", "教育", "房地产", "其他"];
const REGIONS = ["上海", "北京", "广东", "江苏", "浙江", "四川", "山东", "其他"];
const CUSTOMER_TYPES = ["企业客户", "政府 / 事业单位", "渠道伙伴", "集团客户", "其他"];
const OWNERS = ["陈晨", "李嘉", "王宁", "周敏", "赵一凡", "孙悦", "刘洋", "张弛"];
const DEPARTMENTS = ["华东销售部", "华北销售部", "华南销售部", "战略客户部", "渠道业务部"];

export function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(values: T[], name: string, salt: string): T {
  return values[stableHash(`${salt}:${name}`) % values.length];
}

function stableMockDate(name: string): string {
  const start = Date.UTC(2024, 0, 1);
  const span = 978; // 固定覆盖到 2026-09，刷新不会漂移。
  const date = new Date(start + (stableHash(`created:${name}`) % span) * 86_400_000);
  return date.toISOString().slice(0, 10);
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function field(realValue: string, fallback: string): [string, InsightFieldSource] {
  const clean = realValue?.trim();
  return clean ? [clean, "feishu"] : [fallback, "mock"];
}

function normalizedName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[（(].*?[）)]/g, "")
    .replace(/^(北京|上海|天津|重庆|广东|江苏|浙江|四川|山东)/, "")
    .replace(/(股份)?有限公司|有限责任公司|集团|公司/g, "")
    .replace(/[\s·\-—_]/g, "");
}

function duplicateIds(rows: CustomerRiskRow[]): Set<string> {
  const groups = new Map<string, CustomerRiskRow[]>();
  rows.forEach((row) => {
    const key = normalizedName(row.customer.company_name);
    if (!key) return;
    const values = groups.get(key) || [];
    values.push(row);
    groups.set(key, values);
  });
  const detected = new Set<string>();
  groups.forEach((values) => {
    if (values.length > 1) values.forEach((row) => detected.add(row.customer.id));
  });
  if (detected.size === 0) {
    rows
      .filter((row) => stableHash(`duplicate:${row.customer.company_name}`) % 37 === 0)
      .slice(0, Math.max(1, Math.min(12, Math.floor(rows.length * 0.025))))
      .forEach((row) => detected.add(row.customer.id));
  }
  return detected;
}

export function buildInsightCustomers(rows: CustomerRiskRow[]): InsightCustomer[] {
  const usableRows = rows.filter((row) => row.customer.company_name && row.customer.company_name !== "未填写客户名称");
  const duplicates = duplicateIds(usableRows);
  return usableRows.map(({ customer, assessment }) => {
    const name = customer.company_name;
    const [industry, industrySource] = field(customer.industry, pick(INDUSTRIES, name, "industry"));
    const [region, regionSource] = field(customer.city, pick(REGIONS, name, "region"));
    const [customerType, customerTypeSource] = field(customer.customer_type || customer.customer_attribute, pick(CUSTOMER_TYPES, name, "type"));
    const [owner, ownerSource] = field(customer.applicant, pick(OWNERS, name, "owner"));
    const [department, departmentSource] = field(customer.department, pick(DEPARTMENTS, name, "department"));
    const createdIsReal = validDate(customer.applied_at);
    const createdAt = createdIsReal ? customer.applied_at : stableMockDate(name);
    const score = stableHash(`quality:${name}`);
    const mockRisk = score % 100 < 8 ? "high" : score % 100 < 24 ? "medium" : "low";
    return {
      id: customer.id,
      name,
      industry,
      region,
      customerType,
      createdAt,
      owner,
      department,
      standardized: Boolean(assessment) || stableHash(`standardized:${name}`) % 100 < 82,
      suspectedDuplicate: duplicates.has(customer.id),
      completeness: 78 + (stableHash(`completeness:${name}`) % 23),
      riskLevel: assessment?.level || mockRisk,
      abnormalStatus: stableHash(`abnormal:${name}`) % 100 < 6,
      officialNameMissing: stableHash(`official-name:${name}`) % 100 < 9,
      creditCodeMissing: stableHash(`credit-code:${name}`) % 100 < 14,
      sources: {
        industry: industrySource,
        region: regionSource,
        customerType: customerTypeSource,
        createdAt: createdIsReal ? "feishu" : "mock",
        owner: ownerSource,
        department: departmentSource,
        riskLevel: assessment ? "existing-assessment" : "mock",
      },
    };
  });
}

export function percent(part: number, total: number): number {
  return total ? Math.round((part / total) * 1000) / 10 : 0;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [, month] = key.split("-");
  return `${Number(month)}月`;
}

export function recentMonthKeys(count: number, now = new Date()): string[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - index - 1), 1);
    return monthKey(date);
  });
}

export function periodStart(period: "all" | "3m" | "6m" | "year", now = new Date()): Date | null {
  if (period === "all") return null;
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getFullYear(), now.getMonth() - (period === "3m" ? 2 : 5), 1);
}
