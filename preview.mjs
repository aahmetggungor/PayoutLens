import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {proxy} from './worker.mjs';
const root=path.resolve('dist');
http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://127.0.0.1:4317');
    if(url.pathname==='/api/rpc'){
      const request=new Request(url,{method:req.method,headers:req.headers,body:req.method==='POST'?req:undefined,...(req.method==='POST'?{duplex:'half'}:{})});
      const response=await proxy(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    const pathname=decodeURIComponent(url.pathname);const filename=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
    if(!filename.startsWith(root+path.sep) || pathname.startsWith('/server/')){res.writeHead(403).end();return;}
    const body=await readFile(filename);const ext=path.extname(filename);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'})[ext]??'application/octet-stream');if(pathname==='/app/offline.html')res.setHeader('X-PayoutLens-Asset','offline-notice');res.setHeader('Cache-Control','no-cache');res.end(body);
  }catch{res.writeHead(404).end('Not found');}
}).listen(4317,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4317'));
