import { assessAdmission } from './growth-engine';

export const CUSTOMER_CREATE_FORM = 'https://dcholdings.feishu.cn/share/base/form/shrcnHEb1OifUyJlOMX2ZPMHVic';
// 汇报用准入评分，依据手工录入资料配置，与企查查信用指标分开。
export const admissionDemoCases = [
  { id: 'pass', name: '上海吉祥航空股份有限公司', score: 88, creditCode: '913100007867226104', small: '否',
    reasons: ['主体存续，2006年成立，上交所主板上市（603885.SH）', '所录页面显示：失信被执行人、被执行人、限高及终本栏目均为0', '司法案件373条，需结合案由与公司诉讼身份判断，案件数量不直接等同高风险', '准入评分88分，达到60分汇报阈值，可进入飞书客户建档'],
    dimensions: [['主体与登记', 30, 30], ['司法与信用', 20, 25], ['经营合规', 20, 25], ['合作适配', 18, 20]] },
  { id: 'pass', name: '重庆新悦阳科技发展有限公司', score: 82, creditCode: '91500000MAE4MFTR2U', small: '是',
    reasons: ['主体存续，注册资本500万元，2025年参保人数101人', '纳税人状态正常，互联网信息服务备案有效', '页面显示自身风险0、关联风险1；股东重庆峰极智能科技研究院有限公司带有被执行人标签，关联风险不直接等同本企业风险', '小微企业属性不单独扣分；准入评分82分，达到60分汇报阈值'],
    dimensions: [['主体与登记', 28, 30], ['司法与信用', 21, 25], ['经营合规', 21, 25], ['合作适配', 12, 20]] },
  { id: 'risk', name: '启东市新宏房地产开发有限公司', score: 35, creditCode: '91320681MA1MGDFP1J', small: '',
    reasons: ['主体在业，注册资本3000万元', '失信被执行人1条，页面涉案金额2000万元', '被执行人1条，页面执行标的46,621,612元；限制高消费6条', '终本案件5条，页面显示未履行金额15,908.73万元；不同栏目金额可能重叠，不累加', '准入评分35分，低于60分汇报阈值，需法务与合规人工审批'],
    dimensions: [['主体与登记', 25, 30], ['司法与信用', 0, 25], ['经营合规', 5, 25], ['合作适配', 5, 20]] },
] as const;
export function findAdmissionDemo(name: string) {
  return admissionDemoCases.find(c => c.name === name.trim());
}
export function demoAdmissionResult(name: string) {
  const item = findAdmissionDemo(name);
  if (!item) return null;
  return {
    ...assessAdmission({ name: item.name, creditCode: item.creditCode, status: item.id === 'risk' ? '在业' : '存续', small: item.small, complete: true, fresh: true, risks: item.id === 'risk' ? [...item.reasons] : [] }, true),
    decision: item.id === 'pass' ? '准入评分通过，可开始建档' : '高风险，需人工审批',
    score: item.score, reasons: [...item.reasons], source: '已录入企查查资料 · 汇报模拟准入评分', ruleVersion: 'presentation-archive-2',
    notice: '分项分数为汇报配置，非企查查信用评级或正式准入结论；例外审批在本浏览器模拟。',
    demoCase: item.id, owner: '', dimensions: item.dimensions,
  };
}
