import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPayment,atomicAmount,base58Bytes,PROGRAMS} from '../dist/verify.mjs';
const recipient = '11111111111111111111111111111111';
const mint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const expected = {recipient,mint,amount:'100'};
// Synthetic fixtures. Not real transactions or evidence of an actual payment.
function transaction(amount='100000000') { return {slot:1,blockTime:1,transaction:{message:{accountKeys:[recipient,'destination'],instructions:[{programId:PROGRAMS.token,parsed:{type:'transferChecked',info:{destination:'destination',mint,tokenAmount:{amount,decimals:6}}}}]}},meta:{err:null,fee:5000,preTokenBalances:[],postTokenBalances:[{accountIndex:1,mint,owner:recipient,uiTokenAmount:{amount,decimals:6}}]}}; }
test('exact amount is matched',()=>assert.equal(inspectPayment(transaction(),expected).status,'matched'));
test('partial is not matched',()=>assert.equal(inspectPayment(transaction('50000000'),expected).status,'partial'));
test('overpayment needs allocation review',()=>assert.equal(inspectPayment(transaction('101000000'),expected).status,'overpaid'));
test('failed transaction is rejected',()=>{const tx=transaction();tx.meta.err={InstructionError:[0,'error']};assert.equal(inspectPayment(tx,expected).status,'failed');});
test('wrong recipient is rejected',()=>{const tx=transaction();tx.meta.postTokenBalances[0].owner=mint;assert.equal(inspectPayment(tx,expected).status,'mismatch');});
test('wrong mint is rejected',()=>{const tx=transaction();tx.meta.postTokenBalances[0].mint=recipient;assert.equal(inspectPayment(tx,expected).status,'mismatch');});
test('unknown program fails closed',()=>{const tx=transaction();tx.transaction.message.instructions.push({programId:'unknown'});assert.equal(inspectPayment(tx,expected).status,'manual_review');});
test('token-2022 fails closed',()=>{const tx=transaction();tx.transaction.message.instructions[0].programId=PROGRAMS.token2022;assert.equal(inspectPayment(tx,expected).status,'manual_review');});
test('balance-only credit cannot count',()=>{const tx=transaction();tx.transaction.message.instructions[0]={programId:PROGRAMS.compute};assert.equal(inspectPayment(tx,expected).status,'manual_review');});
test('ownership changes fail closed',()=>{const tx=transaction();tx.meta.preTokenBalances=[{...tx.meta.postTokenBalances[0],owner:mint,uiTokenAmount:{amount:'0',decimals:6}}];assert.equal(inspectPayment(tx,expected).status,'manual_review');});
test('null does not imply unpaid',()=>assert.equal(inspectPayment(null,expected).status,'not_found'));
test('amount precision is exact',()=>assert.equal(atomicAmount('9007199254740993.123456',6),9007199254740993123456n));
test('fractional precision and zero are rejected',()=>{assert.throws(()=>atomicAmount('1.0000001',6));assert.throws(()=>atomicAmount('0',6));});
test('base58 validation',()=>{assert.equal(base58Bytes(recipient),32);assert.equal(base58Bytes('0invalid'),-1);});
test('reference requires actual account-key presence',()=>{assert.equal(inspectPayment(transaction(),{...expected,reference:recipient}).status,'matched');assert.equal(inspectPayment(transaction(),{...expected,reference:mint}).status,'mismatch');});
test('earliest payment cutoff rejects replay of old transfers',()=>assert.equal(inspectPayment(transaction(),{...expected,not_before:'2026-01-01T00:00:00Z'}).status,'mismatch'));
test('missing block time needs manual review if date required',()=>{const tx=transaction();tx.blockTime=null;assert.equal(inspectPayment(tx,{...expected,not_before:'2026-01-01T00:00:00Z'}).status,'manual_review');});
test('outgoing amounts cannot be hidden by incoming net balance',()=>{const tx=transaction();tx.meta.postTokenBalances[0].uiTokenAmount.amount='90000000';assert.equal(inspectPayment(tx,expected).status,'manual_review');});
test('unrelated wallet balances do not change the result',()=>{const tx=transaction();tx.meta.postTokenBalances.push({accountIndex:2,mint,owner:mint,uiTokenAmount:{amount:'999999',decimals:6}});assert.equal(inspectPayment(tx,expected).status,'matched');});
