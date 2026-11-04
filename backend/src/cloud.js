import legacy from './worker.js';
import {normalizeLead,domain,assessLead,toCSV} from '../../core.js';
const VERSION='2.0.0', COOKIE='__Host-leadpilot', TTL=7*86400;
const encoder=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const un64=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
const digest=async value=>b64(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
const now=()=>Math.floor(Date.now()/1000);
class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
const fail=(status,message)=>{throw new HttpError(status,message)};
function json(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}})}
async function body(req,max=1100000){
 if(!req.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))fail(415,'请使用JSON请求');
 if(Number(req.headers.get('Content-Length'))>max)fail(413,'云端保存每批最多1MB，请拆分客户备份');
 const reader=req.body?.getReader();let size=0;const parts=[];
 if(reader){try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();fail(413,'云端保存每批最多1MB，请拆分客户备份')}parts.push(value)}}finally{reader.releaseLock()}}
 const bytes=new Uint8Array(size);let pos=0;for(const part of parts){bytes.set(part,pos);pos+=part.length}
 let data;try{data=JSON.parse(new TextDecoder().decode(bytes)||'{}')}catch{fail(400,'JSON格式不正确')}
 if(!data||typeof data!=='object'||Array.isArray(data))fail(400,'请求必须是JSON对象');return data;
}
export async function passwordHash(password,salt=random()){
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:un64(salt),iterations:100000},key,256);
 return `pbkdf2$100000$${salt}$${b64(bits)}`;
}
export async function verifyPassword(password,stored){
 if(typeof password!=='string'||password.length<12||password.length>256||typeof stored!=='string')return false;
 const pieces=stored.split('$');if(pieces.length!==4||pieces[0]!=='pbkdf2'||pieces[1]!=='100000')return false;
 try{const actual=await passwordHash(password,pieces[2]);let diff=actual.length^stored.length;for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^(stored.charCodeAt(i)||0);return diff===0}catch{return false}
}
function settings(raw={}){const clean={};for(const k of ['company','product','features','whatsapp'])if(typeof raw[k]==='string')clean[k]=raw[k].slice(0,2000);return clean}
export async function readState(db){
 const row=await db.prepare("SELECT revision,settings,updated,(SELECT json_group_array(json(data)) FROM (SELECT data FROM leads ORDER BY position ASC)) AS leads FROM app_state WHERE id=1").first();
 if(!row)fail(503,'数据库尚未迁移');return {revision:row.revision,updated:row.updated,settings:JSON.parse(row.settings),leads:JSON.parse(row.leads||'[]')};
}
export async function writeState(db,input){
 if(!Number.isInteger(input.revision)||input.revision<0||!Array.isArray(input.leads)||input.leads.length>3000)fail(400,'需要有效版本及3000条以内的客户列表');
 const old=await readState(db);if(input.revision!==old.revision)fail(409,'另一设备已经更新客户库，请刷新后重新操作；本次未覆盖云端数据');
 const ids=new Set(),hosts=new Set(),oldMap=new Map(old.leads.map(l=>[l.id,l])),oldHosts=new Map(old.leads.filter(l=>domain(l.website)).map(l=>[domain(l.website),l]));
 const leads=input.leads.map(raw=>{
  let lead;try{lead=normalizeLead(raw)}catch{fail(400,'客户资料格式不正确')}
  if(ids.has(lead.id))fail(400,'客户ID重复');ids.add(lead.id);
  const host=domain(lead.website);if(host&&hosts.has(host))fail(400,'相同公司网站重复，请先合并');if(host)hosts.add(host);
  const previous=oldMap.get(lead.id)?.waConsent==='no'?oldMap.get(lead.id):oldHosts.get(host);
  if(previous?.waConsent==='no'){lead.waConsent='no';lead.status='invalid';lead.nextFollowup='';lead.waConsentSource=previous.waConsentSource}
  return {...lead,_host:host||null};
 });
 const payload=JSON.stringify(leads);if(encoder.encode(payload).length>1000000)fail(413,'客户库超过1MB，请拆分或减少冗长历史后重试');
 const writeId=crypto.randomUUID();
 const result=await db.batch([
  db.prepare('UPDATE app_state SET revision=revision+1,settings=?,write_id=?,updated=? WHERE id=1 AND revision=?').bind(JSON.stringify(settings(input.settings)),writeId,Date.now(),input.revision),
  db.prepare("DELETE FROM leads WHERE id NOT IN (SELECT json_extract(value,'$.id') FROM json_each(?)) AND EXISTS(SELECT 1 FROM app_state WHERE id=1 AND write_id=?)").bind(payload,writeId),
  db.prepare("INSERT INTO leads(id,name,country,website_host,position,data) SELECT json_extract(value,'$.id'),json_extract(value,'$.name'),COALESCE(json_extract(value,'$.country'),''),json_extract(value,'$._host'),CAST(key AS INTEGER),json_remove(value,'$._host') FROM json_each(?) WHERE EXISTS(SELECT 1 FROM app_state WHERE id=1 AND write_id=?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,country=excluded.country,website_host=excluded.website_host,position=excluded.position,data=excluded.data WHERE leads.data<>excluded.data OR leads.position<>excluded.position").bind(payload,writeId)
 ]);
 if(!result[0].meta.changes)fail(409,'另一设备已经更新客户库，请刷新后重新操作');
 return {revision:input.revision+1,leads:leads.map(({_host,...lead})=>lead),settings:settings(input.settings)};
}
async function session(req,env){
 const value=(req.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 if(!value||!/^[A-Za-z0-9_-]{43}$/.test(value))return null;
 return await env.DB.prepare('SELECT hash,csrf,expires FROM sessions WHERE hash=? AND expires>?').bind(await digest(value),now()).first();
}
function checkOrigin(req){const url=new URL(req.url);if(req.headers.get('Origin')!==url.origin)fail(403,'请求来源不正确');const site=req.headers.get('Sec-Fetch-Site');if(site==='cross-site')fail(403,'不接受跨站请求')}
async function limited(binding,key){if(!binding)fail(503,'请求保护尚未配置');if(!(await binding.limit({key})).success)fail(429,'请求过于频繁，请一分钟后再试')}
async function api(req,env){
 const path=new URL(req.url).pathname;
 if(!env.DB||!env.LOGIN_PASSWORD_HASH)fail(503,'云端登录或数据库尚未配置');
 if(path==='/api/login'){
  if(req.method!=='POST')fail(405,'请使用POST');checkOrigin(req);
  await limited(env.LOGIN_LIMITER,'login:'+(req.headers.get('CF-Connecting-IP')||'unknown'));
  const data=await body(req,2048);
  const valid=await verifyPassword(data.password,env.LOGIN_PASSWORD_HASH);
  if(data.username!=='owner'||!valid)fail(401,'账号或密码不正确');
  const token=random(),csrf=random(),timestamp=now();
  await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE expires<=?').bind(timestamp),env.DB.prepare('INSERT INTO sessions(hash,csrf,expires,created) VALUES(?,?,?,?)').bind(await digest(token),csrf,timestamp+TTL,timestamp)]);
  return json({ok:true,csrf,version:VERSION},200, {'Set-Cookie':`${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${TTL}`});
 }
 await limited(env.REQUEST_LIMITER,'ip:'+(req.headers.get('CF-Connecting-IP')||'unknown'));
 const auth=await session(req,env);if(!auth)fail(401,'请先登录，客户数据不会公开访问');
 if(req.method!=='GET'&&req.method!=='HEAD'){
  checkOrigin(req);if(req.headers.get('X-CSRF-Token')!==auth.csrf)fail(403,'页面验证已过期，请重新登录');
 }
 await limited(env.REQUEST_LIMITER,'session:'+auth.hash);
 if(path==='/api/session'&&req.method==='GET')return json({ok:true,csrf:auth.csrf,version:VERSION,expires:auth.expires});
 if(path==='/api/logout'&&req.method==='POST'){
  await env.DB.prepare('DELETE FROM sessions WHERE hash=?').bind(auth.hash).run();
  return json({ok:true},200,{'Set-Cookie':`${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`});
 }
 if(path==='/api/state'){
  if(req.method==='GET')return json(await readState(env.DB));
  if(req.method==='PUT')return json(await writeState(env.DB,await body(req)));
 }
 if(path==='/api/export'&&req.method==='GET'){
  const state=await readState(env.DB),format=new URL(req.url).searchParams.get('format');
  if(!['json','csv'].includes(format))fail(400,'请选择JSON或CSV备份格式');
  const data=format==='json'?JSON.stringify({version:2,exported:new Date().toISOString(),settings:state.settings,leads:state.leads},null,2):toCSV(state.leads);
  return new Response(data,{headers:{'Content-Type':format==='json'?'application/json;charset=utf-8':'text/csv;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Disposition':`attachment; filename="LeadPilot-backup-${new Date().toISOString().slice(0,10)}.${format}"`}});
 }
 if(path==='/api/leads'&&req.method==='GET'){
  const q=(new URL(req.url).searchParams.get('q')||'').slice(0,200).toLowerCase();
  const rows=await env.DB.prepare("SELECT data FROM leads WHERE instr(lower(name),?)>0 OR instr(lower(country),?)>0 OR instr(lower(json_extract(data,'$.notes')),?)>0 ORDER BY name LIMIT 3000").bind(q,q,q).all();
  return json({leads:rows.results.map(r=>JSON.parse(r.data))});
 }
 if(path==='/api/health'&&['POST','GET'].includes(req.method))return json({ok:true,version:VERSION,database:'D1',aiReady:!!env.OPENAI_API_KEY,searchReady:env.SEARCH_ENABLED==='true'&&!!env.BRAVE_API_KEY,mode:'cloud-rules-and-templates'});
 if(path==='/api/score/local'&&req.method==='POST'){
  const data=await body(req,40000);if(!Array.isArray(data.leads)||data.leads.length>20||typeof data.product!=='string')fail(400,'请提交20条以内的客户及产品');
  return json({mode:'rules',results:data.leads.map(l=>({id:l.id,...assessLead(normalizeLead(l),data.product,data.profile)}))});
 }
 if(['/api/search','/api/score','/api/message'].includes(path)&&req.method==='POST'){
  if(path==='/api/search'&&(env.SEARCH_ENABLED!=='true'||!env.BRAVE_API_KEY))fail(501,'未接入搜索API。请使用Google/Bing搜索方案并人工核实来源');
  if(path!=='/api/search'&&!env.OPENAI_API_KEY)fail(501,'未配置大模型密钥；本地规则评分和免费模板可直接使用');
  const headers=new Headers(req.headers);headers.set('Origin',env.APP_ORIGIN);headers.set('X-App-Token',env.APP_ACCESS_TOKEN);
  const response=await legacy.fetch(new Request(req,{headers}),env);const h=new Headers(response.headers);h.delete('Access-Control-Allow-Origin');return new Response(response.body,{status:response.status,headers:h});
 }
 fail(404,'未知接口或不支持的请求方式');
}
export default {async fetch(req,env){
 const url=new URL(req.url);
 try{
  if(url.pathname.startsWith('/api/'))return await api(req,env);
  if(!['GET','HEAD'].includes(req.method))return json({error:'不支持的请求方式'},405);
  return await env.ASSETS.fetch(req);
 }catch(error){return json({error:error instanceof HttpError?error.message:'云端暂时无法处理请求；数据未确认保存，请保留备份后重试'},error instanceof HttpError?error.status:503,error.status===429?{'Retry-After':'60'}:{})}
}};
