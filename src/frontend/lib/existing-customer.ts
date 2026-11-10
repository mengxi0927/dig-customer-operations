import type { DigOverview } from './dig-types';
import { exactCompanyName } from './dig-qcc-types';
import { assessAdmission } from './growth-engine';

export function existingCustomerResult(name: string, overview: DigOverview) {
  const matches = overview.customers.filter(c => exactCompanyName(c.name) === exactCompanyName(name));
  if (!matches.length) return null;
  const ids = new Set(matches.map(c => c.id));
  const owners = [...new Set(overview.opportunities.filter(o => o.customerIds.some(id => ids.has(id))).map(o => o.owner.trim()).filter(Boolean))];
  return {
    ...assessAdmission({name: matches[0].name, creditCode: '', status: '', small: '', complete: false, fresh: false, risks: []}),
    decision: '该客户已存在，请勿重复建档', score: null,
    reasons: ['已在飞书客户主表找到同名客户，已停止新客户准入核查。', ...(matches.length > 1 ? ['系统中有多条同名客户记录，请核实具体客户档案。'] : [])],
    source: '飞书客户主表与关联商机', checkedAt: overview.syncedAt,
    notice: '负责人依据关联商机的销售员字段；客户申请人不作为负责人。',
    demoCase: 'existing', owner: owners.join('、'),
    existingCustomers: matches,
  };
}
