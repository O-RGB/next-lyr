import { db } from "../database/db";
import { effectAtlasRecipe, usedEffectAtlasRoles, frameAtTime, EFFECT_COMMON } from "./catalog";
import { type EffectType, type EffectAtlasRole, type PlaybackFrameAtlas } from "./types";
import { materializeAtlasPayloads } from "./assets";
import type { LyricsDocument } from "../karaoke/lyrics-core/types";
export interface FrameShape { left: number; top: number; width: number; height: number; emitterX?: number; emitterY: number }
export interface LoadedAtlas { image: HTMLImageElement; width: number; height: number; columns: number; rows: number; frames: number; fps: number; anchors: Array<{ x: number; y: number; top: number }>; shapes: FrameShape[]; rects: ReturnType<typeof atlasFrameRects> }
const images = new Map<string, Promise<LoadedAtlas>>();
const embedded = new Map<string, PlaybackFrameAtlas>();
const assetKey = (type: EffectType, role: EffectAtlasRole = "edge") => `${type}:${role}`;
export function registerPlaybackAtlases(atlases: PlaybackFrameAtlas[] = []) {
  embedded.clear();
  for (const atlas of materializeAtlasPayloads(atlases)) { embedded.set(assetKey(atlas.type, atlas.role), atlas); }
}
export function frameAtlasIdentity(type: EffectType, role: EffectAtlasRole = "edge") {
  const atlas = embedded.get(assetKey(type,role)) ?? effectAtlasRecipe(type,role);
  return `${atlas.id}:${atlas.columns}:${atlas.rows}:${atlas.frames}:${atlas.fps}`;
}
export function atlasFrameRects(width: number, height: number, columns: number, rows: number) {
  return Array.from({ length: columns * rows }, (_, index) => {
    const col=index%columns,row=Math.floor(index/columns),x=Math.round(col*width/columns),y=Math.round(row*height/rows);
    return {x,y,width:Math.round((col+1)*width/columns)-x,height:Math.round((row+1)*height/rows)-y};
  });
}
export function safeFrameRects(width: number, height: number, columns: number, rows: number) {
  return atlasFrameRects(width,height,columns,rows).map(rect=>{
    const side=Math.max(1,Math.round(rect.width*EFFECT_COMMON.gutter.side)),top=Math.max(1,Math.round(rect.height*EFFECT_COMMON.gutter.top)),bottom=Math.max(1,Math.round(rect.height*EFFECT_COMMON.gutter.bottom));
    return {x:rect.x+side,y:rect.y+top,width:Math.max(1,rect.width-2*side),height:Math.max(1,rect.height-top-bottom)};
  });
}
export function inspectFrameAnchors(data: Uint8ClampedArray, width: number, height: number, columns: number, rows: number, rectangles=atlasFrameRects(width,height,columns,rows), opacity=64) {
  return rectangles.map(rect => {
    let bottom=rect.height-1;
    for(let y=rect.height-1;y>=0;y--){let count=0;
      for(let x=Math.floor(rect.width*.12);x<rect.width*.88;x++)if(data[((rect.y+y)*width+rect.x+x)*4+3]>=opacity)count++;
      if(count>=Math.max(2,rect.width*.025)){bottom=y;break;}
    }
    let top=0;
    for(let y=0;y<bottom;y++){let rowCount=0;
      for(let x=0;x<rect.width;x++)if(data[((rect.y+y)*width+rect.x+x)*4+3]>=opacity)rowCount++;
      if(rowCount>=Math.max(2,rect.width*.025)){top=y;break;}
    }
    let sum=0,count=0;
    for(let y=Math.max(0,bottom-5);y<=bottom;y++)for(let x=0;x<rect.width;x++)if(data[((rect.y+y)*width+rect.x+x)*4+3]>=opacity){sum+=x;count++;}
    return {x:count?sum/count:rect.width/2,y:bottom+1,top};
  });
}
/** Locate the drawn emitter and burning edge without altering any source pixels. */
export function inspectFrameShapes(data: Uint8ClampedArray, width: number, rects: ReturnType<typeof atlasFrameRects>, anchors: LoadedAtlas["anchors"], opacity=64): FrameShape[] {
  return rects.map((rect,index)=>{
    const anchor=anchors[index],minimum=Math.max(2,(anchor.y-anchor.top)*.025);
    const columnCount=(x:number)=>{let count=0;for(let y=anchor.top;y<anchor.y;y++)if(data[((rect.y+y)*width+rect.x+x)*4+3]>=opacity)count++;return count;};
    let left=0,right=rect.width-1;
    for(let x=0;x<rect.width;x++)if(columnCount(x)>=minimum){left=x;break;}
    for(let x=rect.width-1;x>=left;x--)if(columnCount(x)>=minimum){right=x;break;}
    let sum=0,count=0;
    for(let x=left;x<=Math.min(right,left+5);x++)for(let y=anchor.top;y<anchor.y;y++)if(data[((rect.y+y)*width+rect.x+x)*4+3]>=opacity){sum+=y;count++;}
    return {left,top:anchor.top,width:Math.max(1,right-left+1),height:Math.max(1,anchor.y-anchor.top),emitterY:count?sum/count:anchor.y};
  });
}
/** Pin the flame's connected lower-left root, ignoring detached transparent-edge residue. */
export function inspectConnectedFireShapes(data: Uint8ClampedArray, width: number, rects: ReturnType<typeof atlasFrameRects>, fallback: FrameShape[]): FrameShape[] {
  return rects.map((rect,index)=>{
    const size=rect.width*rect.height,visited=new Uint8Array(size),queue=new Uint32Array(size);
    const opaque=(at:number)=>data[((rect.y+Math.floor(at/rect.width))*width+rect.x+at%rect.width)*4+3]>=220;
    let largest=new Uint32Array(0);
    for(let start=0;start<size;start++){
      if(visited[start])continue;visited[start]=1;if(!opaque(start))continue;
      let head=0,tail=1;queue[0]=start;
      while(head<tail){
        const current=queue[head++],x=current%rect.width,y=Math.floor(current/rect.width);
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=rect.width||ny>=rect.height)continue;
          const next=ny*rect.width+nx;if(visited[next])continue;visited[next]=1;
          if(opaque(next))queue[tail++]=next;
        }
      }
      if(tail>largest.length)largest=queue.slice(0,tail);
    }
    if(!largest.length)return fallback[index];
    let left=rect.width,right=0,top=rect.height,bottom=0,root=Infinity;
    for(const at of largest){const x=at%rect.width,y=Math.floor(at/rect.width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);root=Math.min(root,x-y);}
    let sumX=0,sumY=0,count=0;
    for(const at of largest){const x=at%rect.width,y=Math.floor(at/rect.width);if(x-y<=root+1){sumX+=x;sumY+=y;count++;}}
    return {left,top,width:right-left+1,height:bottom-top+1,emitterX:sumX/count,emitterY:sumY/count};
  });
}
export function loadFrameAtlas(type: EffectType, role: EffectAtlasRole = "edge"): Promise<LoadedAtlas> {
  const recipe = effectAtlasRecipe(type,role), supplied = embedded.get(assetKey(type,role));
  const key = frameAtlasIdentity(type,role);
  const existing = images.get(key); if (existing) return existing;
  const request = (async () => {
    let source = recipe.src, objectUrl: string | undefined;
    if (supplied) {
      if (supplied.base64) source = `data:${supplied.mime};base64,${supplied.base64}`;
      else { const record = await db.effectSpriteAssets.get(supplied.id); if (!record) throw new Error("missing-frame-atlas"); objectUrl = URL.createObjectURL(record.blob); source = objectUrl; }
    }
    return new Promise<LoadedAtlas>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const columns = supplied?.columns ?? recipe.columns, rows = supplied?.rows ?? recipe.rows;
        const width = image.naturalWidth, height = image.naturalHeight;
        if (!width || !height || width < columns || height < rows) throw new Error("invalid-frame-atlas");
        const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true }); if (!ctx) throw new Error("frame-context-unavailable");
        ctx.drawImage(image, 0, 0);
        const rects=safeFrameRects(width,height,columns,rows);
        const pixels=ctx.getImageData(0,0,width,height).data;
        const connectedRoot=type==='fire'||type==='leaves';
        const opacity=connectedRoot?220:64;
        const anchors = inspectFrameAnchors(pixels, width, height, columns, rows,rects,opacity);
        const rawShapes=inspectFrameShapes(pixels,width,rects,anchors,opacity);
        const shapes=connectedRoot?inspectConnectedFireShapes(pixels,width,rects,rawShapes):rawShapes;
        resolve({ image, width, height, columns, rows, frames: supplied?.frames ?? recipe.frames, fps: supplied?.fps ?? recipe.fps, anchors, shapes, rects });
      } catch (error) { reject(error); } finally { if (objectUrl) URL.revokeObjectURL(objectUrl); }
    };
    image.onerror = () => { if (objectUrl) URL.revokeObjectURL(objectUrl); reject(new Error(`frame-atlas-unavailable: ${type}`)); };
    image.src = source;
    });
  })();
  images.set(key, request); request.catch(() => images.delete(key)); return request;
}
export function drawAtlasFrame(ctx: CanvasRenderingContext2D, atlas: LoadedAtlas, time: number, x: number, baseline: number, size: number, flip: boolean, reducedMotion: boolean, angle = 0) {
  const index = frameAtTime(time, atlas.frames, atlas.fps, reducedMotion), rect = atlas.rects[index];
  const anchor = atlas.anchors[index], scale = size / Math.max(1,anchor.y-anchor.top);
  // The emitter is fixed to a glyph. Only the independently drawn source frame changes.
  ctx.save(); ctx.translate(x, baseline); ctx.rotate(angle); if (flip) ctx.scale(-1, 1);
  ctx.drawImage(atlas.image, rect.x,rect.y,rect.width,rect.height,
    -anchor.x*scale,-anchor.y*scale,rect.width*scale,rect.height*scale); ctx.restore(); return index;
}
/** Fixed cell coordinates preserve floating hearts, growing leaves and falling droplets. */
export function drawAnchoredAtlasFrame(ctx: CanvasRenderingContext2D, atlas: LoadedAtlas, time: number,
  x: number, y: number, width: number, height: number, anchorX: number, anchorY: number, flip: boolean, reduced: boolean) {
  const index=frameAtTime(time,atlas.frames,atlas.fps,reduced),rect=atlas.rects[index];
  ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);
  ctx.drawImage(atlas.image,rect.x,rect.y,rect.width,rect.height,-width*anchorX,-height*anchorY,width,height);ctx.restore();
}
/** The generated cloud and discharge share their source seam and animation cel. */
export function drawStormAtlasFrame(ctx: CanvasRenderingContext2D, atlas: LoadedAtlas, time: number,
  x: number, y: number, width: number, height: number, flashing: boolean, reduced: boolean, crop: number) {
  const index = frameAtTime(time, atlas.frames, atlas.fps, reduced), rect = atlas.rects[index];
  const sourceCloud = rect.height * crop, cloudHeight = height * .39;
  ctx.drawImage(atlas.image, rect.x, rect.y, rect.width, sourceCloud, x, y, width, cloudHeight);
  if (flashing) ctx.drawImage(atlas.image, rect.x, rect.y + sourceCloud, rect.width, rect.height - sourceCloud,
    x, y + cloudHeight, width, height - cloudHeight);
}
/** Fire is drawn horizontally in its source frames; it never uses rotation. */
export function drawHorizontalAtlasFrame(ctx: CanvasRenderingContext2D, atlas: LoadedAtlas, time: number, x: number, y: number, length: number, flip: boolean, reduced: boolean, heightScale = 1) {
  const index=frameAtTime(time,atlas.frames,atlas.fps,reduced),rect=atlas.rects[index],shape=atlas.shapes[index],scale=length/shape.width;
  const scaleY=scale*heightScale;
  ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);
  ctx.drawImage(atlas.image,rect.x,rect.y,rect.width,rect.height,-(shape.emitterX??shape.left)*scale,-shape.emitterY*scaleY,rect.width*scale,rect.height*scaleY);ctx.restore();
}
export async function collectEffectAtlases(document: LyricsDocument, read: (type: EffectType, role: EffectAtlasRole) => Promise<Blob> = async(type,role) => {
  const response = await fetch(effectAtlasRecipe(type,role).src); if (!response.ok) throw new Error(`missing-frame-atlas: ${type}:${role}`); return response.blob();
}): Promise<PlaybackFrameAtlas[]> {
  const used = usedEffectAtlasRoles(document.lines);
  const suppliedAtlases=materializeAtlasPayloads(document.effectAtlases??[]);
  const binaries=new Map<string,Promise<{id:string;base64:string;width:number;height:number}>>();
  const atlases: PlaybackFrameAtlas[] = [];
  for (const {type,role} of used) {
    const supplied = suppliedAtlases.find(atlas => atlas.type === type && (atlas.role ?? "edge") === role);
    if (supplied?.base64) { atlases.push(supplied); continue; }
    const metadata = supplied ?? effectAtlasRecipe(type,role);
    const sourceKey=supplied?supplied.id:effectAtlasRecipe(type,role).src;
    let request=binaries.get(sourceKey);
    if(!request){request=(async()=>{
      const stored=supplied?await db.effectSpriteAssets.get(supplied.id):undefined;
      if(supplied&&!stored)throw new Error('missing-frame-atlas');
      const blob=stored?.blob??await read(type,role),bytes=new Uint8Array(await blob.arrayBuffer());
      const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
      const id=[...digest].map(value=>value.toString(16).padStart(2,'0')).join('');
      let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
      if(bytes.length<24||view.getUint32(0)!==0x89504e47)throw new Error('invalid-frame-atlas');
      return{id,base64:btoa(binary),width:view.getUint32(16),height:view.getUint32(20)};
    })();binaries.set(sourceKey,request);}
    atlases.push({type,...(role!=='edge'?{role}:{}),mime:'image/png',...await request,
      columns:metadata.columns,rows:metadata.rows,frames:metadata.frames,fps:metadata.fps});
  }
  return atlases;
}
