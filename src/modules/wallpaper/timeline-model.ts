import type {ScenioDocument} from 'scenio/core';
export const MIN_CLIP_MS = 1000;
export const MIN_FADE_MS = 100;
export function clipEnd(doc:ScenioDocument,index:number,songEnd:number){return doc.scenes[index].endMs??doc.scenes[index+1]?.startMs??songEnd;}
export function normalizeTimeline(doc:ScenioDocument,songEnd:number):ScenioDocument {
 return {...doc,scenes:doc.scenes.map((scene,i)=>{const endMs=clipEnd(doc,i,songEnd);return {...scene,endMs,transition:{...scene.transition,durationMs:Math.min(scene.transition.durationMs,Math.max(0,endMs-scene.startMs))}};})};
}
/** Tail edits ripple later clips; head edits move the shared boundary with the previous clip. */
export function resizeClip(doc:ScenioDocument,index:number,edge:'start'|'end',delta:number,songEnd:number){
 if(!doc.scenes[index])return doc;
 const scenes=doc.scenes.map(s=>({...s,transition:{...s.transition}})),scene=scenes[index];
 const end=clipEnd(doc,index,songEnd),lastEnd=clipEnd(doc,scenes.length-1,songEnd);
 const length=end-scene.startMs;
 const quantized=Math.round(delta/100)*100;
 if(edge==='end'){
  const shift=Math.max(MIN_CLIP_MS-length,Math.min(songEnd-lastEnd,quantized));
  scene.endMs=end+shift;scene.transition.durationMs=Math.min(scene.transition.durationMs,scene.endMs-scene.startMs);
  for(let i=index+1;i<scenes.length;i++){scenes[i].startMs+=shift;scenes[i].endMs=clipEnd(doc,i,songEnd)+shift;}
 }else{
  // The first clip stays anchored; internal heads always share the previous tail.
  if(index===0)return doc;
  const previous=scenes[index-1];
  const boundary=Math.max(previous.startMs+MIN_CLIP_MS,Math.min(end-MIN_CLIP_MS,scene.startMs+quantized));
  previous.endMs=boundary;
  previous.transition.durationMs=Math.min(previous.transition.durationMs,boundary-previous.startMs);
  scene.startMs=boundary;scene.endMs=end;
  scene.transition.durationMs=Math.min(scene.transition.durationMs,end-boundary);
 }
 return {...doc,scenes};
}
export function resizeFade(doc:ScenioDocument,index:number,duration:number,songEnd:number){return {...doc,scenes:doc.scenes.map((s,i)=>i===index?{...s,transition:{type:'fade' as const,durationMs:Math.min(clipEnd(doc,i,songEnd)-s.startMs,Math.max(MIN_FADE_MS,Math.round(duration/100)*100))}}:s)};}
/** Reorder complete clips, preserving duration and transition on each image. */
export function reorderClip(doc:ScenioDocument,from:number,to:number,songEnd:number){
 if(from===to||from<0||to<0||from>=doc.scenes.length||to>=doc.scenes.length)return doc;
 const items=doc.scenes.map((s,i)=>({scene:s,length:clipEnd(doc,i,songEnd)-s.startMs}));
 items.splice(to,0,items.splice(from,1)[0]);let cursor=doc.scenes[0]?.startMs??0;
 return {...doc,scenes:items.map(({scene,length})=>{const startMs=cursor;cursor+=length;return {...scene,startMs,endMs:cursor};})};
}
