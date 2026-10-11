import test from "node:test";
import assert from "node:assert/strict";
import {normalizeBlockEffect,groupEffectBlocks,effectIconRole,type BlockEffect,type PlaybackFrameAtlas} from "@next-karaoke/lyrics/effects";
import {effectAtlasRecipe,effectAtlasRoles,usedEffectAtlasRoles,effectGeometry} from "@next-karaoke/lyrics/effects";
import {layoutSkyActors,skyLightningVisible} from "@next-karaoke/lyrics/effects";
import {collectEffectAtlases,frameAtlasIdentity,type LoadedAtlas} from "@next-karaoke/lyrics/effects";
import {materializeAtlasPayloads,selectPlaybackAtlases} from "@next-karaoke/lyrics/effects";
import {buildPlaybackKlyrXml} from "../src/lib/karaoke/lyrics-core/xml";
import {buildYoutubePlayback} from "@next-karaoke/lyrics/format";
import {cellsFromLine} from "../src/lib/karaoke/inline-content";
import {resizeEffectRun,resolveEffectSelection} from "@next-karaoke/lyrics/effects";
import {paintFrameSurface} from "@next-karaoke/lyrics/canvas";
import {stormEvent} from "@next-karaoke/lyrics/effects";
import type {LyricsDocument} from "../src/lib/karaoke/lyrics-core/types";
const styles:BlockEffect[]=[{type:'rain',connected:true},{type:'rain',variant:'clouds',connected:true},{type:'rain',variant:'storm',connected:true},
 {type:'sunny',connected:true},{type:'sunny',variant:'clouds',connected:true},{type:'sunny',variant:'birds',connected:true}];
