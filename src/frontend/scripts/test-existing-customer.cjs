const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');
function load(path, requireFn=()=>({})) {const ctx={exports:{},require:requireFn};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,ctx);return ctx.exports;}
const engine=load('lib/growth-engine.ts');
const names=load('lib/dig-qcc-types.ts');
const {existingCustomerResult:match}=load('lib/existing-customer.ts',name=>name.includes('growth-engine')?engine:names);
const data={syncedAt:'2026-11-10',customers:[{id:'a',name:'Ａ公司',applicant:'申请人甲'},{id:'b',name:'另一公司'}],opportunities:[{customerIds:['a'],owner:'销售甲'},{customerIds:['a'],owner:'销售乙'},{customerIds:['a'],owner:'销售甲'},{customerIds:['b'],owner:'无关销售'}]};
test('exact normalized name matches and owners come only from linked records',()=>{const r=match(' A公司 ',data);assert.equal(r.demoCase,'existing');assert.equal(r.owner,'销售甲、销售乙');assert.equal(r.existingCustomers[0].id,'a');assert.equal(r.score,null);assert.equal(match('A公',data),null);});
test('missing owner never falls back to applicant',()=>{assert.equal(match('A公司',{...data,opportunities:[]}).owner,'');});
test('duplicate names preserve all records and flag ambiguity',()=>{const r=match('A公司',{...data,customers:[...data.customers,{id:'c',name:'A公司'}]});assert.equal(r.existingCustomers.length,2);assert.ok(r.reasons.some(s=>s.includes('多条')));});
