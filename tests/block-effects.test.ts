import test from 'node:test';
import assert from 'node:assert/strict';
import { EFFECT_TYPES,groupEffectBlocks,normalizeBlockEffect,type BlockEffect,type PlaybackFrameAtlas } from '../src/lib/block-effects/types';
import { frameAtTime,effectGeometry,effectRecipe,EFFECT_RENDERER } from '../src/lib/block-effects/catalog';
import { inspectFrameAnchors,inspectConnectedFireShapes,atlasFrameRects,safeFrameRects,collectEffectAtlases,registerPlaybackAtlases,frameAtlasIdentity,type LoadedAtlas } from '../src/lib/block-effects/frames';
import { placeEffectRuns,paintFrameSurface } from '../src/components/lyrics/block-effect-layer';
import { cellsFromLine,moveCellContent } from '../src/lib/karaoke/inline-content';
import { buildPlaybackKlyrXml } from '../src/lib/karaoke/lyrics-core/xml';
import { buildYoutubePlayback } from '../src/lib/stickers/playback-assets';
import { LYRIC_APPEARANCE, withEffectTextStyle } from '../src/lib/block-effects/appearance';
import { drawCanvasText, type CanvasTextStyle } from '../src/components/lyrics/karaoke-lyrics/canvas-renderer';
import type { LyricsDocument } from '../src/lib/karaoke/lyrics-core/types';
const fire:BlockEffect={type:'fire',connected:true};
const line=(effects:Array<BlockEffect|undefined>)=>effects.map((effect,index)=>({text:String(index+1),at:index+1,index,lineIndex:0,effect}));
const doc:LyricsDocument={source:'MP3',timeBase:{kind:'seconds'},info:{},lines:[line([fire,fire,undefined,fire])]};
const atlas:PlaybackFrameAtlas={type:'fire',id:'sprite',mime:'image/png',width:16,height:16,columns:4,rows:4,frames:16,fps:16,base64:'AQID'};
const baseAtlas:PlaybackFrameAtlas={...atlas,role:'base',id:'base-sprite'};
test('five adjacent blocks join; blocks 1,2,4 form two separate runs',()=>{
 assert.equal(groupEffectBlocks(line([fire,fire,fire,fire,fire])).length,1);
 assert.deepEqual(groupEffectBlocks(doc.lines[0].map((w,index)=>({...w,index,lineIndex:0}))).map(r=>[r.start,r.end]),[[0,1],[3,3]]);
});
test('disconnected and different effects remain separate',()=>{
 assert.equal(groupEffectBlocks(line([fire,{...fire,connected:false},fire])).length,3);
 assert.equal(groupEffectBlocks(line([fire,{type:'lightning',connected:true},fire])).length,3);
});
test('hidden slots and line boundaries never join effects accidentally',()=>{
 assert.equal(groupEffectBlocks([{index:0,lineIndex:0,effect:fire},{index:2,lineIndex:0,effect:fire}]).length,2);
 assert.equal(groupEffectBlocks([{index:0,lineIndex:0,effect:fire},{index:1,lineIndex:1,effect:fire}]).length,2);
});
test('text and images share a run, using its lowest baseline',()=>{
 const placements=placeEffectRuns([{word:{index:0,lineIndex:0,effect:fire},left:20,top:5,width:30,height:16},
 {word:{index:1,lineIndex:0,effect:fire},left:50,top:0,width:24,height:30}],'mixed');
 assert.equal(placements.length,1);assert.equal(placements[0].top+effectGeometry(54,30).baseline,30);
});
test('dragging carries content and effect but leaves timestamp slot indices fixed',()=>{
 const moved=moveCellContent(cellsFromLine(line([fire,undefined,{type:'lightning',connected:true}])),2,0);
 assert.deepEqual(moved.map(c=>c.effect?.type),['lightning','fire',undefined]);assert.deepEqual(moved.map(c=>c.originalIndex),[0,1,2]);
});
test('six effect families are offered; untreated lyrics retain classic yellow',()=>{
 assert.deepEqual(EFFECT_TYPES,['fire','lightning','hearts','leaves','rain','sunny']);assert.equal(normalizeBlockEffect({type:'unknown'}),undefined);
 assert.equal(LYRIC_APPEARANCE.idle[0],'#fcfe17');assert.equal(LYRIC_APPEARANCE.sung[0],'#0000ff');
});
test('frame playback advances through distinct source cells and wraps exactly',()=>{
 assert.deepEqual(Array.from({length:16},(_,i)=>frameAtTime(i*1000/24+.01,16,24)),Array.from({length:16},(_,i)=>i));
 assert.equal(frameAtTime(16000/24+.01,16,24),0);assert.equal(frameAtTime(1234,16,24,true),8);
 assert.equal(effectRecipe('fire').atlas.fps,16);assert.equal(effectRecipe('lightning').atlas.fps,20);
});
test('fractional atlas divisions cover every pixel once without mixing adjacent frames',()=>{
 const rects=atlasFrameRects(1254,1254,4,4);assert.equal(rects.length,16);
 assert.equal(rects[3].x+rects[3].width,1254);assert.equal(rects[15].y+rects[15].height,1254);
 assert.equal(rects.reduce((area,r)=>area+r.width*r.height,0),1254*1254);
});
test('opaque foot anchors remain fixed across different drawn silhouettes',()=>{
 const pixels=new Uint8ClampedArray(16*8*4);
 for(let x=2;x<6;x++)for(let y=2;y<=6;y++)pixels[(y*16+x)*4+3]=255;
 for(let x=10;x<14;x++)for(let y=0;y<=6;y++)pixels[(y*16+x)*4+3]=255;
 const anchors=inspectFrameAnchors(pixels,16,8,2,1);assert.equal(anchors[0].y,7);assert.equal(anchors[1].y,7);
 assert.equal(anchors[0].x,3.5);assert.equal(anchors[1].x,3.5);
});
test('export includes used frame atlas once, preserving loop metadata; no unused atlas or vector animation',()=>{
 const xml=buildPlaybackKlyrXml(doc,[],[atlas,atlas,baseAtlas,baseAtlas,{...atlas,type:'lightning'}]);
 assert.equal((xml.match(/<SPRITE /g)||[]).length,1);assert.equal((xml.match(/<EFFECT /g)||[]).length,3);
 assert(xml.includes(EFFECT_RENDERER));assert(xml.includes('frames="16"'));assert(!xml.includes('<animate'));assert(!xml.includes('<svg'));
 assert.throws(()=>buildPlaybackKlyrXml(doc,[],[]),/missing-frame-atlas/);
});
test('YKR is playback data and carries the used atlas once',()=>{
 const file=buildYoutubePlayback({youtubeId:'video',info:{},lyrics:[],chords:[],document:doc,assets:[],effectAtlases:[atlas,atlas,baseAtlas,baseAtlas]});
 assert.equal(file.data.effects!.atlases.length,1);assert.equal(file.data.effects!.atlases[0].base64,'AQID');assert(!('id' in file));
});
test('atlas collection reads each used asset once and preserves binary pixels',async()=>{
 const bytes=new Uint8Array(24);new DataView(bytes.buffer).setUint32(0,0x89504e47);new DataView(bytes.buffer).setUint32(16,1254);new DataView(bytes.buffer).setUint32(20,1254);
 let count=0;const assets=await collectEffectAtlases(doc,async()=>{count++;return new Blob([bytes]);});
 assert.equal(count,1);assert.equal(assets.length,1);assert.equal(assets[0].width,1254);assert.equal(atob(assets[0].base64).length,24);
});

