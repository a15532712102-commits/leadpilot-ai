"""Run only after user approves live API usage. Never logs access tokens or messages."""
import getpass,json,urllib.request,urllib.error,datetime,pathlib,sys
BASE='https://leadpilot-search-private.a15532712102.workers.dev'
ORIGIN='https://a15532712102-commits.github.io'
TOKEN=getpass.getpass('在本机输入 APP_ACCESS_TOKEN（隐藏输入，不会保存）：')
report={'time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'worker':BASE,'checks':{}}
def call(route,body):
 req=urllib.request.Request(BASE+'/api/'+route,data=json.dumps(body).encode(),headers={'Origin':ORIGIN,'X-App-Token':TOKEN,'Content-Type':'application/json','User-Agent':'LeadPilot-Deployment-Check/1.2'},method='POST')
 try:
  with urllib.request.urlopen(req,timeout=25) as r:return json.load(r)
 except urllib.error.HTTPError as e:raise RuntimeError('HTTP '+str(e.code)) from None
try:
 health=call('health',{});assert health.get('ok') is True
 report['checks']['health']='passed; configuration presence only'
 if health.get('searchReady'):
  search=call('search',{'product':'tractor mounted inter-row cultivator','country':'Turkey','buyer':'distributor','productType':'agri'})
  leads=search.get('results',[]);assert leads,'No real candidates returned'
  report['checks']['search']={'status':'passed','count':len(leads),'sources':[x.get('url') for x in leads],'accessibility':'not automatically verified; open source URLs manually'}
 else:leads=[];report['checks']['search']='blocked: Brave key absent'
 if health.get('aiReady'):
  if leads:
   batch=[{'id':str(i),'name':l['name'],'description':l.get('description',''),'website':l.get('url','')} for i,l in enumerate(leads[:3])]
   scores=call('score',{'product':'tractor mounted inter-row cultivator','country':'Turkey','leads':batch})
   assert len(scores.get('results',[]))==len(batch)
   report['checks']['score']='passed real upstream; manual quality review still needed'
  else:report['checks']['score']='blocked: no real search candidates'
  lead={'name':leads[0]['name'],'notes':leads[0].get('description','')} if leads else None
  msg=call('message',{'company':'XINPENG Agricultural Machinery','product':'inter-row cultivators','language':'Turkish','stage':'intro','lead':lead,'note':'Do not invent needs or prior contact.'})
  assert msg.get('message') and msg.get('zh')
  report['checks']['message']='passed real upstream structure; manual translation review still needed'
 else:report['checks']['score']=report['checks']['message']='blocked: OpenAI key absent'
except Exception as e:report['error']=str(e)[:200]
finally:
 TOKEN=''
 destination=pathlib.Path(__file__).resolve().parent.parent/'live-results.json'
 destination.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
 print('结果已保存：'+str(destination))
 print(json.dumps(report['checks'],ensure_ascii=False,indent=2))
 if report.get('error'):print('验证未完成：'+report['error']);sys.exit(1)
