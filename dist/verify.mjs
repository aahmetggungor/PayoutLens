export const PROGRAMS = {
  token: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  token2022: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
  system: '11111111111111111111111111111111',
  associated: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  compute: 'ComputeBudget111111111111111111111111111111',
  memo: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
};
const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function base58Bytes(value) {
  if (typeof value !== 'string' || !value.length || value.length > 128) return -1;
  let n = 0n;
  for (const char of value) {
    const index = alphabet.indexOf(char);
    if (index < 0) return -1;
    n = n * 58n + BigInt(index);
  }
  let size = 0;
  while (n > 0n) { size++; n >>= 8n; }
  return size + (value.match(/^1*/)?.[0].length ?? 0);
}
export function atomicAmount(value, decimals) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new Error('Invalid token decimals');
  if (!/^\d+(\.\d+)?$/.test(value)) throw new Error('Use a positive decimal amount, without commas');
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > decimals) throw new Error('Amount has more decimal places than this token');
  const atomic = BigInt(whole + fraction.padEnd(decimals, '0'));
  if (atomic <= 0n) throw new Error('Amount must be greater than zero');
  return atomic;
}
export function formatAtomic(amount, decimals) {
  const digits = amount.toString().padStart(decimals + 1, '0');
  return decimals ? `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}` : digits;
}
/** Evaluates RPC data, not its authenticity. Only fetchFinalized establishes live provenance. */
export function inspectPayment(tx, expected) {
  if (base58Bytes(expected.recipient) !== 32 || base58Bytes(expected.mint) !== 32) throw new Error('Recipient and mint must be valid 32-byte Solana addresses');
  if (!tx) return {status:'not_found', reason:'No finalized transaction was returned. This is not proof of non-payment.'};
  if (!tx.meta || tx.meta.err !== null) return {status:'failed',reason:'The transaction failed or its execution metadata is missing.'};
  const keys = tx.transaction?.message?.accountKeys?.map(k => typeof k === 'string' ? k : k.pubkey) ?? [];
  if (expected.reference) {
    if (base58Bytes(expected.reference) !== 32) throw new Error('Reference must be a 32-byte Solana address');
    if (!keys.includes(expected.reference)) return {status:'mismatch',reason:'The expected reference address is not included in this transaction.'};
  }
  if (expected.not_before) {
    const cutoff = Date.parse(expected.not_before);
    if (!Number.isFinite(cutoff)) throw new Error('Invalid earliest payment date');
    if (!Number.isFinite(tx.blockTime)) return {status:'manual_review',reason:'No block time is available to check the earliest payment date.'};
    if (tx.blockTime * 1000 < cutoff) return {status:'mismatch',reason:'The transaction predates the earliest allowed payment date.'};
  }
  const outer = tx.transaction?.message?.instructions ?? [];
  const inner = (tx.meta.innerInstructions ?? []).flatMap(group => group.instructions ?? []);
  const instructions = [...outer, ...inner];
  if (!outer.length || instructions.some(i => !Object.values(PROGRAMS).includes(i.programId)))
    return {status:'manual_review',reason:'This version supports simple transfers only. A custom program or swap requires manual review.'};
  // Fail closed on Token-2022 (fees/extensions) and unsupported token instructions.
  if (instructions.some(i => i.programId === PROGRAMS.token2022))
    return {status:'manual_review',reason:'Token-2022 extensions are not supported in this version.'};
  const allowedTokenTypes = ['transfer','transferChecked','initializeAccount','initializeAccount2','initializeAccount3'];
  if (instructions.some(i => i.programId === PROGRAMS.token && !allowedTokenTypes.includes(i.parsed?.type)))
    return {status:'manual_review',reason:'An unsupported token instruction prevents an automatic conclusion.'};
  const pre = tx.meta.preTokenBalances ?? [];
  const post = tx.meta.postTokenBalances ?? [];
  const incoming = post.filter(b => b.owner === expected.recipient && b.mint === expected.mint);
  if (!incoming.length) return {status:'mismatch',reason:'The expected recipient did not receive the expected token mint.'};
  const decimals = incoming[0].uiTokenAmount.decimals;
  if (incoming.some(b => b.uiTokenAmount.decimals !== decimals)) return {status:'manual_review',reason:'Inconsistent decimal metadata.'};
  const required = atomicAmount(expected.amount, decimals);
  let credited = 0n;
  for (const balance of incoming) {
    const before = pre.find(b => b.accountIndex === balance.accountIndex);
    if (before && (before.mint !== balance.mint || before.owner !== balance.owner))
      return {status:'manual_review',reason:'Token account ownership changed inside this transaction.'};
    const delta = BigInt(balance.uiTokenAmount.amount) - BigInt(before?.uiTokenAmount.amount ?? '0');
    const destination = keys[balance.accountIndex];
    const transfers = instructions.filter(i => i.programId === PROGRAMS.token && ['transfer','transferChecked'].includes(i.parsed?.type) && i.parsed.info?.destination === destination);
    let explicitCredit = 0n;
    for (const instruction of transfers) {
      const info = instruction.parsed.info;
      if (info.mint && info.mint !== expected.mint) return {status:'manual_review',reason:'Instruction mint disagrees with balance metadata.'};
      explicitCredit += BigInt(info.tokenAmount?.amount ?? info.amount ?? '0');
    }
    if (delta < 0n || delta !== explicitCredit) return {status:'manual_review',reason:'Net balance change does not match simple incoming transfers.'};
    credited += delta;
  }
  const common = {credited:formatAtomic(credited,decimals),expected:formatAtomic(required,decimals),mint:expected.mint,recipient:expected.recipient,slot:tx.slot,blockTime:tx.blockTime,feeLamports:tx.meta.fee};
  if (credited === 0n) return {...common,status:'mismatch',reason:'No positive incoming transfer matched.'};
  if (credited < required) return {...common,status:'partial',reason:'The recipient received less than the expected amount.'};
  if (credited > required) return {...common,status:'overpaid',reason:'The recipient received more than the expected amount. Review allocation before closing a payout.'};
  return {...common,status:'matched',reason:'Recipient, token mint and amount match a simple finalized transfer. This does not prove who owes the money or which award it belongs to.'};
}
export const NETWORKS = {
  'mainnet-beta': {endpoint:'https://api.mainnet-beta.solana.com',genesis:'5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d'},
  devnet: {endpoint:'https://api.devnet.solana.com',genesis:'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG'}
};
export async function rpc(method,params,cluster,signal) {
  if (!['mainnet-beta','devnet'].includes(cluster)) throw new Error('Unsupported network');
  const browser = typeof window !== 'undefined';
  const response = await fetch(browser ? '/api/rpc' : NETWORKS[cluster].endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params,...(browser?{cluster}:{})}),signal:signal ? AbortSignal.any([signal,AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error(`RPC unavailable (${response.status}). No payment conclusion was made.`);
  const data = await response.json();
  if (data.error) throw new Error(data.error.message ?? 'RPC error');
  if (!Object.hasOwn(data,'result')) throw new Error('RPC returned no result field');
  return data.result;
}
export async function confirmNetwork(cluster,signal) {
  const genesis = await rpc('getGenesisHash',[],cluster,signal);
  if (genesis !== NETWORKS[cluster].genesis) throw new Error('RPC network identity mismatch. No conclusion was made.');
  return genesis;
}
export async function fetchFinalized(signature, cluster='mainnet-beta',options={}) {
  if (base58Bytes(signature) !== 64) throw new Error('Enter a valid 64-byte Solana transaction signature');
  const genesis = await confirmNetwork(cluster,options.signal);
  const result = await rpc('getTransaction',[signature,{encoding:'jsonParsed',commitment:'finalized',maxSupportedTransactionVersion:1}],cluster,options.signal);
  const data = {result};
  if (data.result && !data.result.transaction?.signatures?.includes(signature)) throw new Error('RPC signature mismatch');
  return {transaction:data.result,endpoint:NETWORKS[cluster].endpoint,genesis,network:cluster,checkedAt:new Date().toISOString()};
}
