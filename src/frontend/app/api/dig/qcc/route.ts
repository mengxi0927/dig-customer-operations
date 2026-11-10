import { authorized } from '@/lib/dig-access';
import { getDigQcc } from '@/lib/dig-qcc';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({message: '当前地址无真实数据访问权限。'}, {status: 403});
  return Response.json(await getDigQcc(), {headers: {'Cache-Control': 'private, no-store'}});
}
