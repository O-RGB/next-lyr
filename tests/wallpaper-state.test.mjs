import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWallpaperPlayback} from '../src/modules/wallpaper/wallpaper-playback.ts';
import {createWallpaperAutosave} from '../src/modules/wallpaper/wallpaper-autosave.ts';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}};
test('autosave coalesces gestures, serializes writes and flushes the latest value before close',async()=>{
 const gate=deferred(),writes=[],states=[];let active=0,maxActive=0;
 const save=createWallpaperAutosave(async value=>{active++;maxActive=Math.max(maxActive,active);writes.push(value);if(value===1)await gate.promise;active--;},state=>states.push(state),10000);
 save.schedule(1);const flushing=save.flush();save.schedule(2);save.schedule(3);gate.resolve();await flushing;await save.flush();assert.deepEqual(writes,[1,3]);assert.equal(maxActive,1);assert.equal(states.at(-1),'saved');
});
test('failed autosave retains pending data for retry',async()=>{let fail=true;const writes=[];const save=createWallpaperAutosave(async value=>{if(fail)throw Error('disk full');writes.push(value)},()=>{},10000);save.schedule(8);await assert.rejects(save.flush(),/disk full/);fail=false;await save.flush();assert.deepEqual(writes,[8]);});
test('rapid backward scrub only plays from the final target, even when Play is pressed immediately',async()=>{
 let playing=true,position=15000;const seeks=[],plays=[],gate=deferred();
 const playback=createWallpaperPlayback({isPlaying:()=>playing,pause:()=>{playing=false},play:()=>{playing=true;plays.push(position)},seek:async ms=>{seeks.push(ms);await gate.promise;position=ms},preview:()=>{},error:error=>{throw error}},10000);
 playback.seek(12000);playback.seek(1000);playback.toggle();gate.resolve();await delay(0);assert.deepEqual(seeks,[1000]);assert.deepEqual(plays,[1000]);playback.dispose();
});
test('in-flight old seek cannot resume before a newer backward seek finishes',async()=>{
 let playing=true,position=15000;const gates=[deferred(),deferred()],seeks=[],plays=[];
 const playback=createWallpaperPlayback({isPlaying:()=>playing,pause:()=>{playing=false},play:()=>{playing=true;plays.push(position)},seek:async ms=>{const index=seeks.length;seeks.push(ms);await gates[index].promise;position=ms},preview:()=>{},error:error=>{throw error}},0);
 playback.seek(12000);await delay(5);playback.seek(2000);gates[0].resolve();await delay(5);assert.deepEqual(plays,[]);assert.deepEqual(seeks,[12000,2000]);gates[1].resolve();await delay(5);assert.deepEqual(plays,[2000]);playback.dispose();
});
test('paused seek stays paused and lifecycle reactivation still accepts input',async()=>{let playing=false,position=0,plays=0;const playback=createWallpaperPlayback({isPlaying:()=>playing,pause:()=>{playing=false},play:()=>{playing=true;plays++},seek:async ms=>{position=ms},preview:()=>{},error:error=>{throw error}},0);playback.dispose();playback.activate();playback.seek(3000);await delay(5);assert.equal(position,3000);assert.equal(plays,0);playback.toggle();await delay(5);assert.equal(plays,1);assert.equal(position,3000);playback.dispose();});
