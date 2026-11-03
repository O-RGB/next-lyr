import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fitWallpaperBlocks,moveWallpaperBlock} from '../src/modules/wallpaper/wallpaper-block-model.ts';
const scene=id=>({id,assetId:id,startMs:0,transition:{type:'fade',durationMs:1000}});
const doc=(n=1)=>({scenes:Array.from({length:n},(_,i)=>scene(String(i)))});
test('one image fills the full song and adding images redistributes every interval without gaps',()=>{
 const one=fitWallpaperBlocks(doc(),20000);assert.equal(one.scenes[0].startMs,0);assert.equal(one.scenes[0].endMs,20000);
 const two=fitWallpaperBlocks({...one,scenes:[...one.scenes,scene('b')]},20000);assert.deepEqual(two.scenes.map(s=>[s.startMs,s.endMs]),[[0,10000],[10000,20000]]);
 const three=fitWallpaperBlocks(doc(3),10001);assert.equal(three.scenes[0].startMs,0);assert.equal(three.scenes.at(-1).endMs,10001);for(let i=1;i<3;i++)assert.equal(three.scenes[i].startMs,three.scenes[i-1].endMs);
});
test('global transitions affect all images while per-image animation remains attached',()=>{
 const d=doc(3);d.scenes[1].motion={type:'zoom-in',amount:.12};const noFade=fitWallpaperBlocks(d,12000,0);assert(noFade.scenes.every(s=>s.transition.durationMs===0));assert.deepEqual(noFade.scenes[1].motion,d.scenes[1].motion);
 const fade=fitWallpaperBlocks(d,3000,5000);assert(fade.scenes.every(s=>s.transition.durationMs===1000));assert.throws(()=>fitWallpaperBlocks(d,2999));
});
test('reorder keeps animations with their images and deletion refills the entire song',()=>{
 const d=doc(3);d.scenes[0].motion={type:'zoom-out',amount:.2};const moved=moveWallpaperBlock(d,0,2,12000);assert.deepEqual(moved.scenes.map(s=>s.id),['1','2','0']);assert.deepEqual(moved.scenes[2].motion,d.scenes[0].motion);
 const deleted=fitWallpaperBlocks({...moved,scenes:moved.scenes.slice(0,2)},12000);assert.deepEqual(deleted.scenes.map(s=>[s.startMs,s.endMs]),[[0,6000],[6000,12000]]);
});
