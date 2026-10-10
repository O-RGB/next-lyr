import test from "node:test";
import assert from "node:assert/strict";
import {normalizeBlockEffect,groupEffectBlocks,type BlockEffect,type PlaybackFrameAtlas} from "../src/lib/block-effects/types";
import {effectAtlasRecipe,effectAtlasRoles,usedEffectAtlasRoles} from "../src/lib/block-effects/catalog";
import {layoutSkyActors,skyLightningVisible} from "../src/lib/block-effects/weather";
import {collectEffectAtlases,frameAtlasIdentity} from "../src/lib/block-effects/frames";
import {materializeAtlasPayloads,selectPlaybackAtlases} from "../src/lib/block-effects/assets";
import {buildPlaybackKlyrXml} from "../src/lib/karaoke/lyrics-core/xml";
import {buildYoutubePlayback} from "../src/lib/stickers/playback-assets";
import {cellsFromLine} from "../src/lib/karaoke/inline-content";
import {resizeEffectRun,resolveEffectSelection} from "../src/lib/block-effects/editor";
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
test('weather styles reuse a single cloud of each color and the approved lightning asset',()=>{
 assert.deepEqual(effectAtlasRoles(styles[2]),['edge','cloud','lightning']);
 assert.deepEqual(effectAtlasRoles(styles[5]),['edge','cloud','birds']);
 assert.equal(effectAtlasRecipe('rain','lightning').src,effectAtlasRecipe('lightning').src);
 assert.equal(frameAtlasIdentity('rain','lightning'),frameAtlasIdentity('lightning'));
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
test('storm lightning flashes briefly while reduced motion remains static',()=>{
 assert.equal(skyLightningVisible(0),true);assert.equal(skyLightningVisible(100),false);
 assert.equal(skyLightningVisible(180),true);assert.equal(skyLightningVisible(500),false);
 assert.equal(skyLightningVisible(1900),true);assert.equal(skyLightningVisible(500,true),true);
});
test('all six weather choices package six unique binaries even alongside standalone lightning',async()=>{
 const document:LyricsDocument={source:'MP3',timeBase:{kind:'seconds'},info:{},lines:[words([...styles,{type:'lightning',connected:true}])]};
 let reads=0;
 const assets=await collectEffectAtlases(document,async()=>{
  const bytes=new Uint8Array(24),view=new DataView(bytes.buffer);view.setUint32(0,0x89504e47);view.setUint32(16,256);view.setUint32(20,256);bytes[8]=++reads;return new Blob([bytes]);
 });
 assert.equal(reads,6);assert.equal(assets.length,7);assert.equal(usedEffectAtlasRoles(document.lines).length,7);
 const xml=buildPlaybackKlyrXml(document,[],assets);
 assert.equal((xml.match(/<SPRITE /g)??[]).length,7);assert.equal((xml.match(/<DATA ref=/g)??[]).length,1);
 assert(xml.includes('variant="storm"'));assert(xml.includes('variant="birds"'));
 const output=buildYoutubePlayback({youtubeId:'video',info:{},lyrics:[],chords:[],document,assets:[],effectAtlases:assets});
 assert.equal(output.data.effects!.atlases.filter(asset=>asset.base64).length,6);
 assert.equal(materializeAtlasPayloads(output.data.effects!.atlases,true).filter(asset=>asset.base64).length,7);
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
