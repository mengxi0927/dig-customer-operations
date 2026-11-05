import {authorized} from '@/lib/dig-access';
import {getDigLifecycle} from '@/lib/dig-lifecycle';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){if(!authorized(request))return Response.json({message:'当前地址无真实数据访问权限'},{status:403});try{return Response.json(await getDigLifecycle(),{headers:{'Cache-Control':'private, no-store'}})}catch{return Response.json({message:'项目与开票数据源暂不可用'},{status:503})}}
