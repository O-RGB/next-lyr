import { effectGeometry, effectHeadroom, effectRenderProfile, EFFECT_LAYOUT, frameAtTime } from "@/lib/block-effects/catalog";
import { groupEffectBlocks, type EffectBlock, type BlockEffect, type EffectAtlasRole } from "@/lib/block-effects/types";
import { layoutSkyActors, STORM_CLOUD_CROP } from "@/lib/block-effects/weather";
import { ensureEffectStyles, subscribeFramePainter, refreshFramePainter } from "@/lib/block-effects/animation";
import { loadFrameAtlas, frameAtlasIdentity, drawAtlasFrame, drawHorizontalAtlasFrame, drawAnchoredAtlasFrame, drawStormAtlasFrame, type LoadedAtlas } from "@/lib/block-effects/frames";
export interface EffectPlacement { key: string; effect: BlockEffect; left: number; top: number; width: number; height: number; progress?: number; clipLeft?: number; clipRight?: number; fireLengthScale?: number }
export interface EffectBox { word: EffectBlock; left: number; top: number; width: number; height: number; progress?: number }
export function placeEffectRuns(boxes: EffectBox[], prefix: string): EffectPlacement[] {
  return groupEffectBlocks(boxes.map(box=>box.word)).map(run=>{
    const first=boxes[run.start],last=boxes[run.end],members=boxes.slice(run.start,run.end+1);
    const bounds=members.reduce((r,b)=>({bottom:Math.max(r.bottom,b.top+b.height),height:Math.max(r.height,b.height)}),{bottom:-Infinity,height:0});
    const total=members.reduce((sum,b)=>sum+b.width,0),progress=members.reduce((sum,b)=>sum+(b.progress??0)*b.width,0)/Math.max(1,total);
    const geometry=effectGeometry(last.left+last.width-first.left,bounds.height,run.effect);
    return {key:`${prefix}:${first.word.index??run.start}:${run.effect.type}:${run.effect.variant??''}`,effect:run.effect,progress,left:first.left-geometry.outset,
      top:bounds.bottom-geometry.rise,width:geometry.width,height:geometry.height};
  });
}
interface Entry { canvas: HTMLCanvasElement; atlas?: LoadedAtlas; atlasKey: string; request: number; placement: EffectPlacement; lastFrame: number; disposed: boolean }
export interface BlockEffectLayer { element: HTMLDivElement | null; entries: Map<string,Entry>; unsubscribe?:()=>void; painter?:(time:number,reduced:boolean)=>void }
export const makeBlockEffectLayer=():BlockEffectLayer=>({element:null,entries:new Map()});
export function clearBlockEffectLayer(layer: BlockEffectLayer){
  layer.unsubscribe?.();layer.unsubscribe=undefined;layer.painter=undefined;
  for(const entry of layer.entries.values()){entry.disposed=true;entry.canvas.remove();}layer.entries.clear();
}
export function paintFrameSurface(canvas: HTMLCanvasElement, atlas: LoadedAtlas, placement: EffectPlacement, time: number, reduced: boolean, components:Partial<Record<EffectAtlasRole,LoadedAtlas>>={}) {
  const dpr=Math.min(devicePixelRatio||1,2),width=placement.width,height=placement.height;
  const pixelW=Math.max(1,Math.round(width*dpr)),pixelH=Math.max(1,Math.round(height*dpr));
  if(canvas.width!==pixelW||canvas.height!==pixelH){canvas.width=pixelW;canvas.height=pixelH;}
  const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
  paintEffectSprites(ctx,atlas,placement,time,reduced,components);
}
/** Paint directly into the lyric canvas, with the same geometry as the frame surface. */
export function drawEffectFrame(ctx: CanvasRenderingContext2D, atlas: LoadedAtlas, placement: EffectPlacement, time: number, reduced: boolean, components:Partial<Record<EffectAtlasRole,LoadedAtlas>>={}) {
  ctx.save();ctx.beginPath();
  ctx.rect(placement.left+(placement.clipLeft??0),placement.top,
    Math.max(0,placement.width-(placement.clipLeft??0)-(placement.clipRight??0)),placement.height);
  ctx.clip();ctx.translate(placement.left,placement.top);
  paintEffectSprites(ctx,atlas,placement,time,reduced,components);ctx.restore();
}
function paintEffectSprites(ctx: CanvasRenderingContext2D, atlas: LoadedAtlas, placement: EffectPlacement, time: number, reduced: boolean, components:Partial<Record<EffectAtlasRole,LoadedAtlas>>) {
  const {width,height}=placement;
  const h=height/(effectHeadroom(placement.effect)+EFFECT_LAYOUT.bottomPad);
  const {outset,baseline,edge}=effectGeometry(1,h,placement.effect);
  const rootY=baseline-h*EFFECT_LAYOUT.rootRise;
  if(placement.effect.type==='fire'){
    const length=edge*(placement.fireLengthScale??EFFECT_LAYOUT.fireLengthScale);
    const fireRootY=rootY+h*EFFECT_LAYOUT.fireRootDrop;
    drawHorizontalAtlasFrame(ctx,atlas,time,outset+h*EFFECT_LAYOUT.rootInset,fireRootY,length,true,reduced,EFFECT_LAYOUT.fireHeightScale);
    drawHorizontalAtlasFrame(ctx,atlas,time+1000/atlas.fps*5,width-outset-h*EFFECT_LAYOUT.rootInset,fireRootY,length,false,reduced,EFFECT_LAYOUT.fireHeightScale);
  }else if(placement.effect.type==='lightning'){
    // Preserve the approved lightning art and its fixed outward-facing orientation.
    drawAtlasFrame(ctx,atlas,time,outset+h*EFFECT_LAYOUT.rootInset,rootY,edge,false,reduced,-EFFECT_LAYOUT.edgeAngle);
    drawAtlasFrame(ctx,atlas,time+1000/atlas.fps*5,width-outset-h*EFFECT_LAYOUT.rootInset,rootY,edge,true,reduced,EFFECT_LAYOUT.edgeAngle);
  }else{
    const profile=effectRenderProfile(placement.effect);if(!profile)return;
    const phase=1000/atlas.fps;
    if(profile.attachment==='rain'){
      const span=Math.max(1,width-2*outset),count=Math.max(1,Math.min(8,Math.ceil(span/(h*1.5))));
      const tileWidth=Math.min(h*profile.width,span/count);
      for(let index=0;index<count;index++)drawAnchoredAtlasFrame(ctx,atlas,time+phase*index*5,
        outset+(index+.5)*span/count-tileWidth/2,baseline-h*1.45,tileWidth,h*profile.height,0,0,false,reduced);
    }else if(profile.attachment!=='sky'){
      for(const [side,x] of [outset+h*profile.inset,width-outset-h*profile.inset].entries()){
        const frameTime=time+phase*(side?5:0),index=frameAtTime(frameTime,atlas.frames,atlas.fps,reduced);
        const shape=atlas.shapes[index],rect=atlas.rects[index];
        const anchorX=profile.attachment==='sprout'?(shape.emitterX??shape.left)/rect.width:profile.anchorX;
        const anchorY=profile.attachment==='sprout'?shape.emitterY/rect.height:profile.anchorY;
        drawAnchoredAtlasFrame(ctx,atlas,frameTime,x,rootY,h*profile.width,h*profile.height,anchorX,anchorY,side===0,reduced);
      }
    }
    for(const actor of layoutSkyActors(placement.effect,width-2*outset,h,time,reduced,placement.key)){
      const image=actor.role==='edge'?atlas:components[actor.role];if(!image)continue;
      ctx.save();ctx.globalAlpha*=actor.opacity;
      const frameTime=actor.frameTime??time+actor.phase*1000/image.fps;
      if(actor.role==='storm')drawStormAtlasFrame(ctx,image,frameTime,outset+actor.left,baseline+actor.top,
        actor.width,actor.height,!!actor.flashing,reduced,STORM_CLOUD_CROP);
      else drawAnchoredAtlasFrame(ctx,image,frameTime,outset+actor.left,baseline+actor.top,actor.width,actor.height,0,0,false,reduced);
      ctx.restore();
    }
  }
}
/** One atlas per effect, one shared clock, and only visible image frames are painted. */
export function updateBlockEffectLayer(layer: BlockEffectLayer, placements: EffectPlacement[]) {
  if(!layer.element){clearBlockEffectLayer(layer);return;}
  if(placements.length)ensureEffectStyles();
  const retained=new Set(placements.map(p=>p.key));
  for(const [key,entry]of layer.entries)if(!retained.has(key)){entry.disposed=true;entry.canvas.remove();layer.entries.delete(key);}
  for(const placement of placements){
    let entry=layer.entries.get(placement.key);
    if(!entry){
      const canvas=document.createElement('canvas');canvas.className='lyric-frame-run pointer-events-none absolute';canvas.dataset.effectRun=placement.key;canvas.setAttribute('aria-hidden','true');
      entry={canvas,placement,atlasKey:'',request:0,lastFrame:-1,disposed:false};layer.entries.set(placement.key,entry);layer.element.append(canvas);
    }
    const atlasKey=frameAtlasIdentity(placement.effect.type);
    if(entry.atlasKey!==atlasKey){
      entry.atlasKey=atlasKey;entry.atlas=undefined;entry.lastFrame=-1;
      const current=entry,request=++entry.request;
      void loadFrameAtlas(placement.effect.type).then(atlas=>{
        if(current.disposed||current.request!==request)return;
        current.atlas=atlas;current.lastFrame=-1;if(layer.painter)refreshFramePainter(layer.painter);
      }).catch(error=>console.error('Could not load effect frames',error));
    }
    if(entry.placement.width!==placement.width||entry.placement.height!==placement.height)entry.lastFrame=-1;
    entry.placement=placement;
    const progress=Math.max(0,Math.min(1,placement.progress??0)),power=progress>0&&progress<1?1:progress>=1?.35:0;
    entry.canvas.style.setProperty('--effect-power',String(power));entry.canvas.dataset.effectState=power===1?'active':progress>=1?'completed':'idle';
    Object.assign(entry.canvas.style,{left:`${placement.left}px`,top:`${placement.top}px`,width:`${placement.width}px`,height:`${placement.height}px`,clipPath:`inset(0px ${placement.clipRight??0}px 0px ${placement.clipLeft??0}px)`});
  }
  if(!layer.entries.size){layer.unsubscribe?.();layer.unsubscribe=undefined;return;}
  if(!layer.painter)layer.painter=(time,reduced)=>{
    for(const entry of layer.entries.values()){
      if(!entry.atlas||entry.disposed)continue;
      const box=entry.canvas.getBoundingClientRect();if(!box.width||!box.height||box.bottom<0||box.top>innerHeight||box.right<0||box.left>innerWidth)continue;
      const index=frameAtTime(time,entry.atlas.frames,entry.atlas.fps,reduced);if(index===entry.lastFrame)continue;
      paintFrameSurface(entry.canvas,entry.atlas,entry.placement,time,reduced);entry.lastFrame=index;
      entry.canvas.dataset.spriteFrame=String(index);
    }
  };
  if(!layer.unsubscribe)layer.unsubscribe=subscribeFramePainter(layer.painter);else refreshFramePainter(layer.painter);
}
