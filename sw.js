const CACHE='leadpilot-static-1.2.0';
const ASSETS=['./','./index.html','./app.css','./app.js','./core.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
// New code activates on the next app launch, avoiding an update mid-edit.
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('leadpilot-static-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);const root=new URL('./',self.location.href);
 if(e.request.method!=='GET'||u.origin!==root.origin||u.search||!ASSETS.some(a=>new URL(a,root).pathname===u.pathname))return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)))}return r}).catch(()=>caches.match(e.request)));
});
