import {authorized} from '@/lib/dig-access';
import {accessToken,records,text} from '@/lib/dig-source';
import type {BenchmarkCase} from '@/lib/benchmark-types';
export const runtime='nodejs';
export const dynamic='force-dynamic';
let cache:{cases:BenchmarkCase[];expires:number}|null=null;
export async function GET(request:Request){
 if(!authorized(request))return Response.json({message:'无数据访问权限'},{status:403});
 try{
 if(!cache||cache.expires<Date.now()){
 const table=process.env.FEISHU_BENCHMARK_TABLE_ID||'tbluCZpHNZ4xwnX7';
 const rows=await records(table,['项目名称','项目号','项目号分类','所属营销单元'],await accessToken(),process.env.FEISHU_BENCHMARK_VIEW_ID||'vewoTuNZRv');
 const cases=rows.map(r=>({id:r.record_id,name:text(r.fields['项目名称']),number:text(r.fields['项目号']),kind:text(r.fields['项目号分类']),unit:text(r.fields['所属营销单元']),sourceUrl:`https://dcholdings.feishu.cn/base/${process.env.FEISHU_APP_TOKEN}?table=${table}&record=${r.record_id}`})).filter(c=>c.name);
 cache={cases,expires:Date.now()+300000};
 }
 return Response.json({cases:cache.cases,syncedAt:new Date().toISOString(),scope:'指定标杆案例视图分页读取；仅展示案例索引，详情通过表单申请'},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({message:'标杆案例暂未读取成功，请检查应用对案例表的读取权限后重试。',cases:[]},{status:503,headers:{'Cache-Control':'no-store'}})}
}
