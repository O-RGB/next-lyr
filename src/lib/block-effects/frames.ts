import { db } from "../database/db";
import { effectRecipe, frameAtTime, EFFECT_COMMON } from "./catalog";
import { normalizeBlockEffect, type EffectType, type PlaybackFrameAtlas } from "./types";
import type { LyricsDocument } from "../karaoke/lyrics-core/types";
export interface LoadedAtlas { image: HTMLImageElement; width: number; height: number; columns: number; rows: number; frames: number; fps: number; anchors: Array<{ x: number; y: number; top: number }>; rects: ReturnType<typeof atlasFrameRects> }
const images = new Map<string, Promise<LoadedAtlas>>();
const embedded = new Map<EffectType, PlaybackFrameAtlas>();
export function registerPlaybackAtlases(atlases: PlaybackFrameAtlas[] = []) {
  embedded.clear();
  for (const atlas of atlases) { embedded.set(atlas.type, atlas); }
}
export function frameAtlasIdentity(type: EffectType) {
  const atlas = embedded.get(type) ?? effectRecipe(type).atlas;
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
export function inspectFrameAnchors(data: Uint8ClampedArray, width: number, height: number, columns: number, rows: number, rectangles=atlasFrameRects(width,height,columns,rows)) {
  return rectangles.map(rect => {
    let bottom=rect.height-1;
    for(let y=rect.height-1;y>=0;y--){let count=0;
      for(let x=Math.floor(rect.width*.12);x<rect.width*.88;x++)if(data[((rect.y+y)*width+rect.x+x)*4+3]>=64)count++;
      if(count>=Math.max(2,rect.width*.025)){bottom=y;break;}
    }
    let top=0;
    for(let y=0;y<bottom;y++){let rowCount=0;
      for(let x=0;x<rect.width;x++)if(data[((rect.y+y)*width+rect.x+x)*4+3]>=64)rowCount++;
      if(rowCount>=Math.max(2,rect.width*.025)){top=y;break;}
    }
    let sum=0,count=0;
    for(let y=Math.max(0,bottom-5);y<=bottom;y++)for(let x=0;x<rect.width;x++)if(data[((rect.y+y)*width+rect.x+x)*4+3]>=64){sum+=x;count++;}
    return {x:count?sum/count:rect.width/2,y:bottom+1,top};
  });
}
export function loadFrameAtlas(type: EffectType): Promise<LoadedAtlas> {
  const recipe = effectRecipe(type).atlas, supplied = embedded.get(type);
  const key = frameAtlasIdentity(type);
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
        const anchors = inspectFrameAnchors(ctx.getImageData(0, 0, width, height).data, width, height, columns, rows,rects);
        resolve({ image, width, height, columns, rows, frames: supplied?.frames ?? recipe.frames, fps: supplied?.fps ?? recipe.fps, anchors, rects });
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
export async function collectEffectAtlases(document: LyricsDocument, read: (type: EffectType) => Promise<Blob> = async(type) => {
  const response = await fetch(effectRecipe(type).atlas.src); if (!response.ok) throw new Error(`missing-frame-atlas: ${type}`); return response.blob();
}): Promise<PlaybackFrameAtlas[]> {
  const used = new Set(document.lines.flat().flatMap(word => { const effect = normalizeBlockEffect(word.effect); return effect ? [effect.type] : []; }));
  const atlases: PlaybackFrameAtlas[] = [];
  for (const type of used) {
    const supplied = document.effectAtlases?.find(atlas => atlas.type === type);
    if (supplied?.base64) { atlases.push(supplied); continue; }
    const stored = supplied ? await db.effectSpriteAssets.get(supplied.id) : undefined;
    if (supplied && !stored) throw new Error("missing-frame-atlas");
    const blob = stored?.blob ?? await read(type), bytes = new Uint8Array(await blob.arrayBuffer());
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    const id = [...digest].map(value => value.toString(16).padStart(2,"0")).join("");
    let binary = ""; for (let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    const metadata = supplied ?? effectRecipe(type).atlas;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.length < 24 || view.getUint32(0) !== 0x89504e47) throw new Error("invalid-frame-atlas");
    atlases.push({ type, id, mime: "image/png", width: view.getUint32(16), height: view.getUint32(20),
      columns: metadata.columns, rows: metadata.rows, frames: metadata.frames, fps: metadata.fps, base64: btoa(binary) });
  }
  return atlases;
}
