// Only a non-sensitive offline notice is cached. Never cache application pages,
// auth redirects, CSVs, RPC requests, transaction data or inspection results.
const CACHE='payoutlens-offline-v1';
const OFFLINE='/app/offline.html';
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const response=await fetch(OFFLINE,{cache:'reload',credentials:'same-origin'});
    if(!response.ok || response.redirected || response.headers.get('X-PayoutLens-Asset')!=='offline-notice')throw new Error('Offline notice is unavailable');
    const cache=await caches.open(CACHE);await cache.put(OFFLINE,response);
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const key of await caches.keys())if(key.startsWith('payoutlens-offline-') && key!==CACHE)await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  // Scope protects /app/ navigations only. All other requests, especially POST
  // and /api/rpc, remain network-only with no cache fallback.
  if(request.method!=='GET' || request.mode!=='navigate' || url.origin!==self.location.origin || !url.pathname.startsWith('/app/'))return;
  event.respondWith((async()=>{
    try{return await fetch(request);}catch{
      return await caches.match(OFFLINE) || new Response('Offline. Live payment checks require an internet connection.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
  })());
});
