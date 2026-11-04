import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../backend/src/worker.js';
const origin='https://a15532712102-commits.github.io';
const url='https://leadpilot-search-private.example.workers.dev';
const env={APP_ACCESS_TOKEN:'local-test-token-123',APP_ORIGIN:origin,REQUEST_LIMITER:{limit:async()=>({success:true})},COST_LIMITER:{limit:async()=>({success:true})}};
function req(path,method='POST',token=env.APP_ACCESS_TOKEN,o=origin,body={}){
 const headers={'Origin':o,'Content-Type':'application/json'};
 if(token!==null) headers['X-App-Token']=token;
 return new Request(url+path,{method,headers,body:method==='POST'?JSON.stringify(body):undefined});
}
test('authenticated health check works and has correct CORS origin',async()=>{
 const r=await worker.fetch(req('/api/health'),env);
 assert.equal(r.status,200);assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);
 const b=await r.json();assert.equal(b.ok,true);assert.equal(b.searchReady,false);
});
test('wrong app token cannot access',async()=>{
 const r=await worker.fetch(req('/api/health','POST','wrong'),env);
 assert.equal(r.status,401);
});
test('untrusted origin is rejected',async()=>{
 const r=await worker.fetch(req('/api/health','POST',env.APP_ACCESS_TOKEN,'https://evil.example'),env);
 assert.equal(r.status,403);
});
test('OPTIONS preflight returns 204',async()=>{
 const r=await worker.fetch(req('/api/health','OPTIONS',null),env);
 assert.equal(r.status,204);
});
test('search without Brave key returns clear failure',async()=>{
 const r=await worker.fetch(req('/api/search','POST',env.APP_ACCESS_TOKEN,origin,{country:'Turkey',product:'tractor-mounted inter-row cultivators',buyer:'distributor',productType:'agri'}),env);
 assert.equal(r.status,502);assert.match((await r.json()).error,/BRAVE_API_KEY/);
});
test('mock Brave results return de-duplicated candidate links',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async (_url)=>new Response(JSON.stringify({web:{results:[
  {title:'Demo Agricultural Machinery',url:'https://example-agri.com/catalog',description:'tractor and cultivator supplier'},
  {title:'Same company',url:'https://example-agri.com/contact',description:'farm machinery'},
  {title:'Another dealer',url:'https://example-dealer.com/',description:'tractor retailer'}
 ]}}),{status:200,headers:{'Content-Type':'application/json'}});
 try{
   const r=await worker.fetch(req('/api/search','POST',env.APP_ACCESS_TOKEN,origin,{country:'Turkey',product:'tractor-mounted inter-row cultivators',productType:'agri',buyer:'distributor'}),{...env,BRAVE_API_KEY:'test-only'});
   assert.equal(r.status,200);
   const p=await r.json();assert.equal(p.results.length,2);assert.equal(p.results[0].source,'Brave Search');
 }finally{globalThis.fetch=original;}
});
test('missing origin config fails closed',async()=>{assert.equal((await worker.fetch(req('/api/health'),{...env,APP_ORIGIN:''})).status,503)});
test('untrusted preflight rejected without allow-origin',async()=>{const r=await worker.fetch(req('/api/health','OPTIONS',null,'https://evil.example'),env);assert.equal(r.status,403);assert.equal(r.headers.get('Access-Control-Allow-Origin'),null)});
test('missing rate binding fails closed',async()=>{assert.equal((await worker.fetch(req('/api/health'),{...env,COST_LIMITER:undefined})).status,503)});
test('rate limit returns retry-after',async()=>{const r=await worker.fetch(req('/api/health'),{...env,REQUEST_LIMITER:{limit:async()=>({success:false})}});assert.equal(r.status,429);assert.equal(r.headers.get('Retry-After'),'60')});
test('cost limiter blocks upstream',async()=>{const r=await worker.fetch(req('/api/search','POST',env.APP_ACCESS_TOKEN,origin,{product:'tractors',country:'Turkey',buyer:'dealer',productType:'agri'}),{...env,COST_LIMITER:{limit:async()=>({success:false})}});assert.equal(r.status,429)});
test('reject arrays, missing input, huge payload, invalid enum',async()=>{for(const body of [[],{}, {product:'x'.repeat(41000)}, {product:'tractors',country:'Turkey',buyer:'wrong',productType:'agri'}])assert.equal((await worker.fetch(req('/api/search','POST',env.APP_ACCESS_TOKEN,origin,body),env)).status,400)});
test('AI language and duplicate ID validation before requests',async()=>{assert.equal((await worker.fetch(req('/api/message','POST',env.APP_ACCESS_TOKEN,origin,{company:'X',product:'Y',language:'bad',stage:'intro'}),env)).status,400);assert.equal((await worker.fetch(req('/api/score','POST',env.APP_ACCESS_TOKEN,origin,{product:'Y',country:'Turkey',leads:[{id:'1',name:'A'},{id:'1',name:'B'}]}),env)).status,400)});
test('upstream errors do not expose raw body',async()=>{const old=globalThis.fetch;globalThis.fetch=async()=>new Response('secret-canary',{status:401});try{const r=await worker.fetch(req('/api/search','POST',env.APP_ACCESS_TOKEN,origin,{product:'tractors',country:'Nigeria',buyer:'dealer',productType:'agri'}),{...env,BRAVE_API_KEY:'test'});assert.equal(r.status,502);assert.doesNotMatch(await r.text(),/secret-canary/)}finally{globalThis.fetch=old}});
test('search filters executable and credential URLs; one paid call with ALL country',async()=>{let calls=0;const old=globalThis.fetch;globalThis.fetch=async u=>{calls++;assert.equal(new URL(u).searchParams.get('country'),'ALL');return Response.json({web:{results:[{title:'Bad',url:'javascript:alert(1)'},{title:'Bad2',url:'https://name:password@example.com'},{title:'Good',url:'https://example.org',description:'dealer'}]}})};try{const r=await worker.fetch(req('/api/search','POST',env.APP_ACCESS_TOKEN,origin,{product:'engine oil',country:'Nigeria',buyer:'dealer',productType:'oil'}),{...env,BRAVE_API_KEY:'test'});assert.equal(r.status,200);assert.equal((await r.json()).results.length,1);assert.equal(calls,1)}finally{globalThis.fetch=old}});
test('AI scores must cover each unique input ID and be bounded',async()=>{const old=globalThis.fetch;const body={product:'tractor',country:'Turkey',leads:[{id:'one',name:'Company'}]};try{for(const output of [{results:[]},{results:[{id:'other',score:70,reason:'相关',buyerType:'dealer'}]},{results:[{id:'one',score:101,reason:'相关',buyerType:'dealer'}]}]){globalThis.fetch=async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]});assert.equal((await worker.fetch(req('/api/score','POST',env.APP_ACCESS_TOKEN,origin,body),{...env,OPENAI_API_KEY:'test'})).status,502)}}finally{globalThis.fetch=old}});
test('AI message incomplete fails and personalization context is passed',async()=>{const old=globalThis.fetch;let input;globalThis.fetch=async(_u,o)=>{input=JSON.parse(JSON.parse(o.body).input);return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({message:'Hello',zh:'',tip:'test'})}]}]})};try{const r=await worker.fetch(req('/api/message','POST',env.APP_ACCESS_TOKEN,origin,{company:'Company',product:'tractor',language:'Turkish',stage:'intro',note:'confirmed need: 3 rows',lead:{name:'Buyer',notes:'farm implements'},previousMessages:['previous draft']}),{...env,OPENAI_API_KEY:'test'});assert.equal(r.status,502);assert.equal(input.lead.name,'Buyer');assert.equal(input.previousMessages[0],'previous draft')}finally{globalThis.fetch=old}});
test('upstream abort has clear timeout error without a false success',async()=>{const old=globalThis.fetch;globalThis.fetch=async()=>{throw new DOMException('abort','AbortError')};try{const r=await worker.fetch(req('/api/search','POST',env.APP_ACCESS_TOKEN,origin,{product:'tractor',country:'Turkey',buyer:'dealer',productType:'agri'}),{...env,BRAVE_API_KEY:'test'});assert.equal(r.status,502);assert.match((await r.json()).error,/超时/)}finally{globalThis.fetch=old}});
test('valid AI score and message parse successfully (mock, not live)',async()=>{const old=globalThis.fetch;let output={results:[{id:'one',score:65,reason:'相关但未验证',buyerType:'dealer'}]};globalThis.fetch=async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]});try{let r=await worker.fetch(req('/api/score','POST',env.APP_ACCESS_TOKEN,origin,{product:'tractor',country:'Turkey',leads:[{id:'one',name:'Buyer'}]}),{...env,OPENAI_API_KEY:'test'});assert.equal(r.status,200);assert.equal((await r.json()).results[0].score,65);output={message:'Hello buyer, would this be relevant?',zh:'您好，产品是否相关？',tip:'请核实许可'};r=await worker.fetch(req('/api/message','POST',env.APP_ACCESS_TOKEN,origin,{company:'Company',product:'tractor',language:'English',stage:'intro'}),{...env,OPENAI_API_KEY:'test'});assert.equal(r.status,200);assert.equal((await r.json()).zh,output.zh)}finally{globalThis.fetch=old}});
