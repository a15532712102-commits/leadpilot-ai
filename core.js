export const WORKER='https://leadpilot-search-private.a15532712102.workers.dev';
export function safeUrl(value){
  if(typeof value!=='string'||!value.trim()||/[\s\u0000-\u001f]/.test(value))return '';
  let s=value.trim();if(s.startsWith('/')||s.includes('\\'))return '';if(!/^https?:\/\//i.test(s)){if(/[:/@\\]/.test(s.split('/')[0])||/^[a-z]+:/i.test(s))return '';s='https://'+s}
  try{const u=new URL(s);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||!u.hostname.includes('.'))return '';return u.href}catch{return ''}
}
export function domain(s){try{return new URL(safeUrl(s)).hostname.replace(/^www\./,'').toLowerCase()}catch{return ''}}
export function phone(s){if(typeof s!=='string'||!/^\+?[1-9][\d ()-]{7,24}$/.test(s.trim()))return '';const p=s.replace(/\D/g,'');return /^[1-9]\d{7,14}$/.test(p)?p:''}
export function allowed(l){return !!(l&&l.waConsent==='yes'&&l.waConsentSource?.trim()&&phone(l.whatsapp))}
const str=(v,n=2000)=>typeof v==='string'?v.slice(0,n):'';
export function normalizeLead(l){
 if(!l||typeof l!=='object'||Array.isArray(l)||!str(l.name,160).trim())throw Error('客户缺少名称');
 const o={id:str(l.id,90)||crypto.randomUUID(),name:str(l.name,160).trim()};
 for(const k of ['country','type','website','sourceUrl','email','whatsapp','notes','status','source','waConsent','waConsentSource','nextFollowup','scoreReason','waLastMessage','targetCountry','productType','product'])o[k]=str(l[k],k==='notes'?2000:1500);
 o.website=safeUrl(o.website);o.sourceUrl=safeUrl(o.sourceUrl);
 if(o.email&&!/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(o.email))o.email='';
 o.status=['new','contacted','replied','followup','closed','invalid'].includes(o.status)?o.status:'new';
 o.type=['distributor','importer','dealer','manufacturer','other'].includes(o.type)?o.type:'other';
 o.waConsent=['yes','no'].includes(o.waConsent)?o.waConsent:'unknown';
 if(o.waConsent==='yes'&&!o.waConsentSource.trim())o.waConsent='unknown';
 o.nextFollowup=/^\d{4}-\d{2}-\d{2}$/.test(o.nextFollowup)?o.nextFollowup:'';
 for(const k of ['created','updated','waLastSent','waLastOpened'])o[k]=Number.isFinite(l[k])?l[k]:0;
 o.score=Number.isFinite(Number(l.score))&&l.score!==''&&l.score!=null?Math.max(0,Math.min(100,Number(l.score))):undefined;
 o.aiReviewed=l.aiReviewed===true;
 o.waHistory=Array.isArray(l.waHistory)?l.waHistory.slice(-200).filter(x=>x&&['opened','sent','reply','optout'].includes(x.kind)).map(x=>({kind:x.kind,at:Number(x.at)||0,note:str(x.note,1500)})):[];
 return o;
}
export function mergeLeads(existing,incoming){
 const map=new Map(existing.map(l=>[l.id,l]));
 for(const raw of incoming){const l=normalizeLead(raw);const old=map.get(l.id)||[...map.values()].find(x=>domain(x.website)&&domain(x.website)===domain(l.website));
  if(old){const merged=normalizeLead({...old,...raw,id:old.id});if(old.waConsent==='no'||l.waConsent==='no'){merged.waConsent='no';merged.status='invalid';merged.nextFollowup='';merged.waConsentSource=old.waConsent==='no'?old.waConsentSource:l.waConsentSource}map.set(old.id,merged)}else map.set(l.id,l);
 }if(map.size>3000)throw Error('客户总数超过3000条，请拆分备份');return [...map.values()];
}
export const columns=[['id','客户ID'],['name','公司名称'],['country','国家'],['type','客户类型'],['score','匹配分数'],['website','网址'],['email','商务邮箱'],['whatsapp','商务WhatsApp'],['status','跟进状态'],['waConsent','WhatsApp联系许可'],['waConsentSource','联系许可依据'],['waLastSent','上次人工确认发送时间戳'],['nextFollowup','下一次跟进日期'],['source','线索来源'],['notes','备注']];
export function csvCell(value){let s=String(value??'');if(/^[\s]*[=+\-@]/.test(s)||/^[\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
export function toCSV(leads){return '\ufeff'+columns.map(x=>csvCell(x[1])).join(',')+'\r\n'+leads.map(l=>columns.map(([k])=>csvCell(l[k])).join(',')).join('\r\n')}
export function fromCSV(text){
 const rows=[];let row=[],cell='',quoted=false;const s=text.replace(/^\ufeff/,'');
 for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quoted&&s[i+1]==='"'){cell+='"';i++}else if(quoted)quoted=false;else if(!cell)quoted=true;else throw Error('CSV引号格式错误')}
 else if(c===','&&!quoted){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&s[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell=''}else cell+=c}
 if(quoted)throw Error('CSV引号未闭合');row.push(cell);if(row.some(Boolean))rows.push(row);
 const header=rows.shift()||[];const keys=header.map(h=>columns.find(c=>c[1]===h||c[0]===h)?.[0]);if(!keys.includes('name'))throw Error('CSV需要“公司名称”列');
 return rows.map(r=>{if(r.length!==header.length)throw Error('CSV列数不一致');const l={};r.forEach((v,i)=>{if(keys[i])l[keys[i]]=v.replace(/^'(?=[\s]*[=+\-@]|[\t\r])/,'')});if(l.score)l.score=Number(l.score);if(l.waLastSent)l.waLastSent=Number(l.waLastSent);normalizeLead(l);return l})
}
export function ruleScore(l,product='',productType='agri'){
 const t=[l.name,l.notes].join(' ').toLowerCase();let score=10;const why=[];
 if(/import|ithalat|импорт|进口/.test(t)){score+=20;why.push('摘要含进口业务词')}
 if(/distribut|dealer|wholesale|bayi|дилер|经销|代理/.test(t)){score+=20;why.push('摘要含渠道业务词')}
 if(product.toLowerCase().split(/\W+/).filter(x=>x.length>4).some(w=>t.includes(w))){score+=30;why.push('产品关键词相关')}
 if(productType==='agri'&&/tarım|сельхоз|agric|农机/.test(t)){score+=10;why.push('农业行业相关')}
 if(/news|wikipedia|jobs|recruit|新闻|招聘/.test(t)){score-=30;why.push('可能为资讯或招聘')}
 return {score:Math.max(0,Math.min(90,score)),reason:'规则评分；'+(why.join('；')||'信息不足')+'；身份与采购意向待核实'};
}
export function similarMessages(draft,leads,currentId){
 const words=s=>String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(Boolean);
 const a=new Set(words(draft));if(a.size<5)return [];
 return leads.filter(l=>l.id!==currentId&&l.waLastMessage).filter(l=>{const b=new Set(words(l.waLastMessage));const common=[...a].filter(x=>b.has(x)).length;return common/new Set([...a,...b]).size>=0.8}).map(l=>l.name);
}
// Templates are transparent fallbacks, not AI or a promise of platform approval.
const products={
 agri:['inter-row cultivators and weeding machines','sıra arası çapa makineleri','cultivadoras entre hileras y desmalezadoras','bineuses inter-rangs et désherbeuses','междурядные культиваторы и прополочные машины','中耕除草机'],
 oil:['engine oils and coolants','motor yağları ve soğutma sıvıları','aceites de motor y refrigerantes','huiles moteur et liquides de refroidissement','моторные масла и охлаждающие жидкости','发动机油和冷却液'],
 conveyor:['belt conveyors and idler rollers','bantlı konveyörler ve taşıyıcı rulolar','transportadores de banda y rodillos','convoyeurs à bande et rouleaux','ленточные конвейеры и ролики','皮带输送机及托辊']};
export function template(c){
 const languages=['English','Turkish','Spanish','French','Russian'];const i=Math.max(0,languages.indexOf(c.language));
 const p=products[c.profile]||[c.product,c.product,c.product,c.product,c.product,c.product];
 const company=c.company;const name=c.lead?.name;const greet=[`Hello${name?' '+name+' team':''}!`,`Merhaba${name?' '+name+' ekibi':''}!`,`¡Hola${name?', equipo de '+name:''}!`,`Bonjour${name?', équipe de '+name:''} !`,`Здравствуйте${name?', команда '+name:''}!`][i];
 const intros=[`I'm with ${company}. We offer ${p[i]}. Would information about these products be relevant to your business? If so, which specifications would you like to discuss?`,`${company} adına yazıyorum. ${p[i]} sunuyoruz. Bu ürünler işiniz için uygun olabilir mi? İlgileniyorsanız hangi teknik özellikleri görüşmek istersiniz?`,`Le escribo de ${company}. Ofrecemos ${p[i]}. ¿Estos productos podrían ser relevantes para su empresa? Si le interesan, ¿qué especificaciones le gustaría comentar?`,`Je vous écris de la part de ${company}. Nous proposons des ${p[i]}. Ces produits pourraient-ils intéresser votre entreprise ? Si oui, quelles caractéristiques souhaitez-vous discuter ?`,`Я представляю ${company}. Мы предлагаем ${p[i]}. Могут ли эти изделия быть интересны вашей компании? Если да, какие характеристики вы хотели бы обсудить?`];
 const quotes=[`Regarding ${p[i]}, could you share the model or specifications and approximate quantity you need? This would help us prepare a suitable quotation.`,` ${p[i]} için ihtiyaç duyduğunuz modeli veya teknik özellikleri ve yaklaşık miktarı paylaşabilir misiniz? Böylece uygun bir teklif hazırlayabiliriz.`,`Respecto a ${p[i]}, ¿podría indicar el modelo o las especificaciones y la cantidad aproximada que necesita? Así podremos preparar una oferta adecuada.`,`Concernant les ${p[i]}, pourriez-vous préciser le modèle ou les caractéristiques et la quantité souhaitée ? Cela nous aidera à préparer une offre adaptée.`,`По поводу продукции (${p[i]}): подскажите нужную модель или характеристики и примерное количество. Это поможет нам подготовить подходящее предложение.`];
 const follows=[`Is information about ${p[i]} still useful to you? Please let me know if your needs have changed, or if you prefer no further messages.`,`${p[i]} hakkında bilgi almak hâlâ sizin için yararlı mı? İhtiyacınız değiştiyse veya başka mesaj almak istemiyorsanız lütfen bildirin.`,`¿Le sigue siendo útil recibir información sobre ${p[i]}? Avíseme si sus necesidades han cambiado o si prefiere no recibir más mensajes.`,`Les informations sur les ${p[i]} vous sont-elles toujours utiles ? N’hésitez pas à me dire si vos besoins ont changé ou si vous ne souhaitez plus recevoir de messages.`,`Вам ещё нужна информация о продукции (${p[i]})? Сообщите, пожалуйста, если ваши потребности изменились или вы не хотите получать дальнейшие сообщения.`];
 const body=c.stage==='quote'?quotes[i]:c.stage==='followup'?follows[i]:intros[i];
 const zh=(name?'您好，'+name+'团队！':'您好！')+(c.stage==='quote'?`关于${p[5]}，请问需要的型号或规格和大致数量是多少？这有助于我们准备合适的报价。`:c.stage==='followup'?`您是否仍需要${p[5]}方面的信息？如果需求有变，或不希望继续收到消息，请告诉我。`:`我来自${company}。我们提供${p[5]}。这些产品是否与贵公司的业务相关？如果感兴趣，您希望讨论哪些规格？`);
 return {message:greet+' '+body.trim(),zh,tip:'本地模板，未自动理解客户备注。请根据真实需求修改，或使用AI定制。'+(c.profile==='custom'?'自定义产品名称保留原文，请核对翻译。':'')};
}
