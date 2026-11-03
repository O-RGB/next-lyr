import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resizeClip,resizeFade,reorderClip} from '../src/modules/wallpaper/timeline-model.ts';
const doc={scenes:[{id:'a',assetId:'a',startMs:0,endMs:5000,transition:{type:'fade',durationMs:1000}},{id:'b',assetId:'b',startMs:5000,endMs:10000,transition:{type:'fade',durationMs:1000}},{id:'c',assetId:'c',startMs:10000,endMs:15000,transition:{type:'fade',durationMs:1000}}]};
test('trim clamps both edges to one second and ripples following clips without losing their length',()=>{const a=resizeClip(doc,0,'end',-50000,20000);assert.equal(a.scenes[0].endMs,1000);assert.equal(a.scenes[1].startMs,1000);assert.equal(a.scenes[1].endMs,6000);const b=resizeClip(doc,1,'start',50000,20000);assert.equal(b.scenes[1].startMs,9000);assert.equal(b.scenes[1].endMs,10000);const c=resizeClip(doc,0,'end',50000,20000);assert.equal(c.scenes.at(-1).endMs,20000);});
test('fade clamps independently and reorder carries durations and effects with images',()=>{assert.equal(resizeFade(doc,1,-9999,20000).scenes[1].transition.durationMs,100);assert.equal(resizeFade(doc,1,99999,20000).scenes[1].transition.durationMs,5000);const trimmed=resizeClip(doc,0,'end',-3000,20000);const moved=reorderClip(trimmed,0,2,20000);assert.deepEqual(moved.scenes.map(s=>s.id),['b','c','a']);assert.deepEqual(moved.scenes.map(s=>s.endMs-s.startMs),[5000,5000,2000]);});
test('repeated resize gestures retain all clips at >=1s within song bounds',()=>{let d=doc;for(let i=0;i<300;i++){d=resizeClip(d,i%3,i%2?'start':'end',(i%7-3)*1700,20000);for(let n=0;n<3;n++){const s=d.scenes[n];assert(s.endMs-s.startMs>=1000);assert(s.transition.durationMs<=s.endMs-s.startMs);assert(s.startMs>=0);assert(s.endMs<=20000);if(n)assert.equal(s.startMs,d.scenes[n-1].endMs);}}});

test('dragging a middle head in either direction moves the shared boundary without gaps',()=>{
 for(const delta of [-50000,-2000,2000,50000]){
  const result=resizeClip(doc,1,'start',delta,20000);
  assert.equal(result.scenes[0].endMs,result.scenes[1].startMs);
  assert.equal(result.scenes[1].endMs,result.scenes[2].startMs);
  assert(result.scenes[0].endMs-result.scenes[0].startMs>=1000);
  assert(result.scenes[1].endMs-result.scenes[1].startMs>=1000);
 }
 assert.equal(resizeClip(doc,0,'start',3000,20000).scenes[0].startMs,0);
 const longFade={...doc,scenes:doc.scenes.map(s=>({...s,transition:{type:'fade',durationMs:4000}}))};
 const result=resizeClip(longFade,1,'start',-50000,20000);
 assert.equal(result.scenes[0].transition.durationMs,1000);
});
