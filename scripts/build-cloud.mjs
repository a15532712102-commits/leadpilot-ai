import {readFile,writeFile,mkdir,copyFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),out=root+'dist/';
await rm(out,{recursive:true,force:true});await mkdir(out+'icons',{recursive:true});
for(const f of ['index.html','app.js','core.js','cloud-client.js','app.css','sw.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'])await copyFile(root+f,out+f);
let html=await readFile(out+'index.html','utf8');html=html.replace(/<div id="legacyCloudNotice"[\s\S]*?<\/div><\/div>/,'');html=html.replace('<body>','<body class="cloud-locked">');html=html.replace('<head>','<head>\n<meta name="leadpilot-cloud" content="true">');html=html.replaceAll('Excel或Numbers填写模板后导出UTF-8 CSV；','云端客户库最多3000条且标准化总量不超过1MB。Excel或Numbers填写模板后导出UTF-8 CSV；').replaceAll('免费客户工作台 · 无需密钥','云端客户工作台 · D1').replaceAll('客户信息默认保存在当前手机浏览器中，不会自动云同步。','客户、公司资料和跟进记录保存在D1云端；成功保存后刷新或换设备仍可读取。').replaceAll('建议定期备份；Safari 清理网站数据可能使客户库丢失。','建议定期导出JSON备份；清理浏览器数据不会删除已保存的云端记录。').replaceAll('iPhone：用 Safari 打开网址，点击“分享 → 添加到主屏幕”。数据仅保存在当前浏览器；Safari 与主屏幕可能使用不同存储，请用 JSON 备份迁移。清除浏览器数据会丢失客户记录。','iPhone：Safari打开云端网址，点击“分享 → 添加到主屏幕”。登录同一账号即可读取D1客户库，Mac无需开机。旧GitHub Pages或localhost中的客户，请先导出JSON再在本页合并导入；浏览器不允许跨网站自动读取旧数据。').replaceAll('客户库、规则筛选、搜索方案和本地模板支持离线。打开搜索网站、AI聊天工具或WhatsApp需要网络。Mac和手机之间请用JSON备份转移资料。','云端客户读写需要网络；模板和搜索方案可在已加载页面中使用。登录后点击“刷新云端”读取其他设备的最新修改。旧版资料用JSON导入一次，之后不再依赖Mac。').replaceAll('联系记录（仅本机保存）','联系记录（保存至D1云端）').replaceAll('复制到客户库即可。','核实公司名称、官网和主营业务后，添加或导入到D1客户库。');
await writeFile(out+'index.html',html);
// Keep the downloadable 1.3 local mode synchronous and backwards compatible;
// the cloud build awaits every durable mutation before claiming success.
let app=await readFile(out+'app.js','utf8');
app=app.replaceAll('.onclick=()=>','.onclick=async()=>').replaceAll('.onchange=()=>','.onchange=async()=>').replaceAll('.onsubmit=e=>','.onsubmit=async e=>').replace("$('searchResults').addEventListener('click',e=>", "$('searchResults').addEventListener('click',async e=>");
app=app.replace('function waLog(', 'async function waLog(').replaceAll("waLog('","await waLog('").replaceAll('if(!save())','if(!(await save()))').replaceAll('if(save())','if(await save())');
await writeFile(out+'app.js',app);
await writeFile(out+'_headers',`/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Cache-Control: no-cache
`);
console.log('Cloud assets built: dist (static files only, no secrets or customer records)');
