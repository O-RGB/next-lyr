import test from "node:test";
import assert from "node:assert/strict";
import { EFFECT_CHOICES, normalizeBlockEffect, groupEffectBlocks, type BlockEffect } from "../src/lib/block-effects/types";
import { effectAtlasRoles, effectAtlasRecipe, supportsEffectAtlasRole } from "../src/lib/block-effects/catalog";
import { layoutSkyActors } from "../src/lib/block-effects/weather";
import { stormEvent, meteorEvent, atmosphereEventSignature } from "../src/lib/block-effects/events";
import { collectEffectAtlases, frameAtlasIdentity } from "../src/lib/block-effects/frames";
import { buildPlaybackKlyrXml } from "../src/lib/karaoke/lyrics-core/xml";
import { buildYoutubePlayback } from "../src/lib/stickers/playback-assets";
import { cellsFromLine } from "../src/lib/karaoke/inline-content";
import { applySelectedEffect } from "../src/lib/block-effects/editor";
import type { LyricsDocument } from "../src/lib/karaoke/lyrics-core/types";
const effects = EFFECT_CHOICES.flatMap(choice => choice.effect ? [choice.effect] : []);
const words = (values: BlockEffect[]) => values.map((effect,index) => ({ text:'คำ',at:index+1,index,lineIndex:0,effect }));

