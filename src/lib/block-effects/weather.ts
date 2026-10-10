import type { BlockEffect, EffectAtlasRole } from "./types";
export interface SkyActor { role: EffectAtlasRole; left: number; top: number; width: number; height: number; phase: number; opacity: number }
/** Share sprites while keeping at most three sky objects inside the selected span. */
export function layoutSkyActors(effect: BlockEffect, span: number, height: number): SkyActor[] {
  if(effect.type!=='sunny'&&(effect.type!=='rain'||!effect.variant))return [];
  const actors:SkyActor[]=[],width=Math.max(1,span),h=Math.max(1,height);
  const add=(role:EffectAtlasRole,center:number,w:number,hh:number,rise:number,limit:number,phase=0)=>{
    const actorWidth=Math.min(h*w,width*limit),scale=actorWidth/(h*w);
    actors.push({role,left:Math.max(0,Math.min(width-actorWidth,width*center-actorWidth/2)),top:-h*rise,width:actorWidth,height:h*hh*scale,phase,opacity:role==='edge'?.65:role==='birds'?.6:.55});
  };
  if(effect.type==='rain'){
    const maximum=effect.variant==='storm'?2:3;
    const count=Math.max(1,Math.min(maximum,Math.ceil(width/(h*4))));
    for(let index=0;index<count;index++)add('cloud',(index+.5)/count,.85,.5,1.47,1/count,index*5);
    if(effect.variant==='storm'){
      const cloud=actors[0],size=Math.min(h*.52,cloud.width*.64);
      actors.push({role:'lightning',left:cloud.left+cloud.width*.5,top:cloud.top+cloud.height*.7,width:size,height:size,phase:0,opacity:.95});
    }
  }else if(effect.variant==='birds'){
    add('edge',.16,.48,.48,1.58,.3);add('cloud',.5,.85,.5,1.47,.48,5);add('birds',.85,.68,.4,1.56,.34,9);
  }else if(effect.variant==='clouds'){
    const count=Math.max(1,Math.min(2,Math.ceil(width/(h*5))));
    add('edge',count===2?.15:.24,.5,.5,1.58,.35);
    for(let index=0;index<count;index++)add('cloud',count===2?.53+index*.32:.73,.85,.5,1.47,count===2?.4:.58,index*5+5);
  }else add('edge',.5,.52,.52,1.58,.8);
  return actors;
}
/** Long enough to recognize several lightning cels, with a quiet gap between bursts. */
export function skyLightningVisible(time:number,reduced=false) {
  if(reduced)return true;
  const phase=Math.max(0,time)%1600;return phase<140||(phase>=210&&phase<470);
}
export function weatherHeadroomPadding(effect?:BlockEffect) { return effect?.type==='sunny'||effect?.type==='rain'&&effect.variant ? .35 : 0; }
