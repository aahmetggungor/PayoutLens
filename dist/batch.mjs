import {base58Bytes} from './verify.mjs';
export const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export function signatureFrom(value) {
  let signature=value.trim();
  if (signature.startsWith('https://')) {
    const url=new URL(signature);
    if (!['solscan.io','explorer.solana.com'].includes(url.hostname) || url.username || url.password) throw new Error('Use a signature or an official Solscan / Solana Explorer transaction link');
    const match=url.pathname.match(/^\/tx\/([1-9A-HJ-NP-Za-km-z]+)\/?$/);
    if (!match) throw new Error('The link must point to a transaction');
    signature=match[1];
  }
  if (base58Bytes(signature)!==64) throw new Error('Enter a valid 64-byte Solana transaction signature');
  return signature;
}
export function validateRow(row) {
  if (base58Bytes(row.recipient)!==32 || base58Bytes(row.mint)!==32) throw new Error('Recipient and mint must be valid Solana addresses');
  if (!/^\d+(\.\d+)?$/.test(row.amount) || row.amount.length>60 || !/[1-9]/.test(row.amount)) throw new Error('Amount must be a positive decimal without commas');
  if (row.reference && base58Bytes(row.reference)!==32) throw new Error('Invalid reference address');
  if (row.not_before && (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(row.not_before) || !Number.isFinite(Date.parse(row.not_before)))) throw new Error('not_before must be an ISO timestamp with a timezone, such as 2026-09-30T00:00:00Z');
  return {...row,signature:signatureFrom(row.signature)};
}
export function parseCSV(text) {
  if (new TextEncoder().encode(text).length>100000) throw new Error('CSV limit: 100 KB');
  text=text.replace(/^\uFEFF/,'');
  const rows=[];let row=[],cell='',quoted=false,closed=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
    if(c==='"'){if(cell || closed)throw new Error('Invalid CSV quoting');quoted=true;continue;}
    if(c===',' || c==='\n' || c==='\r'){row.push(cell.trim());cell='';closed=false;if(c!==','){if(c==='\r' && text[i+1]==='\n')i++;if(row.some(Boolean))rows.push(row);row=[];}continue;}
    if(closed && !/\s/.test(c))throw new Error('Unexpected text after quoted field');
    if(!closed)cell+=c;
  }
  if(quoted)throw new Error('Unclosed CSV quote');
  row.push(cell.trim());if(row.some(Boolean))rows.push(row);
  const headers=rows.shift();
  const allowed=['payout_id','recipient','mint','amount','signature','not_before','reference'];
  if(!headers || headers.length!==new Set(headers).size || headers.some(h=>!allowed.includes(h)) || allowed.slice(0,5).some(h=>!headers.includes(h)))throw new Error('Required headers: payout_id,recipient,mint,amount,signature. Optional: not_before,reference');
  if(!rows.length || rows.length>50)throw new Error('Include between 1 and 50 payout rows');
  const ids=new Set();
  return rows.map((values,index)=>{
    try {
      if(values.length!==headers.length)throw new Error('Column count does not match headers');
      const item=Object.fromEntries(headers.map((h,i)=>[h,values[i]]));
      if(!item.payout_id || item.payout_id.length>100 || /[\x00-\x1f]/.test(item.payout_id) || ids.has(item.payout_id))throw new Error('payout_id must be unique, non-empty and at most 100 characters');
      ids.add(item.payout_id);return validateRow(item);
    }catch(error){throw new Error(`Row ${index+2}: ${error.message}`);}
  });
}
export function repeatedProofs(rows) {
  const counts=new Map();
  for(const row of rows){const key=[row.signature,row.recipient,row.mint].join(':');counts.set(key,(counts.get(key)??0)+1);}
  return rows.map(row=>counts.get([row.signature,row.recipient,row.mint].join(':'))>1);
}
export function reportCSV(records) {
  const headers=['payout_id','status','expected','received','signature','recipient','mint','network','checked_at','reason'];
  const safe=value=>{let s=String(value??'');if(/^[\s]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  return [headers,...records.map(e=>[e.expected.payout_id,e.report.status,e.expected.amount,e.report.credited,e.signature,e.expected.recipient,e.expected.mint,e.network,e.checkedAt,e.report.reason])].map(row=>row.map(safe).join(',')).join('\r\n');
}