const words=(effects:BlockEffect[])=>effects.map((effect,index)=>({text:'คำ',index,lineIndex:0,at:index+1,effect}));
test('existing plain rain remains compatible and weather variants are validated by family',()=>{
 assert.deepEqual(normalizeBlockEffect({type:'rain'}),{type:'rain',connected:true});
 assert.equal(normalizeBlockEffect({type:'rain',variant:'birds'})?.variant,undefined);
 assert.equal(normalizeBlockEffect({type:'sunny',variant:'storm'})?.variant,undefined);
 for(const style of styles)assert.deepEqual(normalizeBlockEffect(style),style);
});
test('adjacent weather groups merge only when their type and style both match',()=>{
 const cells=words([styles[0],styles[1],styles[1],styles[2],styles[4],styles[5]]);
 assert.deepEqual(groupEffectBlocks(cells).map(run=>[run.start,run.end,run.effect.variant]),[[0,0,undefined],[1,2,'clouds'],[3,3,'storm'],[4,4,'clouds'],[5,5,'birds']]);
});
test('weather styles share clouds and retain legacy lightning while storm uses its joined sprite',()=>{
 assert.deepEqual(effectAtlasRoles(styles[2]),['edge','storm']);
 assert.deepEqual(effectAtlasRoles(styles[5]),['edge','cloud','birds']);
 assert.equal(effectAtlasRecipe('rain','lightning').src,effectAtlasRecipe('lightning').src);
 assert.equal(frameAtlasIdentity('rain','lightning'),frameAtlasIdentity('lightning'));
 assert.equal(effectIconRole(styles[2]),'storm');
 assert.equal(effectIconRole(styles[1]),'cloud');
 assert.notEqual(effectAtlasRecipe('sunny','cloud').src,effectAtlasRecipe('rain','cloud').src);
 assert.equal(effectAtlasRoles(styles[3]).length,1);
});
test('floating sky objects stay bounded to three and adapt to the selected width',()=>{
 for(const style of styles)for(const span of [10,40,200,2000]){
  const actors=layoutSkyActors(style,span,32);assert(actors.length<=3);
  assert(actors.filter(actor=>actor.role==='edge').length<=1);
  for(const actor of actors.filter(actor=>actor.role!=='lightning')){
   assert(actor.left>=0);assert(actor.left+actor.width<=span+1e-6);assert(actor.top<0);
   assert(actor.width<32);assert(actor.height<32);
   assert(actor.opacity>0&&actor.opacity<1);
  }
 }
 assert.equal(layoutSkyActors(styles[0],200,32).length,0);
 assert.equal(layoutSkyActors(styles[3],200,32).length,1);
 assert(layoutSkyActors(styles[1],2000,32).length>layoutSkyActors(styles[1],40,32).length);
 assert.deepEqual(layoutSkyActors(styles[5],200,32).map(actor=>actor.role),['edge','cloud','birds']);
});
test('storm lightning leaves long quiet intervals while reduced motion remains static',()=>{
 const visible=Array.from({length:320},(_,index)=>skyLightningVisible(index*10)).filter(Boolean).length;
 assert(visible>20&&visible<50);assert.equal(skyLightningVisible(500,true),true);
});
test('joined thundercloud cels keep the cloud in quiet intervals and attach the flash at the same source seam',()=>{
 const draws:Array<{image:unknown;source:unknown[];destination:unknown[];opacity:number}>=[],alphas:number[]=[];
 const ctx={globalAlpha:1,setTransform(){},clearRect(){},translate(){},rotate(){},scale(){},
  save(){alphas.push(this.globalAlpha);},restore(){this.globalAlpha=alphas.pop()!;},
  drawImage(image:unknown,...args:unknown[]){draws.push({image,source:args.slice(0,4),destination:args.slice(4),opacity:this.globalAlpha});}};
 const canvas={width:0,height:0,getContext:()=>ctx} as unknown as HTMLCanvasElement;
 const makeAtlas=(image:string,fps:number)=>({image,frames:16,fps,
  rects:Array.from({length:16},(_,index)=>({x:index%4*100,y:Math.floor(index/4)*100,width:100,height:100})),
  anchors:Array.from({length:16},()=>({x:50,y:90,top:10}))}) as unknown as LoadedAtlas;
 const rain=makeAtlas('rain',16),storm=makeAtlas('storm',16);
 const geometry=effectGeometry(80,40,styles[2]);
 const placement={key:'storm',effect:styles[2],left:0,top:0,width:geometry.width,height:geometry.height};
 const previous=Object.getOwnPropertyDescriptor(globalThis,'devicePixelRatio');
 Object.defineProperty(globalThis,'devicePixelRatio',{configurable:true,value:1});
 const paint=(time:number,reduced=false,effect=styles[2])=>{
  draws.length=0;paintFrameSurface(canvas,rain,{...placement,effect},time,reduced,{storm});
  return draws.filter(draw=>draw.image==='storm');
 };
 try{
  const flash=Array.from({length:320},(_,i)=>i*10).find(time=>stormEvent(time,'storm',1,false).active)!;
  const quiet=Array.from({length:320},(_,i)=>i*10).find(time=>!stormEvent(time,'storm',1,false).active)!;
  const first=paint(flash),second=paint(flash+65);
  assert.equal(first.length,2);assert.equal(second.length,2);
  assert.notDeepEqual(first[0].source,second[0].source);
  assert.equal(first[0].source[0],first[1].source[0]);
  assert.equal(Number(first[0].source[1])+Number(first[0].source[3]),first[1].source[1]);
  assert.equal(Number(first[0].destination[1])+Number(first[0].destination[3]),first[1].destination[1]);
  assert(first[0].opacity>.9);assert.equal(paint(quiet).length,1);
  const still=paint(500,true);assert.equal(still.length,2);assert(still[0].opacity>=.8);
  assert.equal(paint(0,false,styles[1]).length,0);
 }finally{if(previous)Object.defineProperty(globalThis,'devicePixelRatio',previous);else Reflect.deleteProperty(globalThis,'devicePixelRatio');}
});
test('weather, sunset and standalone lightning reuse their shared sun binary while including the joined storm atlas',async()=>{
 const document:LyricsDocument={source:'MP3',timeBase:{kind:'seconds'},info:{},lines:[words([...styles,{type:'lightning',connected:true},{type:'sunset',connected:true}])]};
 let reads=0;
 const assets=await collectEffectAtlases(document,async()=>{
  const bytes=new Uint8Array(24),view=new DataView(bytes.buffer);view.setUint32(0,0x89504e47);view.setUint32(16,256);view.setUint32(20,256);bytes[8]=++reads;return new Blob([bytes]);
 });
 assert.equal(reads,7);assert.equal(assets.length,8);assert.equal(usedEffectAtlasRoles(document.lines).length,8);
 const xml=buildPlaybackKlyrXml(document,[],assets);
 assert.equal((xml.match(/<SPRITE /g)??[]).length,8);assert.equal((xml.match(/<DATA ref=/g)??[]).length,1);
 assert(xml.includes('variant="storm"'));assert(xml.includes('variant="birds"'));
 const output=buildYoutubePlayback({youtubeId:'video',info:{},lyrics:[],chords:[],document,assets:[],effectAtlases:assets});
 assert.equal(output.data.effects!.atlases.filter(asset=>asset.base64).length,7);
 assert.equal(materializeAtlasPayloads(output.data.effects!.atlases,true).filter(asset=>asset.base64).length,8);
});
test('missing components and conflicting shared payloads fail instead of producing incomplete playback',()=>{
 const atlas:PlaybackFrameAtlas={type:'rain',id:'rain',mime:'image/png',width:256,height:256,columns:4,rows:4,frames:16,fps:16,base64:'AQID'};
 assert.throws(()=>selectPlaybackAtlases([words([styles[1]])],[atlas]),/missing-frame-atlas/);
 assert.throws(()=>selectPlaybackAtlases([words([styles[0],{type:'lightning',connected:true}])],[atlas,{...atlas,type:'lightning',base64:'BAUG'}]),/conflicting-frame-atlas/);
});
test('resizing and reopening an unsaved weather group preserves its mode and timestamp slots',()=>{
 const cells=cellsFromLine(words([styles[2],styles[2],styles[0]])),next=resizeEffectRun(cells,groupEffectBlocks(cells)[0],0,2);
 assert(next.every(cell=>cell.effect?.variant==='storm'));
 assert.deepEqual(next.map(cell=>cell.originalIndex),[0,1,2]);
 assert.deepEqual([...resolveEffectSelection(next,{requestedIndices:[0,1]})],['slot-0','slot-1','slot-2']);
});
