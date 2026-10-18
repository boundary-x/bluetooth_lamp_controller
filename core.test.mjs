import assert from 'node:assert/strict';
import {packet,effect,flowFrame,validateFlow,LatestWriter} from './core.mjs';
assert.equal(packet([255,0,128]),'R255G000B128\n');assert.equal(packet([-2,300,NaN]),'R000G255B000\n');assert.equal(new TextEncoder().encode(packet([0,0,0])).length,13);
for(const name of ['breath','candle','lava','ocean','rainbow','firefly'])for(let t=0;t<20;t+=.017){const a=effect(name,t,[255,100,10]);assert.equal(a.length,3);assert.ok(a.every(x=>Number.isFinite(x)&&x>=0&&x<=255));}
const steps=[{color:'#ff0000',fade:2,hold:1},{color:'#0000ff',fade:2,hold:1}];
assert.deepEqual(flowFrame(steps,1,[0,0,0],false).color,[127.5,0,0]);assert.deepEqual(flowFrame(steps,4,[0,0,0],false).color,[127.5,0,127.5]);assert.equal(flowFrame(steps,6,[0,0,0],false).done,true);assert.deepEqual(flowFrame(steps,6,[0,0,0],true).color,[0,0,255]);
assert.throws(()=>validateFlow({format:'boundaryx-color-flow',version:1,loop:true,steps:[{color:'#ffffff',fade:0,hold:0}]}));assert.throws(()=>validateFlow({format:'boundaryx-color-flow',version:1,loop:true,steps:[{color:'<img>',fade:1,hold:1}]}));assert.deepEqual(validateFlow({format:'boundaryx-color-flow',version:1,loop:true,steps}).steps,steps);
let release,writes=[],sent=[];const w=new LatestWriter(p=>{writes.push(p);return new Promise(r=>release=r);},p=>sent.push(p),e=>{throw e;});const running=w.send('a');w.send('b');w.send('c');assert.deepEqual(writes,['a']);release();await new Promise(r=>setImmediate(r));assert.deepEqual(writes,['a','c']);release();await running;assert.deepEqual(sent,['a','c']);
let errors=0;const failed=new LatestWriter(async()=>{throw Error('lost');},()=>assert.fail(),()=>errors++);await failed.send('x');assert.equal(errors,1);assert.equal(failed.closed,true);
console.log('PASS: protocol, effect ranges, timeline transitions/repeat, import validation, serialized latest-frame writes and failure handling');