test('frame sampling excludes small gutters so adjacent-row remnants cannot bleed into a frame',()=>{
 const raw=atlasFrameRects(1254,1254,4,4),safe=safeFrameRects(1254,1254,4,4);
 for(let i=0;i<16;i++){assert(safe[i].x>raw[i].x);assert(safe[i].y>=raw[i].y+6);assert(safe[i].x+safe[i].width<raw[i].x+raw[i].width);assert(safe[i].y+safe[i].height<raw[i].y+raw[i].height);}
});

test('compact horizontal fire frames stay attached without rotation or a separate underline',()=>{
 const translations:number[][]=[],angles:number[]=[],sources:number[][]=[],destinations:number[][]=[];
 const ctx={setTransform(){},clearRect(){},save(){},restore(){},scale(){},
   beginPath(){},rect(){},clip(){},translate(x:number,y:number){translations.push([x,y]);},rotate(angle:number){angles.push(angle);},
   drawImage(...args:unknown[]){sources.push(args.slice(1,5) as number[]);destinations.push(args.slice(5,9) as number[]);},globalAlpha:1};
 const canvas={width:0,height:0,getContext(){return ctx;}} as unknown as HTMLCanvasElement;
 const geometry=effectGeometry(200,40),placement={key:'attached',effect:fire,left:0,top:0,width:geometry.width,height:geometry.height};
 const loaded={image:{},width:400,height:400,columns:4,rows:4,frames:16,fps:16,
   shapes:Array.from({length:16},()=>({left:0,top:10,width:100,height:80,emitterY:70})),
   rects:atlasFrameRects(400,400,4,4),anchors:Array.from({length:16},()=>({x:50,y:90,top:10}))} as LoadedAtlas;
 const previous=Object.getOwnPropertyDescriptor(globalThis,'devicePixelRatio');
 Object.defineProperty(globalThis,'devicePixelRatio',{configurable:true,value:1});
 try{
  paintFrameSurface(canvas,loaded,placement,0,false);
  const firstRoots=translations.slice(0,2),firstAngles=angles.slice(0,2),firstSources=sources.slice(0,2);
  assert(firstRoots[0][0]>geometry.outset);assert(firstRoots[1][0]<geometry.width-geometry.outset);
  assert(firstRoots.every(([,y])=>y<geometry.baseline));assert.equal(firstAngles.length,0);
  assert.equal(translations.length,2);assert.equal(destinations.length,2);
  translations.length=0;angles.length=0;sources.length=0;destinations.length=0;
  paintFrameSurface(canvas,loaded,placement,1000/16+.01,false);
  assert.deepEqual(translations.slice(0,2),firstRoots);assert.deepEqual(angles.slice(0,2),firstAngles);
  assert.notDeepEqual(sources.slice(0,2),firstSources);
 }finally{if(previous)Object.defineProperty(globalThis,'devicePixelRatio',previous);else Reflect.deleteProperty(globalThis,'devicePixelRatio');}
});

