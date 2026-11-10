const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript'), fs=require('node:fs'), vm=require('node:vm');
const js=ts.transpileModule(fs.readFileSync('lib/dig-qcc-types.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const ctx={exports:{}};vm.runInNewContext(js,ctx);
const profile=(name,creditCode,customerId='',cachedAt='2026-11-01')=>({name,creditCode,customerId,cachedAt});
test('QCC matches explicit record IDs or exact full names; rejects ambiguous names and preserves latest cache',()=>{
 const match=ctx.exports.matchProfile;
 const a=profile('甲科技有限公司','A');
 assert.equal(match('rec1','甲科技有限公司',[a]),a);
 assert.equal(match('rec1','甲科技',[a]),undefined);
 assert.equal(match('rec1','甲科技有限公司',[a,profile(a.name,'B')]),undefined);
 const linked=profile('正式登记名称','B','rec1');
 assert.equal(match('rec1','客户简称',[linked]),linked);
 const recent=profile(a.name,'A','','2026-11-09');
 assert.equal(match('rec1','甲科技有限公司',[a,recent]),recent);
 assert.equal(match('rec1','甲科技有限公司',[]),undefined);
});
