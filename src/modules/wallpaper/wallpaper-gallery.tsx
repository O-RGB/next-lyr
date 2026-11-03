"use client";
import {useEffect,useRef,useState} from 'react';
import {ImageGalleryPanel} from '@/components/common/image-gallery-panel';
import {db,type WallpaperAssetSummary} from '@/lib/database/db';
import {importWallpaper} from './storage';
import {ImageThumb} from './image-thumb';
type Props={onSelect:(row:WallpaperAssetSummary)=>void;t:(th:string,en:string)=>string};
export function WallpaperGallery({onSelect,t}:Props){
 const [rows,setRows]=useState<WallpaperAssetSummary[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=useRef<AbortController|null>(null);
 useEffect(()=>{let active=true;const values:WallpaperAssetSummary[]=[];void db.wallpaperAssets.each(row=>{if(!row.hidden){const {blob,...summary}=row;void blob;values.push(summary);}}).then(()=>{if(active)setRows(values.sort((a,b)=>+b.createdAt-+a.createdAt));}).catch(e=>{if(active)setError(String(e));});return()=>{active=false;request.current?.abort();};},[]);
 const upload=async(files:File[])=>{if(busy)return;const abort=new AbortController();request.current=abort;setBusy(true);setError('');
  try{for(const file of files){const row=await importWallpaper(file,abort.signal);if(abort.signal.aborted)return;const {blob,...summary}=row;void blob;setRows(old=>[summary,...old.filter(r=>r.id!==row.id)]);}}catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:String(e));}finally{if(!abort.signal.aborted)setBusy(false);}
 };
 return <ImageGalleryPanel fill
  items={rows.map(row=>({...row,bytes:row.asset.bytes}))}
  title={t('คลังภาพ Wallpaper · ใช้ร่วมกันทุกโปรเจกต์','Wallpaper gallery · shared across projects')}
  description={t('PNG, JPG, WebP ไม่เกิน 20 MB · แปลงเป็น WebP และบีบอัดอัตโนมัติ','PNG, JPG, WebP up to 20 MB · converted to compressed WebP')}
  selectionHint={t('แตะภาพเพื่อเพิ่มในเพลง','Tap an image to add it to the song')}
  accept="image/png,image/jpeg,image/webp" multiple uploadLabel="Upload wallpaper images"
  busy={busy} error={error} renderPreview={row=><ImageThumb id={row.id} className="h-full w-full object-contain"/>}
  onUpload={files=>void upload(files)} onSelect={onSelect}
  onRemove={row=>{void db.wallpaperAssets.update(row.id,{hidden:true}).then(()=>setRows(old=>old.filter(r=>r.id!==row.id))).catch(e=>setError(String(e)));}}
 />;
}
