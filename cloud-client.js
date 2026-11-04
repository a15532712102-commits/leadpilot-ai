// No credentials or customer records are stored in browser storage in cloud mode.
export class CloudStore {
 constructor(){this.csrf='';this.revision=0}
 async request(path,method='GET',data){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
   const r=await fetch('/api/'+path,{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{...(data!==undefined?{'Content-Type':'application/json'}:{}),...(method!=='GET'&&this.csrf?{'X-CSRF-Token':this.csrf}:{})},...(data!==undefined?{body:JSON.stringify(data)}:{})});
   let value;try{value=await r.json()}catch{throw Error('服务器响应异常，请保留当前资料后重试')}
   if(!r.ok){const e=new Error(value.error||'云端操作失败');e.status=r.status;throw e}return value;
  }catch(e){if(e.name==='AbortError')throw Error('保存结果尚未确认：连接超时，请刷新云端核对后重试');throw e}finally{clearTimeout(timer)}
 }
 async login(username,password){const r=await this.request('login','POST',{username,password});this.csrf=r.csrf;return r}
 async session(){const r=await this.request('session');this.csrf=r.csrf;return r}
 async load(){const r=await this.request('state');this.revision=r.revision;return r}
 async save(state){const r=await this.request('state','PUT',{revision:this.revision,leads:state.leads,settings:state.settings});this.revision=r.revision;return r}
 async logout(){await this.request('logout','POST',{});this.csrf=''}
}
