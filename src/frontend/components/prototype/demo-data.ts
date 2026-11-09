export type Business = "项目制" | "基础运维" | "HRO";
export type Customer = { id: string; name: string; short: string; industry: string; owner: string; tier: string; business: Business; health: string; revenue: number; cost: number; days: number; color: string };
export type Opportunity = { id: string; customer: string; title: string; amount: number; stage: number; business: Business; next: string; date: string; stalled?: boolean; approval: string; poc?: number };
export type Lead = { id: string; name: string; source: string; note: string; status: "待验证" | "培育中" | "已转化" | "已关闭" };
export type Task = { id: string; customer: string; title: string; note: string; kind: string; priority: string; time: string; done: boolean };
export type Event = { id: string; customer: string; title: string; detail: string; time: string };
export type Support = { id: string; opportunity: string; team: string; need: string; status: string; assignee?: string };
export type DemoState = { customers: Customer[]; opportunities: Opportunity[]; leads: Lead[]; tasks: Task[]; events: Event[]; supports: Support[]; dismissed: string[] };

export const stages = ["需求确认", "方案共创", "商务推进", "签约交付"];
export const seed: DemoState = {
  customers: [
    { id: "C-001", name: "澄川科技有限公司", short: "澄川科技", industry: "科技互联网", owner: "林悦", tier: "战略客户", business: "项目制", health: "合作稳定", revenue: 286, cost: 204, days: 128, color: "blue" },
    { id: "C-002", name: "远岚智能制造有限公司", short: "远岚制造", industry: "先进制造", owner: "林悦", tier: "成长客户", business: "基础运维", health: "续约关注", revenue: 168, cost: 137, days: 45, color: "sage" },
    { id: "C-003", name: "星洲文旅集团有限公司", short: "星洲文旅", industry: "文旅服务", owner: "林悦", tier: "战略客户", business: "项目制", health: "合作稳定", revenue: 324, cost: 236, days: 206, color: "lilac" },
    { id: "C-004", name: "云杉物流有限公司", short: "云杉物流", industry: "交通物流", owner: "林悦", tier: "成长客户", business: "HRO", health: "经营关注", revenue: 96, cost: 88, days: 92, color: "sand" },
    { id: "C-005", name: "栖原能源有限公司", short: "栖原能源", industry: "能源行业", owner: "周宁", tier: "成长客户", business: "基础运维", health: "合作稳定", revenue: 210, cost: 162, days: 180, color: "slate" },
  ],
  opportunities: [
    { id: "O-001", customer: "C-001", title: "企业知识库智能化升级", amount: 180, stage: 1, business: "项目制", next: "联合售前确认 POC 验收标准", date: "11月10日", approval: "尚未发起", poc: 6.8 },
    { id: "O-002", customer: "C-002", title: "2027 年度运维服务续约", amount: 168, stage: 2, business: "基础运维", next: "确认续约范围与报价", date: "11月12日", approval: "材料准备" },
    { id: "O-003", customer: "C-003", title: "智慧园区资产管理平台", amount: 320, stage: 0, business: "项目制", next: "拜访信息化负责人，确认范围", date: "11月11日", approval: "尚未发起" },
    { id: "O-004", customer: "C-004", title: "物流运营自动化改造", amount: 86, stage: 1, business: "项目制", next: "协调自动化方案专家", date: "11月09日", stalled: true, approval: "尚未发起", poc: 3.2 },
    { id: "O-005", customer: "C-003", title: "数据中心基础运维", amount: 126, stage: 3, business: "基础运维", next: "关联正式合同与交付项目", date: "11月13日", approval: "集团审批中" },
    { id: "O-006", customer: "C-001", title: "服务流程与工单优化", amount: 72, stage: 0, business: "项目制", next: "梳理当前工单场景", date: "11月14日", approval: "尚未发起" },
  ],
  leads: [
    { id: "L-001", name: "北辰新材料有限公司", source: "客户转介绍", note: "介绍人提及产线知识管理需求，待确认联系人。", status: "待验证" },
    { id: "L-002", name: "泊远医疗科技有限公司", source: "市场活动", note: "数字化交流会留资，对资产盘点感兴趣。", status: "培育中" },
  ],
  tasks: [
    { id: "T-001", customer: "C-002", title: "和远岚制造聊一聊明年的合作", note: "运维合同 45 天后到期，建议提前确认续约意向", kind: "客户维系", priority: "优先处理", time: "09:30", done: false },
    { id: "T-002", customer: "C-001", title: "为澄川科技安排一次方案共创", note: "客户已确认知识库需求，等待 AI 售前加入", kind: "商机推进", priority: "今日跟进", time: "14:00", done: false },
    { id: "T-003", customer: "C-004", title: "一起解开云杉物流的推进卡点", note: "商机停滞 12 天，需要协调自动化方案专家", kind: "待协同", priority: "需要关注", time: "16:00", done: false },
  ],
  events: [
    { id: "E-001", customer: "C-001", title: "陈序响应了售前协同", detail: "AI 解决方案团队 · 已安排方案共创", time: "30 分钟前" },
    { id: "E-002", customer: "C-003", title: "数据中心运维进入集团审批", detail: "业务阶段：签约交付 · 审批状态：审批中", time: "1 小时前" },
    { id: "E-003", customer: "C-002", title: "续约提醒已加入今日待办", detail: "合同到期前 45 天 · 演示规则事件", time: "今天 08:00" },
  ],
  supports: [{ id: "S-001", opportunity: "O-001", team: "AI 解决方案", need: "知识库方案共创与 POC 范围评估", status: "已响应", assignee: "陈序" }, { id: "S-002", opportunity: "O-004", team: "软件与自动化", need: "物流流程自动化方案评估", status: "待协调" }],
  dismissed: [],
};

