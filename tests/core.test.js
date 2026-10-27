import test from 'node:test';import assert from 'node:assert/strict';
import {retrieve,validateFlow,numericSummary,planAllows} from '../lib/core.js';
import handler from '../api/index.js';
test('retrieval ranks relevant document chunks',()=>{const r=retrieve('unrelated '.repeat(110)+'Kobe is a port city.','Kobe');assert.ok(r[0].text.includes('Kobe'))});
test('workflow rejects unknown commands and excessive pipelines',()=>{assert.throws(()=>validateFlow({input:'x',steps:['eval']},['upper']));assert.equal(validateFlow({input:'x',steps:['upper']},['upper']).input,'x');assert.throws(()=>validateFlow({input:'x',steps:Array(21).fill('upper')},['upper']))});
test('analytics ignores blanks and non numeric cells',()=>{assert.deepEqual(numericSummary([{x:'2'},{x:'4'},{x:''},{x:'no'}]).x,{count:2,sum:6,min:2,max:4,mean:3})});
test('only verified paid plan names allowed',()=>{assert.equal(planAllows('free'),false);assert.equal(planAllows('pro'),true);assert.equal(planAllows('admin'),false)});
async function invoke(url,method='GET',headers={}){let status,body;const req={url,method,headers};const res={setHeader(){},status(n){status=n;return this},json(v){body=v;return this}};await handler(req,res);return {status,body}}
test('unknown backend route denied',async()=>assert.equal((await invoke('/api/index?action=evil')).status,404));
test('cloud workspace fails closed when backend not configured',async()=>{const d=await invoke('/api/index?action=workspaces');assert.notEqual(d.status,200);assert.ok(d.body.error)});
test('billing config never exposes secrets',async()=>{process.env.STRIPE_SECRET_KEY='sk_live_never_expose';const d=await invoke('/api/index?action=config');assert.equal(d.body.billingMode,'unavailable');assert.ok(!JSON.stringify(d.body).includes('sk_live'));delete process.env.STRIPE_SECRET_KEY});
