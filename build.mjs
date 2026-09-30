import {readFile,mkdir,writeFile} from 'node:fs/promises';
const paths={'/':'index.html','/app/':'app/index.html','/favicon.svg':'favicon.svg','/site.css':'site.css','/workspace.css':'workspace.css','/app.mjs':'app.mjs','/verify.mjs':'verify.mjs','/batch.mjs':'batch.mjs','/app/manifest.webmanifest':'app/manifest.webmanifest','/app/pwa.mjs':'app/pwa.mjs','/app/pwa.css':'app/pwa.css','/app/sw.js':'app/sw.js','/app/offline.html':'app/offline.html','/app/icons/icon-180.png':'app/icons/icon-180.png','/app/icons/icon-192.png':'app/icons/icon-192.png','/app/icons/icon-512.png':'app/icons/icon-512.png'};
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',mjs:'text/javascript; charset=utf-8',js:'text/javascript; charset=utf-8',svg:'image/svg+xml',webmanifest:'application/manifest+json',png:'image/png'};
const assets={};for(const [url,file]of Object.entries(paths)){const binary=file.endsWith('.png');assets[url]={body:await readFile('dist/'+file,binary?undefined:'utf8').then(value=>binary?value.toString('base64'):value),type:types[file.split('.').pop()],binary};}
const verifier=(await readFile('dist/verify.mjs','utf8')).replace(/^export /gm,'');
const worker=(await readFile('worker.mjs','utf8')).replace(/^import .*\n/,'').replace(/^export async function proxy/,'async function proxy');
await mkdir('dist/server',{recursive:true});
await writeFile('dist/server/index.js','const assets='+JSON.stringify(assets)+';\n'+verifier+'\n'+worker);
console.log('Built Cloudflare-compatible Worker with '+Object.keys(assets).length+' public routes');