test('all thirty presets normalize and keep separate adjacent variants', () => {
  assert.equal(EFFECT_CHOICES.length,31);
  assert.equal(new Set(EFFECT_CHOICES.map(choice=>choice.key)).size,31);
  for(const effect of effects) assert.deepEqual(normalizeBlockEffect(effect),effect);
  assert.equal(normalizeBlockEffect({type:'night',variant:'storm'})?.variant,undefined);
  assert.equal(normalizeBlockEffect({type:'night',variant:'plain'})?.variant,undefined);
  assert.deepEqual(groupEffectBlocks(words([{type:'night',variant:'stars',connected:true},{type:'night',variant:'meteors',connected:true}])).map(run=>run.effect.variant),['stars','meteors']);
});
test('decorations remain inside the selected span, below the lyric size and capped at three', () => {
  for(const effect of effects) for(const span of [10,40,200,2000]) for(const time of [0,800,3000,7000]) {
    const actors=layoutSkyActors(effect,span,32,time,false,'range');
    assert(actors.length<=3);
    for(const actor of actors){
      assert(actor.left>=0);assert(actor.left+actor.width<=span+1e-6);
      assert(actor.width<32&&actor.height<32);assert(actor.opacity>0&&actor.opacity<=1);
      assert(effectAtlasRoles(effect).includes(actor.role));
    }
  }
});
test('clouds are raised slightly while short storms stay sparse and long storms get three sites', () => {
  const cloudy:BlockEffect={type:'rain',variant:'clouds',connected:true},storm:BlockEffect={...cloudy,variant:'storm'};
  assert.equal(layoutSkyActors(cloudy,200,40)[0].top,-40*1.55);
  assert.equal(layoutSkyActors(storm,40,40).length,1);
  assert.equal(layoutSkyActors(storm,2000,40).length,3);
});
test('seeded storms never repeat the previous cloud and use a second site in only one in five long episodes', () => {
  for(const key of ['one','two','three']) for(const count of [2,3]) {
    const chosen=Array.from({length:96},(_,epoch)=>stormEvent(epoch*3200+100,key,count,true).primary);
    assert(chosen.every((value,index)=>index===0||value!==chosen[index-1]));
    assert(new Set(chosen).size===count);
    assert.deepEqual(chosen,Array.from({length:96},(_,epoch)=>stormEvent(epoch*3200+100,key,count,true).primary));
  }
  const long=Array.from({length:25},(_,epoch)=>stormEvent(epoch*3200+100,'long',3,true));
  assert.equal(long.filter(event=>event.secondary>=0).length,5);
  assert(long.every(event=>event.secondary<0||event.secondary!==event.primary));
  assert(long.every((event,index)=>event.secondary<0||event.secondary!==stormEvent((index+1)*3200+100,'long',3,true).primary));
  assert(Array.from({length:25},(_,epoch)=>stormEvent(epoch*3200+100,'short',1,false)).every(event=>event.secondary<0));
});
test('event signatures change at flash boundaries and reduced motion freezes the site and removes meteors', () => {
  const signatures=new Set(Array.from({length:320},(_,i)=>atmosphereEventSignature({type:'rain',variant:'storm'},i*10,'scene',false)));
  assert(signatures.size>1);
  assert.deepEqual(stormEvent(0,'scene',3,true,true),stormEvent(99999,'scene',3,true,true));
  for(const time of [0,1000,4000,7000])assert.equal(meteorEvent(time,'scene',true).visible,false);
  assert(Array.from({length:620},(_,i)=>meteorEvent(i*10,'scene')).some(event=>event.visible));
});
test('all families package eighteen unique sprite binaries for thirty role bindings, with complete export references', async () => {
  let reads=0;
  const document:LyricsDocument={source:'MP3',timeBase:{kind:'seconds'},info:{},lines:[words(effects)]};
  const atlases=await collectEffectAtlases(document,async()=>{
    const bytes=new Uint8Array(24),view=new DataView(bytes.buffer);view.setUint32(0,0x89504e47);view.setUint32(16,256);view.setUint32(20,256);bytes[8]=++reads;return new Blob([bytes]);
  });
  assert.equal(reads,18);assert.equal(atlases.length,30);
  const xml=buildPlaybackKlyrXml(document,[],atlases);
  assert.equal((xml.match(/<DATA ref=/g)??[]).length,12);
  const output=buildYoutubePlayback({youtubeId:'video',info:{},lyrics:[],chords:[],document,assets:[],effectAtlases:atlases});
  assert.equal(output.data.effects!.atlases.filter(atlas=>atlas.base64).length,18);
  for(const effect of effects)for(const role of effectAtlasRoles(effect))assert(supportsEffectAtlasRole(effect.type,role));
  assert.equal(supportsEffectAtlasRole('fire','storm'),false);assert.equal(supportsEffectAtlasRole('rain','lightning'),true);
});
test('component identities share moon, stars, butterflies, clouds and sun across themes', () => {
  assert.equal(frameAtlasIdentity('night'),frameAtlasIdentity('snow','moon'));
  assert.equal(frameAtlasIdentity('stars'),frameAtlasIdentity('night','stars'));
  assert.equal(frameAtlasIdentity('stars'),frameAtlasIdentity('aurora','stars'));
  assert.equal(frameAtlasIdentity('butterflies'),frameAtlasIdentity('petals','butterflies'));
  assert.equal(frameAtlasIdentity('sunset'),frameAtlasIdentity('sunny'));
  assert.equal(frameAtlasIdentity('sunny'),frameAtlasIdentity('autumn','sun'));
  assert.equal(effectAtlasRecipe('night','cloud').src,effectAtlasRecipe('sunny','cloud').src);
});
test('applying a night variation changes only selected effects and preserves existing timestamp slots', () => {
  const original=words([{type:'fire',connected:true},{type:'fire',connected:true},{type:'fire',connected:true}]);
  const cells=cellsFromLine(original),next=applySelectedEffect(cells,new Set([cells[0].key,cells[2].key]),{type:'night',variant:'meteors',connected:true});
  assert.deepEqual(next.map(cell=>cell.originalIndex),[0,1,2]);assert.equal(next[1],cells[1]);
  assert.deepEqual(groupEffectBlocks(next).map(run=>[run.start,run.end,run.effect.type]),[[0,0,'night'],[1,1,'fire'],[2,2,'night']]);
  assert.deepEqual(original.map(word=>word.at),[1,2,3]);
});
