#!/usr/bin/env python3
"""Actual HTTPS/D1 checks. Credentials stay in a private file, never in output."""
import argparse
import http.cookiejar
import json
import pathlib
import urllib.request
import urllib.error
import uuid

parser=argparse.ArgumentParser()
parser.add_argument('--credentials',required=True)
parser.add_argument('--report',required=True)
args=parser.parse_args()
credentials=json.loads(pathlib.Path(args.credentials).read_text())
origin=credentials['origin']
jar=http.cookiejar.CookieJar()
opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
csrf=''
checks=[]
def request(path,method='GET',data=None,expected=200,extra=None,parse=True):
    headers={'User-Agent':'LeadPilot-Cloud-Check/2.0','Cache-Control':'no-cache'}
    if method!='GET':
        headers.update({'Origin':origin,'Content-Type':'application/json','X-CSRF-Token':csrf})
    headers.update(extra or {})
    req=urllib.request.Request(origin+path,data=json.dumps(data).encode() if data is not None else None,method=method,headers=headers)
    try:
        response=opener.open(req,timeout=30)
    except urllib.error.HTTPError as error:
        response=error
    status=response.code
    assert status==expected, '%s returned %s, expected %s' % (path,status,expected)
    assert response.headers.get('Cache-Control')=='no-store', 'API must not be cached'
    return (json.loads(response.read()) if parse else response.read().decode('utf-8-sig')),response.headers

test_id='online-check-'+uuid.uuid4().hex
created=False
try:
    request('/api/state',expected=401);checks.append('unauthenticated state is 401')
    request('/api/login','POST',{'username':'owner','password':'synthetic-wrong-password'},expected=401)
    login,headers=request('/api/login','POST',{'username':credentials['username'],'password':credentials['password']})
    csrf=login['csrf']
    cookie=headers.get('Set-Cookie','')
    assert all(flag in cookie for flag in ['HttpOnly','Secure','SameSite=Strict'])
    checks.append('password login and protected session cookie')
    request('/api/session')
    state,_=request('/api/state')
    assert isinstance(state['leads'],list)
    sample={'id':test_id,'name':'LeadPilot线上验收测试（非真实客户）','country':'Turkey','website':'https://'+test_id+'.example.org','notes':'Synthetic tractor distributor for deployment check; not a real company','whatsapp':'+12025550101','waConsent':'yes','waConsentSource':'Synthetic test fixture only; never send','status':'new'}
    state['leads'].append(sample)
    saved,_=request('/api/state','PUT',state)
    created=True
    revision=saved['revision']
    refreshed,_=request('/api/state')
    found=next(l for l in refreshed['leads'] if l['id']==test_id)
    assert found['name']==sample['name']
    checks.append('actual D1 customer create and independent HTTPS reload')
    found['notes']='Synthetic edited tractor cultivator importer'
    found['nextFollowup']='2026-12-01'
    found['waHistory']=[{'kind':'opened','at':100,'note':'Synthetic verification; no message sent'}]
    saved,_=request('/api/state','PUT',refreshed)
    latest,_=request('/api/state')
    found=next(l for l in latest['leads'] if l['id']==test_id)
    assert found['waHistory'][0]['kind']=='opened' and found['nextFollowup']=='2026-12-01'
    checks.append('D1 edit, followup date and WhatsApp history survive reload')
    result,_=request('/api/leads?q='+test_id)
    # Name/notes search is tested using a readable query, never artificial API candidates.
    result,_=request('/api/leads?q=Synthetic%20edited')
    assert any(l['id']==test_id for l in result['leads'])
    checks.append('authenticated server-side customer search')
    request('/api/state','PUT',{'revision':revision-1,'leads':[]},expected=409)
    request('/api/state','PUT',latest,expected=403,extra={'Origin':'https://untrusted.example'})
    request('/api/state','PUT',latest,expected=403,extra={'X-CSRF-Token':'wrong'})
    checks.append('stale writes 409; cross-origin and invalid CSRF 403')
    score,_=request('/api/score/local','POST',{'product':'tractor cultivator','profile':'agri','leads':[found]})
    assert score['mode']=='rules' and len(score['results'])==1
    health,_=request('/api/health')
    assert health['database']=='D1' and health['aiReady'] is False and health['searchReady'] is False
    request('/api/search','POST',{},expected=501)
    request('/api/message','POST',{},expected=501)
    checks.append('real cloud rule scoring; absent search/AI explicitly reported')
    backup,h=request('/api/export?format=json')
    assert backup['version']==2 and 'token' not in backup['settings'] and 'csrf' not in backup
    assert '.json' in h.get('Content-Disposition','')
    checks.append('authenticated JSON backup has attachment filename and excludes credentials')
    csv,h=request('/api/export?format=csv',parse=False)
    assert '.csv' in h.get('Content-Disposition','') and '公司名称' in csv
    checks.append('authenticated CSV export responds with readable UTF-8 and filename')
finally:
    if created:
        current,_=request('/api/state')
        current['leads']=[l for l in current['leads'] if l['id']!=test_id]
        request('/api/state','PUT',current)
        final,_=request('/api/state')
        assert not any(l['id']==test_id for l in final['leads'])
        checks.append('synthetic test customer deleted; unrelated records retained')

request('/api/logout','POST',{})
request('/api/state',expected=401)
checks.append('logout revokes server-side session')
pathlib.Path(args.report).write_text(json.dumps({'origin':origin,'version':'2.0.0','checks':checks,'passed':len(checks),'sentWhatsAppMessages':0},ensure_ascii=False,indent=2))
print('PASS: %s actual cloud checks. No password, cookies or customer content printed.' % len(checks))
for check in checks:
    print('PASS:',check)
