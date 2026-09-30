import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const origin='https://payoutlens.example';
async function serviceWorker(fetchImplementation=async()=>new Response('offline',{headers:{'X-PayoutLens-Asset':'offline-notice'}})){
  const listeners={},saved=new Map();
  const context={URL,Response,fetch:fetchImplementation,caches:{open:async()=>({put:async(key,response)=>saved.set(key,response)}),keys:async()=>[],match:async key=>saved.get(key)},self:{location:{origin},clients:{claim:async()=>{}},addEventListener:(name,listener)=>{listeners[name]=listener;}}};
  vm.runInNewContext(await readFile('dist/app/sw.js','utf8'),context);
  return {listeners,saved};
}
test('manifest opens workspace in standalone mode with required icons',async()=>{const manifest=JSON.parse(await readFile('dist/app/manifest.webmanifest','utf8'));assert.equal(manifest.start_url,'/app/');assert.equal(manifest.scope,'/app/');assert.equal(manifest.display,'standalone');assert.deepEqual(manifest.icons.map(i=>i.sizes),['192x192','512x512']);for(const size of [180,192,512]){const png=await readFile(`dist/app/icons/icon-${size}.png`);assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);}});
test('service worker caches only the identified offline notice',async()=>{const {listeners,saved}=await serviceWorker();let pending;listeners.install({waitUntil:p=>pending=p});await pending;assert.deepEqual([...saved.keys()],['/app/offline.html']);});
test('service worker never saves a redirected login response',async()=>{const {listeners}=await serviceWorker(async()=>({ok:true,redirected:true,headers:new Headers()}));let pending;listeners.install({waitUntil:p=>pending=p});await assert.rejects(pending,/unavailable/);});
test('RPC, POST and assets are never intercepted or cached',async()=>{const {listeners}=await serviceWorker();for(const request of [{method:'POST',mode:'cors',url:origin+'/api/rpc'},{method:'GET',mode:'cors',url:origin+'/app/pwa.mjs'},{method:'GET',mode:'navigate',url:'https://another.example/app/'}])listeners.fetch({request,respondWith:()=>assert.fail('must remain network-only')});});
test('failed offline navigation displays notice, not old payment result',async()=>{const {listeners,saved}=await serviceWorker(async()=>{throw new Error('offline');});saved.set('/app/offline.html',new Response('No connection. No new conclusion.'));let pending;listeners.fetch({request:{method:'GET',mode:'navigate',url:origin+'/app/'},respondWith:p=>pending=p});assert.match(await (await pending).text(),/No new conclusion/);assert.equal(saved.size,1);});
