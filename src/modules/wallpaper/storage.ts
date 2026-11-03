import {db,type WallpaperAssetRecord} from '@/lib/database/db';
import {inspectStickerImage,fitStickerDimensions} from 'lyrio/image-info';
import {inspectWebp} from 'scenio/format';
import {createStaticWebpEncoder} from '@/lib/stickers/webp-encoder';
export const resolveWallpaperAsset=async(id:string,signal:AbortSignal)=>{if(signal.aborted)return;const row=await db.wallpaperAssets.get(id);return signal.aborted?undefined:row?.blob;};
export async function importWallpaper(file:File,signal:AbortSignal):Promise<WallpaperAssetRecord>{
 if(file.size>20_000_000)throw new Error('ภาพต้องไม่เกิน 20 MB');
 const check=()=>{if(signal.aborted)throw new DOMException('Cancelled','AbortError');};
 const bytes=new Uint8Array(await file.arrayBuffer());check();
 const webp=String.fromCharCode(...bytes.subarray(8,12))==='WEBP';
 const info=webp?inspectWebp(bytes):inspectStickerImage(bytes);
 if('frames' in info&&typeof info.frames==='number'&&info.frames>1)throw new Error('Wallpaper รองรับภาพนิ่งเท่านั้น');
 if(Math.max(info.width,info.height)>8192||info.width*info.height>16_000_000)throw new Error('ภาพใหญ่เกิน 16 ล้านพิกเซล');
 const url=URL.createObjectURL(file),image=new Image();const encoder=createStaticWebpEncoder(signal);
 try{
  await new Promise<void>((r,j)=>{image.onload=()=>r();image.onerror=()=>j(new Error('เปิดรูปไม่สำเร็จ'));image.src=url;});check();
  const size=fitStickerDimensions(image.naturalWidth,image.naturalHeight,1920),canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image encoder unavailable');ctx.drawImage(image,0,0,size.width,size.height);
  let blob:Blob|undefined;
  for(const quality of [.78,.7,.6]){check();const candidate=await encoder.encode(canvas,quality);if(!blob||candidate.size<blob.size)blob=candidate;if(blob.size<=300_000)break;}
  check();if(!blob||blob.size>1_000_000)throw new Error('ย่อแล้วภาพยังเกิน 1 MB');
  const id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');
  const record:WallpaperAssetRecord={id,name:file.name,asset:{id,mime:'image/webp',width:size.width,height:size.height,bytes:blob.size},blob,createdAt:new Date()};
  check();await db.wallpaperAssets.put(record);return record;
 }finally{encoder.dispose();URL.revokeObjectURL(url);image.src='';}
}
