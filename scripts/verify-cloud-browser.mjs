import {readFile,writeFile} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
const [loginFile,configFile,reportFile]=process.argv.slice(2);
if(!loginFile||!configFile||!reportFile)throw Error('Provide private login file, private Cloudflare config and output report paths');
const credentials=JSON.parse(await readFile(loginFile,'utf8'));
const token=(await readFile(configFile,'utf8')).match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if(!token)throw Error('Cloudflare authorization unavailable');
const checks=[],names=new Set(),tag=Date.now().toString(36),origin=credentials.origin;
const account='56bed56cebeec5f97e46536b217d5afa';
let browser,context,error;
const record=name=>{checks.push(name);console.log('PASS:',name)};
const nav=(page,name)=>page.locator(`[data-page="${name}"]`).click();
async function login(page){await page.goto(origin,{waitUntil:'networkidle'});await expect(page.locator('#cloudLogin')).toBeVisible();await page.locator('#cloudPassword').fill(credentials.password);await page.locator('#cloudLoginButton').click();await expect(page.locator('#cloudBar')).toBeVisible({timeout:25000})}
try{
 browser=await chromium.connectOverCDP(`wss://api.cloudflare.com/client/v4/accounts/${account}/browser-run/devtools/browser?keep_alive=30000`,{headers:{Authorization:'Bearer '+token},timeout:25000});
 context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await login(page);record('actual HTTPS password login in remote Chromium');
 for(const width of [390,430]){await page.setViewportSize({width,height:width===390?844:932});for(const name of ['find','leads','message','whatsapp','settings']){await nav(page,name);await expect(page.locator('#page-'+name)).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()}expect(await page.locator('#setCompany').evaluate(e=>getComputedStyle(e).fontSize)).toBe('16px');record(`five tabs, no horizontal overflow, 16px inputs at ${width}px`)}
 await page.setViewportSize({width:390,height:844});await nav(page,'find');await page.locator('#buildQueries').click();await expect(page.locator('[data-bingq]')).toHaveCount(4);
 await page.evaluate(()=>{window.open=url=>{window.__opened=url;return null}});await page.locator('[data-bingq="0"]').click();expect(await page.evaluate(()=>window.__opened)).toMatch(/^https:\/\/www.bing.com\/search\?q=/);record('live UI generates encoded Google/Bing search workflow (not an API result)');
 const initial=await (await context.request.get(origin+'/api/state')).json();
 const name=`Synthetic cloud browser check ${tag}`;names.add(name);
 await nav(page,'leads');await page.locator('#addLead').click();await page.locator('#fName').fill(name);await page.locator('#fWebsite').fill(`https://synthetic-${tag}.example.org`);await page.locator('#fNotes').fill('Synthetic tractor cultivator agricultural distributor; not a real customer');await page.locator('#fWhatsapp').fill('+12025550101');await page.locator('#fWaConsent').selectOption('yes');await page.locator('#fWaSource').fill('Synthetic verification only; never send');await page.locator('#leadForm button[type=submit]').click();await expect(page.locator('#appStatus')).toContainText('客户已保存',{timeout:25000});
 await page.reload();await expect(page.locator('#cloudBar')).toBeVisible();await nav(page,'leads');await expect(page.locator('#leadList')).toContainText(name);record('real UI customer create persists in D1 after page reload');
 await page.locator('.lead').filter({hasText:name}).locator('[data-edit]').click();await page.locator('#fNotes').fill('Synthetic edited tractor cultivator importer distributor');await page.locator('#leadForm button[type=submit]').click();await expect(page.locator('#leadList')).toContainText('Synthetic edited');
 if(!initial.leads.length){await page.locator('#screenLeads').click();await expect(page.locator('#screenSummary')).toContainText('非AI')}
 record('cloud customer edit and transparent rule scoring');
 await nav(page,'settings');const csvName=`Synthetic CSV import ${tag}`;names.add(csvName);page.once('dialog',d=>d.accept());await page.locator('#importJson').setInputFiles({name:'synthetic.csv',mimeType:'text/csv',buffer:Buffer.from(`company,country,notes\n${csvName},India,Synthetic tractor dealer`)});await expect(page.locator('#appStatus')).toContainText('已合并导入');
 const jsonName=`Synthetic JSON migration ${tag}`;names.add(jsonName);page.once('dialog',d=>d.accept());await page.locator('#importJson').setInputFiles({name:'synthetic-old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:2,leads:[{id:`synthetic-migration-${tag}`,name:jsonName,country:'Nigeria',notes:'Synthetic migration only',waHistory:[{kind:'reply',at:100,note:'Synthetic old history'}]}]}))});await expect(page.locator('#appStatus')).toContainText('已合并导入');record('CSV import and legacy JSON/history migration saved to real D1');
 const download=page.waitForEvent('download',{timeout:15000});await page.locator('#exportJson').click();expect((await download).suggestedFilename()).toMatch(/\.json$/);record('JSON backup click starts a real browser download');
 await page.evaluate(()=>{window.open=url=>{window.__opened=url;return null}});await nav(page,'whatsapp');await page.locator('[data-wa-pick]').filter({hasText:name}).click();await page.locator('#waLanguage').selectOption('English');await page.locator('#waGenerate').click();const first=await page.locator('#waDraft').inputValue();await page.locator('#waNextMessage').click();expect(await page.locator('#waDraft').inputValue()).not.toBe(first);await expect(page.locator('#waOpen')).toBeDisabled();await page.locator('#waReview').check();await expect(page.locator('#waOpen')).toBeEnabled();await page.locator('#waOpen').click();expect(await page.evaluate(()=>window.__opened)).toMatch(/^https:\/\/wa.me\/12025550101\?text=/);await expect(page.locator('#waHistory')).toContainText('已打开聊天');await expect(page.locator('#cloudStatus')).toContainText('已保存到 D1');record('English variations, review gate, wa.me prefill and durable opened history; no send');
 await page.screenshot({path:reportFile.replace(/\.json$/,'.png'),fullPage:true});
 const other=await browser.newContext({viewport:{width:430,height:932},isMobile:true,hasTouch:true});const p2=await other.newPage();await login(p2);await nav(p2,'leads');await expect(p2.locator('#leadList')).toContainText(name);await expect(p2.locator('#leadList')).toContainText(csvName);await expect(p2.locator('#leadList')).toContainText(jsonName);expect(await p2.evaluate(()=>localStorage.getItem('leadpilot_mobile_v1'))).toBeNull();await other.close();record('independent browser session reads same D1 customers without localStorage');
 expect(errors).toEqual([]);record('no page JavaScript errors during live workflow');
}catch(e){error=String(e.message).replaceAll(credentials.password,'[redacted]').replaceAll(token,'[redacted]');console.log('Browser check did not complete:',error.split('\n').slice(0,3).join(' '))}
finally{
 if(context&&names.size){try{
  const session=await (await context.request.get(origin+'/api/session')).json();
  const state=await (await context.request.get(origin+'/api/state')).json();
  if(Array.isArray(state.leads)){
   state.leads=state.leads.filter(l=>!names.has(l.name));const r=await context.request.put(origin+'/api/state',{headers:{Origin:origin,'X-CSRF-Token':session.csrf},data:state});if(!r.ok())throw Error('Cleanup requires retry; status '+r.status());record('synthetic browser test records removed without deleting other clients');
  }
 }catch(e){console.log('Cleanup needs attention:',e.message);error=error||'Test record cleanup incomplete'}}
 if(context){try{const session=await (await context.request.get(origin+'/api/session')).json();if(session.csrf)await context.request.post(origin+'/api/logout',{headers:{Origin:origin,'X-CSRF-Token':session.csrf},data:{}})}catch{}}
 if(browser)await browser.close();
 await writeFile(reportFile,JSON.stringify({origin,engine:'remote Chromium (Cloudflare Browser Run)',viewports:[390,430],checks,passed:checks.length,error:error||null,realIPhoneSafari:false,actualWhatsAppSend:false},null,2));
}
if(error)process.exitCode=1;
