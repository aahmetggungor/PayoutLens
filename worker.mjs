import {rpc,base58Bytes} from './dist/verify.mjs';
// assets is supplied by build.mjs; public sources are embedded, not read from disk at runtime.
const cache=new Map();
const security={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; worker-src 'self'; manifest-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'"};
function json(value,status=200){return new Response(JSON.stringify(value),{status,headers:{...security,'Content-Type':'application/json','Cache-Control':'no-store'}});}
export async function proxy(request){
  if(request.method!=='POST')return json({error:{message:'Only POST is supported'}},405);
  const origin=request.headers.get('Origin');if(origin && origin!==new URL(request.url).origin)return json({error:{message:'Cross-origin queries are not allowed'}},403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:{message:'JSON required'}},415);
  let upstream=false;
  try {
    const reader=request.body?.getReader();if(!reader)throw new Error('Request body required');let size=0;const chunks=[];
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();return json({error:{message:'Query too large'}},413);}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
    const body=JSON.parse(new TextDecoder().decode(bytes));
    if(!['mainnet-beta','devnet'].includes(body.cluster))throw new Error('Unsupported network');
    if(body.method==='getGenesisHash'){if(!Array.isArray(body.params) || body.params.length)throw new Error('Invalid network query');}
    else if(body.method==='getTransaction'){
      if(!Array.isArray(body.params) || body.params.length!==2 || base58Bytes(body.params[0])!==64)throw new Error('Invalid transaction signature');
      const config=body.params[1];if(config?.encoding!=='jsonParsed' || config.commitment!=='finalized' || config.maxSupportedTransactionVersion!==1)throw new Error('Only finalized parsed transaction reads are allowed');
    }else throw new Error('RPC method is not permitted');
    const key=body.cluster+':'+body.method+':'+(body.params[0]??'');const saved=cache.get(key);
    if(saved && saved.until>Date.now())return json({jsonrpc:'2.0',id:1,result:saved.result});
    const params=body.method==='getGenesisHash'?[]:[body.params[0],{encoding:'jsonParsed',commitment:'finalized',maxSupportedTransactionVersion:1}];
    upstream=true;
    const result=await rpc(body.method,params,body.cluster,request.signal);
    if(result!==null){if(cache.size>=200)cache.delete(cache.keys().next().value);cache.set(key,{result,until:Date.now()+60000});}
    return json({jsonrpc:'2.0',id:1,result});
  }catch(error){return json({error:{message:upstream?'RPC query failed: '+error.message:'Invalid query: '+error.message}},upstream?502:400);}
}
export default {async fetch(request){
  const pathname=new URL(request.url).pathname;
  if(pathname==='/api/rpc')return proxy(request);
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:security});
  if(pathname==='/app')return Response.redirect(new URL('/app/',request.url),308);
  const asset=assets[pathname];if(!asset)return new Response('Not found',{status:404,headers:security});
  const headers={...security,'Content-Type':asset.type,'Cache-Control':'no-cache'};
  if(pathname==='/app/offline.html'){headers['X-PayoutLens-Asset']='offline-notice';headers['Content-Security-Policy']="default-src 'none'; style-src 'unsafe-inline'; manifest-src 'self'; base-uri 'none'";}
  const body=asset.binary?Uint8Array.from(atob(asset.body),char=>char.charCodeAt(0)):asset.body;
  return new Response(request.method==='HEAD'?null:body,{headers});
}};