export const signals = [
  { id: "R-001", customer: "C-002", title: "从运维服务，走向资产管理", tag: "交叉销售", color: "blue", text: "已合作基础运维，资产盘点仍依赖人工。可以从一张资产台账聊起。", evidence: "演示规则：已有运维合作 + 未覆盖资产管理产品线；尚未验证采购意向。", product: "资产管理软件", question: "你们现在跨园区的资产台账，是怎么更新和盘点的？" },
  { id: "R-002", customer: "C-003", title: "把一次合作，变成长久连接", tag: "存量增购", color: "sage", text: "智慧园区需求已确认，可继续了解多个园区之间的数据协同。", evidence: "演示规则：存在园区项目 + 多园区经营场景；不代表客户已有预算。", product: "数据服务", question: "不同园区的数据，目前能在一个地方看清吗？" },
  { id: "R-003", customer: "C-004", title: "让重复工作少一点", tag: "业务转型", color: "lilac", text: "从 HRO 人员服务切入，探索用自动化优化重复性操作。", evidence: "演示规则：HRO 合作 + 重复作业场景；需由销售验证替代可行性。", product: "流程自动化", question: "团队每天最耗时的重复操作是什么？有没有适合先试一试的环节？" },
];

export const resources = [
  { title: "AI 解决方案", subtitle: "把业务问题变成可落地的智能应用", icon: "ai", owner: "陈序", role: "AI 方案架构师", tags: ["企业知识库", "AI FDE", "智能体"], cases: "知识检索 · 服务助手 · 智能工单", time: "通常 1 个工作日响应" },
  { title: "基础运维服务", subtitle: "稳定的服务，是长期关系的起点", icon: "ops", owner: "许墨", role: "运维解决方案专家", tags: ["基础设施", "服务标准化", "智能运维"], cases: "数据中心 · 终端服务 · 多园区运维", time: "通常 1 个工作日响应" },
  { title: "软件与自动化", subtitle: "用轻量改造解决真实的效率问题", icon: "code", owner: "周宁", role: "软件产品顾问", tags: ["资产管理", "流程自动化", "系统集成"], cases: "资产盘点 · 工单协同 · RPA", time: "通常 2 个工作日响应" },
];
