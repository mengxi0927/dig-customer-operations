import type { DigOpportunity } from './dig-types';
// Membership follows customer record IDs; applicant departments are a separate field.
export function customerMarketingUnits(opportunities: DigOpportunity[]) {
  return Array.from(new Set(opportunities.flatMap(o=>o.marketingUnits || []).map(v=>v.trim()).filter(Boolean)));
}