test('switching projects changes the atlas identity even for an existing effect run',()=>{
 const builtin=frameAtlasIdentity('fire');
 try{
  registerPlaybackAtlases([atlas]);assert.notEqual(frameAtlasIdentity('fire'),builtin);
  registerPlaybackAtlases([{...atlas,id:'second-project',fps:30}]);assert(frameAtlasIdentity('fire').startsWith('second-project:'));
 }finally{registerPlaybackAtlases();}
 assert.equal(frameAtlasIdentity('fire'),builtin);
});

test('export keeps its document assets even if another project is registered for playback',async()=>{
 const bytes=new Uint8Array(24),view=new DataView(bytes.buffer);view.setUint32(0,0x89504e47);view.setUint32(16,1254);view.setUint32(20,1254);
 registerPlaybackAtlases([atlas]);
 try{
  let reads=0;const result=await collectEffectAtlases(doc,async()=>{reads++;return new Blob([bytes]);});
  assert.equal(reads,1);assert.notEqual(result[0].id,atlas.id);assert.equal(result[0].fps,16);
 }finally{registerPlaybackAtlases();}
});

test('live, editor and preview effect lettering share a vivid idle face while plain lyric settings stay intact',()=>{
 const plain:CanvasTextStyle={fontSize:30,fontWeight:700,fontFamily:'Custom Thai',strokeWidth:2,
  unsungFill:'#fcfe17',sungFill:'#0000ff',unsungStroke:'#000000',sungStroke:'#ffffff'};
 assert.equal(withEffectTextStyle(plain),plain);
 const themed=withEffectTextStyle(plain,'fire');
 assert.notDeepEqual(themed.unsungGradient,themed.sungGradient);
 assert.equal(themed.fontFamily,plain.fontFamily);assert.equal(themed.fontWeight,plain.fontWeight);
 assert.equal(themed.unsungGradient!.at(-1),'#ffb12a');assert.equal(themed.unsungStroke,themed.sungStroke);
 const strokes:Array<{color:string;blur:number}>=[];
 const ctx={save(){},restore(){},translate(){},scale(){},measureText(){return {width:50};},
  createLinearGradient(){return {addColorStop(){}};},strokeText(this:{shadowColor:string;shadowBlur:number}){strokes.push({color:this.shadowColor,blur:this.shadowBlur});},fillText(){},
  shadowColor:'',shadowBlur:0} as unknown as CanvasRenderingContext2D;
 drawCanvasText(ctx,'ร้อง',0,0,0,100,themed);
 assert.equal(strokes.length,1);assert.equal(strokes[0].color,themed.glowColor);assert.equal(strokes[0].blur,themed.glowBlur);
});

test('a detached fleck cannot move the fire emitter away from the connected flame root',()=>{
 const pixels=new Uint8ClampedArray(12*12*4);
 for(let x=4;x<10;x++)for(let y=3;y<9;y++)pixels[(y*12+x)*4+3]=255;
 pixels[(10*12)*4+3]=255;pixels[(11*12)*4+3]=255;
 const result=inspectConnectedFireShapes(pixels,12,[{x:0,y:0,width:12,height:12}],[])[0];
 assert.equal(result.left,4);assert.equal(result.top,3);assert.equal(result.width,6);assert.equal(result.height,6);
 assert(result.emitterX!>=4&&result.emitterX!<5);assert(result.emitterY>7);
});
