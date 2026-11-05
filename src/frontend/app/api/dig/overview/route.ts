import {authorized} from '@/lib/dig-access';
import {getDigOverview} from '@/lib/dig-source';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){if(!authorized(request))return Response.json({message:'当前地址无真实数据访问权限。'},{status:403});try{return Response.json(await getDigOverview(),{headers:{'Cache-Control':'private, no-store'}})}catch(error){return Response.json({message:error instanceof Error&&error.message.startsWith('飞书')?error.message:'数据源连接失败，请稍后重试'},{status:503,headers:{'Cache-Control':'no-store'}})}}
