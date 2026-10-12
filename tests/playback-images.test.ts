import test from 'node:test';
import assert from 'node:assert/strict';
import { collectPlaybackAssets, buildYoutubePlayback } from '@next-karaoke/lyrics/format';
import { buildPlaybackKlyrXml } from '../src/lib/karaoke/lyrics-core/xml';
import { layoutInlineWords } from '@next-karaoke/lyrics/canvas';
import { buildModifiedMidi } from '../src/lib/karaoke/midi/builder';
import { buildMp3 } from '../src/lib/karaoke/mp3/builder';
import { decodeLyricsBase64 } from '../src/lib/karaoke/mp3/lib';
import type { LyricsDocument } from '../src/lib/karaoke/lyrics-core/types';

const sticker = {id:'one',name:'ภาพ & <one>.png',mime:'image/png',width:100,height:100,bytes:3,originalBytes:3,position:'before' as const};
const doc: LyricsDocument = {source:'MP3',timeBase:{kind:'seconds'},info:{TITLE:'Song',CHARSET:'UTF-8'},lines:[[
 {text:'A',at:1}, {text:'\uFFFC',at:2,kind:'image',sticker}, {text:'B',at:3}, {text:'\uFFFC',at:null,kind:'image',sticker},
]]};

test('playback includes only used images, loads repeated images once, and preserves bytes', async()=>{
 const calls:string[]=[];
 const assets=await collectPlaybackAssets(doc,async(id)=>{calls.push(id);return new Blob([new Uint8Array([1,2,3])]);});
 assert.deepEqual(calls,['one']);assert.equal(assets.length,1);assert.equal(assets[0].base64,'AQID');
 const xml=buildPlaybackKlyrXml(doc,[...assets,...assets,{sticker:{...sticker,id:'unused'},base64:'AAAA'}]);
 assert.equal((xml.match(/<ASSET /g)||[]).length,1);assert.equal((xml.match(/<IMAGE /g)||[]).length,2);
 assert(!xml.includes('unused'));assert(!xml.includes('\uFFFC'));assert(xml.includes('ภาพ &amp; &lt;one&gt;.png'));
 assert(!xml.includes('<TIME>2000</TIME>'));assert.equal((xml.match(/<WORD timed="false">/g)||[]).length,2);assert(xml.includes('<TIME></TIME>'));
});

test('missing image prevents an incomplete playback export',async()=>{
 await assert.rejects(()=>collectPlaybackAssets(doc,async()=>undefined),/missing-sticker/);
 assert.throws(()=>buildPlaybackKlyrXml(doc,[]),/missing-sticker/);
});

test('YKR is playback data only and does not contain a project or editor state',()=>{
 const result=buildYoutubePlayback({youtubeId:'video',info:doc.info,lyrics:[],chords:[],document:doc,assets:[]});
 assert.equal(result.data.playerState.youtubeId,'video');
 assert(!('id' in result));
 for(const key of ['createdAt','updatedAt','history','timingBuffer','soundfonts','storedFile']) assert(!JSON.stringify(result).includes(`"${key}"`));
 assert.equal(result.data.lyricsDocument.lines[0][1].kind,'image');
});

test('inline layout allocates images between text and untimed decorations consume no progress',()=>{
 const words=doc.lines[0].map((w,index)=>({...w,index,lineIndex:0}));
 const layout=layoutInlineWords(words,40,300,(t)=>t.length*20,1/2);
 assert.deepEqual(layout.map(x=>x.word.kind ?? 'text'),['text','image','text','image']);
 for(let i=1;i<layout.length;i++)assert(layout[i].left>=layout[i-1].left+layout[i-1].width);
 assert.deepEqual(layout.map(x=>x.progress),[1,0,0,0]);
 assert(layout.at(-1)!.left+layout.at(-1)!.width<=300);
});

test('MID supports an embedded image payload larger than the JavaScript spread limit',()=>{
 // Incompressible base64 approximates a real compressed sticker in a MIDI meta event.
 let seed=42;const bytes=Uint8Array.from({length:220000},()=>{seed=(seed*1664525+1013904223)>>>0;return seed>>>24;});
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const xml=buildPlaybackKlyrXml({...doc,timeBase:{kind:'midi-tick',ppq:480}},[{sticker,base64:btoa(binary)}]);
 const result=buildModifiedMidi({originalMidiData:{format:1,ticksPerBeat:480,trackCount:0,tracks:[]},newSongInfo:doc.info as any,
 newLyricsData:[],newChordsData:[],headerToUse:'LyrHdr1',textEncoding:'utf-8',lyricsXml:xml});
 assert(result.length>220000);assert.equal(new TextDecoder().decode(result.subarray(0,4)),'MThd');
});

test('MP3 embeds the complete rich XML even for image-only lyrics and retains audio',()=>{
 const imageOnly={...doc,lines:[[doc.lines[0][1]]]};
 const xml=buildPlaybackKlyrXml(imageOnly,[{sticker,base64:'AQID'}]);
 const audio=new Uint8Array([0xff,0xfb,1,2,3]);
 const buffer=buildMp3({title:'Song',artist:'Artist',info:doc.info as any,chords:[],lyrics:[],lyricsXml:xml},audio.buffer);
 const bytes=new Uint8Array(buffer);assert.deepEqual(bytes.slice(-5),audio);
 // Locate TEXT frame in ID3v2.3 and recover its compressed lyrics.
 const view=new DataView(buffer);let pos=10,encoded='';
 while(pos+10<bytes.length){const key=new TextDecoder().decode(bytes.subarray(pos,pos+4));const size=view.getUint32(pos+4);
 if(key==='TEXT'){encoded=new TextDecoder().decode(bytes.subarray(pos+11,pos+10+size));break;}pos+=10+size;}
 assert.equal(decodeLyricsBase64(encoded),xml);
});
