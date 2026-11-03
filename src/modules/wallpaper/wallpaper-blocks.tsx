"use client";
import {useEffect,useRef,useState,type ReactNode,type PointerEvent as Pointer} from 'react';
import {Blend,GripVertical,Sparkles} from 'lucide-react';
import type {ScenioDocument} from 'scenio/core';
import ButtonCommon from '@/components/common/button';
import {ImageThumb} from './image-thumb';
import {WallpaperEffects} from './wallpaper-effects';
import {fitWallpaperBlocks,moveWallpaperBlock} from './wallpaper-block-model';
const time=(ms:number)=>`${Math.floor(ms/60000)}:${Math.floor(ms%60000/1000).toString().padStart(2,'0')}`;
export function WallpaperBlocks({document:doc,songEnd,fadeMs,onFadeChange,onChange,galleryAction,disabled,onEffectDrawerChange,t}:{
 document:ScenioDocument;songEnd:number;fadeMs:number;onFadeChange:(duration:number)=>void;onChange:(doc:ScenioDocument)=>void;
 galleryAction:ReactNode;disabled:boolean;onEffectDrawerChange:(open:boolean)=>void;t:(th:string,en:string)=>string;
}){
 const [selected,setSelected]=useState<string|null>(null),[from,setFrom]=useState<number|null>(null),[over,setOver]=useState<number|null>(null);
 const grid=useRef<HTMLDivElement>(null),drag=useRef<{pointer:number;from:number;to:number}|null>(null);
 const index=doc.scenes.findIndex(s=>s.id===selected),open=index>=0;
 useEffect(()=>{onEffectDrawerChange(open);return()=>onEffectDrawerChange(false);},[open,onEffectDrawerChange]);
 const start=(e:Pointer<HTMLButtonElement>,i:number)=>{if(disabled)return;e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);drag.current={pointer:e.pointerId,from:i,to:i};setFrom(i);setOver(i);};
 const move=(e:Pointer<HTMLButtonElement>)=>{const gesture=drag.current;if(!gesture||gesture.pointer!==e.pointerId)return;e.preventDefault();const target=window.document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-wallpaper-block]');if(target){gesture.to=Number(target.dataset.wallpaperBlock);setOver(gesture.to);}const box=grid.current?.getBoundingClientRect();if(box&&grid.current){if(e.clientY>box.bottom-40)grid.current.scrollTop+=12;else if(e.clientY<box.top+40)grid.current.scrollTop-=12;}};
 const end=(e:Pointer<HTMLButtonElement>)=>{const gesture=drag.current;if(!gesture||gesture.pointer!==e.pointerId)return;e.preventDefault();if(e.type!=='pointercancel'&&gesture.from!==gesture.to)onChange(moveWallpaperBlock(doc,gesture.from,gesture.to,songEnd));drag.current=null;setFrom(null);setOver(null);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);};
 const maxFade=Math.max(100,Math.min(5000,Math.floor(songEnd/Math.max(1,doc.scenes.length)/100)*100));
 return <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden" data-wallpaper-blocks>
  <div className="flex shrink-0 items-center justify-between gap-2">{galleryAction}<span className="text-[10px] text-muted-foreground">{doc.scenes.length} {t('ภาพ · แบ่งเวลาอัตโนมัติ','images · automatic timing')}</span></div>
  <section className="shrink-0 space-y-1 border border-line bg-panel p-2" aria-label="Transition for all images"><div className="flex items-center justify-between gap-2"><span className="text-[11px]">{t('ทรานสิชชันทุกภาพ','Transition for all images')}</span><div className="flex gap-1"><ButtonCommon size="xs" variant={fadeMs===0?'solid':'outline'} aria-pressed={fadeMs===0} disabled={disabled} onClick={()=>onFadeChange(0)}>{t('ไม่มี','None')}</ButtonCommon><ButtonCommon size="xs" variant={fadeMs>0?'solid':'outline'} aria-pressed={fadeMs>0} disabled={disabled} icon={<Blend/>} onClick={()=>onFadeChange(Math.min(1000,maxFade))}>Fade</ButtonCommon></div></div>
   {fadeMs>0&&<label className="flex items-center gap-2 text-[10px] text-muted-foreground"><span className="w-10 shrink-0">{(Math.min(fadeMs,maxFade)/1000).toFixed(1)}s</span><input type="range" className="h-6 min-w-0 flex-1 accent-primary" aria-label="All images transition duration" min={100} max={maxFade} step={100} value={Math.min(fadeMs,maxFade)} disabled={disabled} onChange={e=>onFadeChange(+e.target.value)}/></label>}
  </section>
  <div ref={grid} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-wallpaper-block-list>
   {!doc.scenes.length?<p className="py-8 text-center text-xs text-muted-foreground">{t('เลือกภาพแรกจากคลัง ภาพจะยาวเต็มเพลงให้อัตโนมัติ','Choose your first image. It will fill the entire song.')}</p>:<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{doc.scenes.map((scene,i)=><div key={scene.id} data-wallpaper-block={i} className={`min-w-0 overflow-hidden border bg-panel ${over===i?'border-primary':'border-line'} ${from===i?'opacity-50':''}`}>
    <div className="relative aspect-video overflow-hidden"><button type="button" aria-label={`Image ${i+1} effects`} disabled={disabled} className="absolute inset-0 cursor-pointer" onClick={()=>setSelected(scene.id)}><ImageThumb id={scene.assetId}/><span className="absolute bottom-1 right-1 bg-black/60 p-1 text-white"><Sparkles size={12}/></span></button><button type="button" disabled={disabled} aria-label={`Move image ${i+1}`} className="absolute right-0 top-0 flex size-9 touch-none cursor-grab items-center justify-center bg-black/50 text-white" onPointerDown={e=>start(e,i)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();onChange(moveWallpaperBlock(doc,i,i+(e.key==='ArrowLeft'?-1:1),songEnd));}}}><GripVertical size={16}/></button></div>
    <div className="flex items-center justify-between gap-1 px-2 py-1 text-[10px]"><span>{i+1}</span><span className="font-mono text-muted-foreground">{time(scene.startMs)} – {time(scene.endMs!)}</span></div>
   </div>)}</div>}
  </div>
  <WallpaperEffects open={open} onClose={()=>setSelected(null)} document={doc} index={index} songEnd={songEnd} onChange={onChange} onDelete={()=>onChange(fitWallpaperBlocks({...doc,scenes:doc.scenes.filter((_,i)=>i!==index)},songEnd))} disabled={disabled} t={t}/>
 </div>;
}
