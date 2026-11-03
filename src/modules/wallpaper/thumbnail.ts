/** Serialize transient full-size decodes; thumbnails are never persisted. */
let queue:Promise<unknown>=Promise.resolve();
export function createWallpaperThumbnail(load:()=>Promise<Blob|undefined>,signal:AbortSignal):Promise<Blob|undefined>{
 const run=queue.then(async()=>{
  if(signal.aborted)return;
  const blob=await load();if(!blob||signal.aborted)return;
  const canvas=document.createElement('canvas');let bitmap:ImageBitmap|undefined,image:HTMLImageElement|undefined,url='';
  try{
   if(typeof createImageBitmap==='function')try{bitmap=await createImageBitmap(blob);}catch{/* Older Safari fallback below. */}
   if(signal.aborted)return;
   if(!bitmap){image=new Image();image.decoding='async';url=URL.createObjectURL(blob);
    await new Promise<void>((resolve,reject)=>{const cleanup=()=>{image!.onload=image!.onerror=null;signal.removeEventListener('abort',abort);};
     const abort=()=>{cleanup();image!.removeAttribute('src');reject(new DOMException('Cancelled','AbortError'));};
     image!.onload=()=>{cleanup();resolve();};image!.onerror=()=>{cleanup();reject(new Error('Cannot decode thumbnail'));};signal.addEventListener('abort',abort,{once:true});image!.src=url;
    });
   }
   if(signal.aborted)return;
   const width=bitmap?.width??image!.naturalWidth,height=bitmap?.height??image!.naturalHeight;
   const scale=Math.min(1,240/Math.max(width,height));canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
   const context=canvas.getContext('2d');if(!context)return;
   context.drawImage(bitmap??image!,0,0,canvas.width,canvas.height);
   const thumb=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',.65));
   return signal.aborted?undefined:thumb??undefined;
  }finally{bitmap?.close();image?.removeAttribute('src');if(url)URL.revokeObjectURL(url);canvas.width=canvas.height=0;}
 });
 queue=run.catch(()=>{});return run;
}
