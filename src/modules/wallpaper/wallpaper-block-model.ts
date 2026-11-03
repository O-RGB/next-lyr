import type {ScenioDocument} from 'scenio/core';
/** Editor policy only: every image gets an equal share of the complete song. */
export function fitWallpaperBlocks(doc:ScenioDocument,songEnd:number,fadeMs?:number):ScenioDocument{
 const count=doc.scenes.length;if(!count)return doc;
 if(!Number.isSafeInteger(songEnd)||songEnd<count*1000)throw new Error('Not enough song time for another image');
 return {...doc,scenes:doc.scenes.map((scene,index)=>{
  const startMs=Math.floor(index*songEnd/count),endMs=Math.floor((index+1)*songEnd/count);
  return {...scene,startMs,endMs,transition:{type:'fade',durationMs:Math.min(endMs-startMs,fadeMs??scene.transition.durationMs)}};
 })};
}
export function moveWallpaperBlock(doc:ScenioDocument,from:number,to:number,songEnd:number){
 if(from===to||from<0||to<0||from>=doc.scenes.length||to>=doc.scenes.length)return doc;
 const scenes=[...doc.scenes];scenes.splice(to,0,scenes.splice(from,1)[0]);return fitWallpaperBlocks({...doc,scenes},songEnd);
}
