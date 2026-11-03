"use client";
import {ImagePlus,Loader2,Trash2} from 'lucide-react';
import {useRef,useState,type ReactNode} from 'react';
import ButtonCommon from '@/components/common/button';
import {text} from '@/features/settings/locale';
import {useSettingsStore} from '@/features/settings/settings-store';
import {cn} from '@/lib/utils';
export interface ImageGalleryItem {id:string;name:string;bytes:number}
/** Shared gallery UI; each host keeps its image limits, encoding and storage adapter. */
export function ImageGalleryPanel<T extends ImageGalleryItem>({items,title,description,selectionHint,accept,multiple=false,uploadLabel,fill=false,busy=false,deletingId=null,error,notice,renderPreview,onUpload,onSelect,onRemove}:{
 items:T[];title:string;description:string;selectionHint:string;accept:string;multiple?:boolean;uploadLabel:string;fill?:boolean;
 busy?:boolean;deletingId?:string|null;error?:string|null;notice?:string|null;
 renderPreview:(item:T)=>ReactNode;onUpload:(files:File[])=>void;onSelect:(item:T)=>void;onRemove:(item:T)=>void;
}){
 const locale=useSettingsStore(s=>s.uiLocale),t=(th:string,en:string)=>text(locale,th,en);
 const input=useRef<HTMLInputElement>(null),[query,setQuery]=useState('');
 const disabled=busy||deletingId!==null,filtered=items.filter(item=>item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 return <section aria-label={title} className={cn('rounded-xl border border-line bg-panel p-3 shadow-sm',fill&&'flex min-h-0 flex-1 flex-col overflow-hidden')}
 onDragOver={event=>{if(!disabled&&event.dataTransfer.types.includes('Files'))event.preventDefault();}}
 onDrop={event=>{if(!event.dataTransfer.files.length)return;event.preventDefault();if(!disabled)onUpload(Array.from(event.dataTransfer.files));}}>
  <div className="flex shrink-0 flex-wrap items-center gap-3"><ImagePlus className="size-5 shrink-0 text-muted-foreground"/><div className="min-w-0 flex-1"><h3 className="text-xs font-semibold">{title}</h3><p className="mt-1 text-[11px] text-muted-foreground">{items.length} {t('ภาพ','images')} · {Math.ceil(items.reduce((sum,item)=>sum+item.bytes,0)/1000)} KB</p></div><ButtonCommon type="button" size="xs" variant="outline" disabled={disabled} icon={busy?<Loader2 className="animate-spin"/>:<ImagePlus/>} onClick={()=>input.current?.click()}>{t('อัปโหลด','Upload')}</ButtonCommon></div>
  <p className="mt-2 shrink-0 text-[11px] text-muted-foreground">{description}</p><p className="mt-1 shrink-0 text-[11px] text-muted-foreground">{selectionHint}</p>
  <input ref={input} type="file" accept={accept} multiple={multiple} className="hidden" aria-label={uploadLabel} onChange={event=>{const files=Array.from(event.target.files??[]);event.target.value='';if(!disabled)onUpload(files);}}/>
  {items.length>0&&<><input type="search" value={query} onChange={event=>setQuery(event.target.value)} aria-label={t('ค้นหาในคลังภาพ','Search gallery')} placeholder={t('ค้นหาชื่อภาพ','Search image names')} className="mt-2 w-full shrink-0 rounded-md border border-line bg-base px-2 py-1 text-xs"/>
   <div className={cn('mt-2 grid grid-cols-3 gap-2 overflow-y-auto overscroll-contain sm:grid-cols-5',fill?'min-h-0 flex-1 auto-rows-min':'max-h-44')}>
    {filtered.map(item=><div key={item.id} className="min-w-0 rounded-lg border border-line bg-base p-1"><button type="button" disabled={disabled} aria-label={t(`ใช้ภาพ ${item.name}`,`Use image ${item.name}`)} onClick={()=>onSelect(item)} className="flex w-full min-w-0 cursor-pointer flex-col items-center gap-1 p-1 hover:bg-panel-2 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"><span className="flex h-12 w-full items-center justify-center overflow-hidden">{renderPreview(item)}</span><span className="w-full truncate text-[10px]" title={item.name}>{item.name}</span></button><div className="flex items-center justify-between gap-1 pl-1"><span className="text-[10px] text-muted-foreground">{Math.ceil(item.bytes/1000)} KB</span><ButtonCommon type="button" size="xs" circle color="danger" variant="ghost" disabled={disabled} aria-label={t(`ลบ ${item.name} จากคลังภาพ`,`Remove ${item.name} from gallery`)} onClick={()=>onRemove(item)} icon={deletingId===item.id?<Loader2 className="animate-spin"/>:<Trash2/>}/></div></div>)}
   </div>{!filtered.length&&<p className="mt-2 shrink-0 text-xs text-muted-foreground">{t('ไม่พบภาพ','No matching images')}</p>}</>}
  {!items.length&&<p className="py-8 text-center text-xs text-muted-foreground">{t('ยังไม่มีภาพในคลัง','No images in the gallery yet')}</p>}
  {busy&&<p role="status" className="mt-2 shrink-0 text-[11px] text-muted-foreground">{deletingId?t('กำลังลบรูปจากคลังภาพ…','Removing image from gallery…'):t('กำลังย่อและเก็บภาพในเครื่อง…','Optimizing and saving on your device…')}</p>}
  {notice&&<p role="status" className="mt-2 shrink-0 text-[11px] text-muted-foreground">{notice}</p>}{error&&<p role="alert" className="mt-2 shrink-0 text-[11px] text-destructive">{error}</p>}
 </section>;
}
