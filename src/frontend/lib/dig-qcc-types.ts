export interface DigCompanyProfile {
  name: string; creditCode: string; legalPerson: string; status: string;
  address: string; establishedDate: string; capital: string;
  customerId: string; cachedAt: string; expiresAt: string | null;
  source: 'qcc_database';
}
export interface DigRisk {
  name: string; creditCode: string; level: string; score: number | null;
  summary: string; evaluatedAt: string;
  risks: {title: string; description: string; date: string}[];
}
export interface DigQcc {
  profiles: DigCompanyProfile[]; risks: DigRisk[]; syncedAt: string;
  cacheCount: number | null; databaseError: string | null; riskError: string | null;
}
// Exact names only. Do not remove company suffixes or guess abbreviated names.
export const exactCompanyName = (v: string) => v.trim().normalize('NFKC');
export function matchProfile(id: string, name: string, profiles: DigCompanyProfile[]) {
  const linked = profiles.filter(p => p.customerId === id);
  const matches = linked.length ? linked : profiles.filter(p => exactCompanyName(p.name) === exactCompanyName(name));
  const codes = new Set(matches.map(p => p.creditCode || exactCompanyName(p.name)));
  if (codes.size !== 1) return undefined;
  return [...matches].sort((a,b) => b.cachedAt.localeCompare(a.cachedAt))[0];
}
