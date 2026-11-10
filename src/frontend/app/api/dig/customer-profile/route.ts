import { Pool } from 'pg';
import { authorized } from '@/lib/dig-access';
import { archiveScore } from '@/lib/archive-score';
export const runtime = 'nodejs';
const globalPool = globalThis as typeof globalThis & { archiveProfilePool?: Pool };
export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ message: '无数据访问权限' }, { status: 403 });
  const name = new URL(request.url).searchParams.get('name')?.trim();
  if (!name || name.length > 200) return Response.json({ message: '请输入客户完整名称' }, { status: 400 });
  try {
    if (!process.env.QCC_DATABASE_URL) throw new Error('not configured');
    const pool = globalPool.archiveProfilePool ??= new Pool({ connectionString: process.env.QCC_DATABASE_URL, max: 2, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000, options: '-c default_transaction_read_only=on -c statement_timeout=10000' });
    const { rows } = await pool.query('SELECT id,company_name,credit_code,source_url,observed_at,company_json,summary_json,records_json FROM qcc_manual_archives WHERE company_name=$1 ORDER BY observed_at DESC LIMIT 1', [name]);
    const a = rows[0];
    return Response.json({ archive: a ? { id: a.id, name: a.company_name, creditCode: a.credit_code, sourceUrl: a.source_url, observedAt: a.observed_at, company: a.company_json, summary: a.summary_json, records: a.records_json, score: archiveScore(a.summary_json) } : null }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return Response.json({ message: '客户资料暂时无法读取，请重试' }, { status: 503 });
  }
}
