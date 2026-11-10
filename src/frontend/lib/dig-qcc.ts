import 'server-only';
import { Pool } from 'pg';
import type { DigCompanyProfile, DigQcc, DigRisk } from './dig-qcc-types';
const globalDb = globalThis as typeof globalThis & { digQccPool?: Pool };
function pool() {
  if (!process.env.QCC_DATABASE_URL) throw new Error('not configured');
  return globalDb.digQccPool ??= new Pool({connectionString: process.env.QCC_DATABASE_URL, max: 2, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000, options: '-c default_transaction_read_only=on -c statement_timeout=10000'});
}
const str = (v: unknown) => typeof v === 'string' ? v : '';
const iso = (v: unknown) => v instanceof Date ? v.toISOString() : str(v);
async function profiles() {
  const client = await pool().connect();
  try {
    await client.query('BEGIN READ ONLY');
    const aliases = await client.query('SELECT standard_customer_name, credit_code, oper_name, company_status, registered_address, start_date, feishu_record_id, updated_at FROM customer_aliases');
    const caches = await client.query('SELECT response_json, updated_at, expires_at FROM qcc_search_cache');
    await client.query('COMMIT');
    const result: DigCompanyProfile[] = aliases.rows.map(r => ({name: str(r.standard_customer_name), creditCode: str(r.credit_code), legalPerson: str(r.oper_name), status: str(r.company_status), address: str(r.registered_address), establishedDate: str(r.start_date), capital: '', customerId: str(r.feishu_record_id), cachedAt: iso(r.updated_at), expiresAt: null, source: 'qcc_database'}));
    for (const r of caches.rows) {
      const d = r.response_json || {};
      const candidates = Array.isArray(d.candidates) ? d.candidates : d.company_name ? [d] : [];
      for (const c of candidates) {
        const name = str(c.company_name || c.name);
        if (name) result.push({name, creditCode: str(c.credit_code), legalPerson: str(c.oper_name), status: str(c.company_status || (c.name ? c.status : '')), address: str(c.registered_address || c.address), establishedDate: str(c.start_date), capital: str(c.registered_capital), customerId: '', cachedAt: iso(r.updated_at), expiresAt: iso(r.expires_at), source: 'qcc_database'});
      }
    }
    return {profiles: result, cacheCount: caches.rowCount};
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; }
  finally { client.release(); }
}
async function risks(): Promise<DigRisk[]> {
  if (!process.env.QCC_RISK_BASE_URL) throw new Error('not configured');
  const response = await fetch(new URL('/api/risk-assessments', process.env.QCC_RISK_BASE_URL), {cache: 'no-store', signal: AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error('unavailable');
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('invalid');
  // This endpoint returns saved real assessments; never call refresh/search APIs.
  return data.filter(d => d.provider === '企查查' && d.data_source === 'real' && d.company).map(d => ({name: str(d.company.company_name), creditCode: str(d.company.credit_code), level: str(d.level), score: typeof d.score === 'number' ? d.score : null, summary: str(d.summary), evaluatedAt: str(d.last_evaluated_at), risks: (Array.isArray(d.major_risks) ? d.major_risks : []).map((r: Record<string, unknown>) => ({title: str(r.name), description: str(r.description), date: str(r.date)}))}));
}
let cached: {value: DigQcc; expires: number} | undefined;
let pending: Promise<DigQcc> | undefined;
export async function getDigQcc(): Promise<DigQcc> {
  if (cached && cached.expires > Date.now()) return cached.value;
  if (pending) return pending;
  pending = Promise.allSettled([profiles(), risks()]).then(([db, risk]) => {
    const value: DigQcc = {profiles: db.status === 'fulfilled' ? db.value.profiles : [], cacheCount: db.status === 'fulfilled' ? db.value.cacheCount : null, risks: risk.status === 'fulfilled' ? risk.value : [], databaseError: db.status === 'rejected' ? '企查查数据库暂不可用，请检查数据库连接或 SSH 隧道' : null, riskError: risk.status === 'rejected' ? '已保存的企查查风险评估暂不可用' : null, syncedAt: new Date().toISOString()};
    cached = {value, expires: Date.now() + 60000}; return value;
  }).finally(() => { pending = undefined; });
  return pending;
}
