import {fetchFinalized,inspectPayment} from './verify.mjs';
import {USDC,validateRow,parseCSV,repeatedProofs,reportCSV} from './batch.mjs';
const $=id=>document.getElementById(id);
let records=[],controller=null,mode='single';
const labels={matched:'TRANSFER MATCHED',partial:'PARTIAL PAYMENT',overpaid:'OVERPAYMENT · REVIEW',mismatch:'PAYOUT MISMATCH',manual_review:'MANUAL REVIEW',failed:'TRANSACTION FAILED',not_found:'NOT FOUND / NOT FINALIZED',duplicate:'REUSED PROOF · REVIEW',error:'NO CONCLUSION'};
function node(tag,text,className=''){const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;}
function download(content,type,name){const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportState(){ $('export').disabled=!records.length;$('export-csv').disabled=!records.length;}
function draw(record){
  const {report}=record;const area=node('article','','record');
  area.append(node('span',labels[report.status]??'NO CONCLUSION','status '+(report.status==='matched'?'':['failed','mismatch','error'].includes(report.status)?'error':'warning')),node('h3',record.expected.payout_id || 'Read-only payment inspection'),node('p',report.reason));
  for(const [label,value] of [['Expected',report.expected??record.expected.amount],['Received',report.credited],['Network',record.network],['Block time',report.blockTime?new Date(report.blockTime*1000).toISOString():undefined],['Slot',report.slot],['Recipient',record.expected.recipient],['Token mint',record.expected.mint],['Reference',record.expected.reference || undefined],['Earliest time',record.expected.not_before || undefined],['Checked at',record.checkedAt],['RPC source',record.endpoint],['Genesis identity',record.genesis]])if(value!==undefined){const row=node('div','','stat');row.append(node('span',label),node('strong',String(value)));area.append(row);}
  if(record.signature){const link=node('a','Open transaction on Solana Explorer','explorer');link.href=`https://explorer.solana.com/tx/${encodeURIComponent(record.signature)}${record.network==='devnet'?'?cluster=devnet':''}`;link.target='_blank';link.rel='noopener noreferrer';area.append(link);}
  area.append(node('p',record.provenance==='single-public-rpc'?'Finalized lookup from one RPC. A match is not proof of payer identity, invoice legitimacy or allocation outside this list.':'Lookup did not establish live evidence. Do not mark this payout paid.','source-note'));
  $('result').append(area);
}
function busy(on){for(const id of ['check-button','batch-button','single-tab','batch-tab','network','csv-file','template','csv-text'])$(id).disabled=on;for(const input of $('check-form').querySelectorAll('input,textarea'))input.disabled=on;$('cancel').hidden=!on;}
function clear(){records=[];$('result').replaceChildren();$('progress').textContent='';$('record-count').textContent='LOOKUP IN PROGRESS';exportState();}
function fail(message){$('result').append(node('article','','record'));const last=$('result').lastElementChild;last.append(node('span','NO CONCLUSION','status error'),node('h3','The check could not complete'),node('p',message));$('record-count').textContent='NO PAYMENT CONCLUSION';}
function expectedSingle(){const value=$('not-before').value;return validateRow({payout_id:'single-payment',recipient:$('recipient').value.trim(),mint:$('mint').value.trim(),amount:$('amount').value.trim(),signature:$('signature').value.trim(),reference:$('reference').value.trim(),not_before:value?new Date(value).toISOString():''});}
function makeRecord(expected,source,report){return {schema:'payoutlens/0.2',provenance:'single-public-rpc',signature:expected.signature,expected,...source,report,scope:'Read-only observation. Not a signed certificate. No automatic payout or invoice closure.'};}
$('check-form').addEventListener('submit',async event=>{
  event.preventDefault();clear();if(!navigator.onLine){fail('Offline. Reconnect before checking a payment. No live conclusion was made.');return;}controller=new AbortController();const network=$('network').value;busy(true);
  try{const expected=expectedSingle();$('progress').textContent='Confirming network and reading finalized transaction…';const source=await fetchFinalized(expected.signature,network,{signal:controller.signal});const report=inspectPayment(source.transaction,expected);records=[makeRecord(expected,source,report)];draw(records[0]);$('record-count').textContent=network==='devnet'?'DEVNET · NOT REAL MONEY':'1 LIVE INSPECTION';$('progress').textContent='Lookup complete. Review the inspection record below.';}
  catch(error){fail(controller.signal.aborted?'Check cancelled. No payment conclusion was made.':error.message);$('progress').textContent='';}
  finally{busy(false);exportState();controller=null;}
});
function setMode(next){mode=next;$('check-form').hidden=next!=='single';$('batch-panel').hidden=next!=='batch';for(const id of ['single','batch']){const active=next===id;$(id+'-tab').setAttribute('aria-pressed',String(active));$(id+'-tab').classList.toggle('active',active);}}
$('single-tab').addEventListener('click',()=>setMode('single'));
$('batch-tab').addEventListener('click',()=>setMode('batch'));
$('network').addEventListener('change',()=>{const dev=$('network').value==='devnet';$('network-note').textContent=dev?'Devnet is a separate test network. Enter its token mint; mainnet USDC does not identify devnet USDC.':'Mainnet USDC mint is prefilled. Verify the mint, not just a token ticker.';if(dev && $('mint').value===USDC)$('mint').value='';});
$('template').addEventListener('click',()=>download('payout_id,recipient,mint,amount,signature,not_before,reference\r\n','text/csv','payoutlens-headers.csv'));
$('csv-file').addEventListener('change',async()=>{const file=$('csv-file').files[0];if(!file)return;try{if(file.size>100000)throw new Error('CSV limit: 100 KB');$('csv-text').value=await file.text();$('progress').textContent='CSV loaded locally. Check its contents before running.';}catch(error){$('progress').textContent=error.message;}});
async function pause(ms,signal){await new Promise((resolve,reject)=>{const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);};const abort=()=>{done();reject(new Error('Cancelled'));};const timer=setTimeout(()=>{done();resolve();},ms);if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});});}
$('batch-button').addEventListener('click',async()=>{
  clear();if(!navigator.onLine){fail('Offline. Reconnect before reconciling payouts. No live conclusion was made.');return;}controller=new AbortController();const signal=controller.signal,network=$('network').value;busy(true);let total=0;
  try{
    const rows=parseCSV($('csv-text').value);total=rows.length;const duplicates=repeatedProofs(rows),cache=new Map();
    for(let i=0;i<rows.length;i++){
      if(signal.aborted)break;const expected=rows[i];$('progress').textContent=`Reading ${i+1} / ${rows.length} · ${expected.payout_id}`;
      let record;
      try{let source=cache.get(expected.signature);if(!source){if(cache.size)await pause(1200,signal);source=await fetchFinalized(expected.signature,network,{signal});cache.set(expected.signature,source);}let report=inspectPayment(source.transaction,expected);if(duplicates[i])report={...report,underlyingStatus:report.status,status:'duplicate',reason:'This signature + recipient + mint is reused in this list. Every affected row needs allocation review; do not close it automatically.'};record=makeRecord(expected,source,report);}
      catch(error){if(signal.aborted)break;record={schema:'payoutlens/0.2',provenance:'lookup-error',expected,signature:expected.signature,network,checkedAt:new Date().toISOString(),report:{status:'error',reason:error.message}};}
      records.push(record);draw(record);exportState();$('record-count').textContent=`${records.length} / ${total} INSPECTED`;
    }
    const matched=records.filter(e=>e.report.status==='matched').length;
    const summary=node('p',`${signal.aborted?'Cancelled':'Complete'} · ${records.length}/${total} inspected · ${matched} transfer matches · ${records.length-matched} need review. ${network==='devnet'?'Devnet: not real money.':''}`,'batch-summary');$('result').prepend(summary);$('progress').textContent=signal.aborted?'Remaining payouts were not checked. Export contains completed rows only.':'List processed. Duplicate checks apply only within this uploaded list.';
  }catch(error){fail(error.message);$('progress').textContent='';}
  finally{busy(false);exportState();controller=null;}
});
$('cancel').addEventListener('click',()=>controller?.abort());
$('export').addEventListener('click',()=>{if(records.length)download(JSON.stringify({schema:'payoutlens/report/0.2',scope:'Single RPC observations; duplicates detected only within this run.',records},null,2),'application/json','payoutlens-evidence.json');});
$('export-csv').addEventListener('click',()=>{if(records.length)download(reportCSV(records),'text/csv','payoutlens-report.csv');});
