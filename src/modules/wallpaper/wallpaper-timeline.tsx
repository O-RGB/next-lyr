"use client";
import {useCallback,useEffect,useLayoutEffect,useRef,useState,type ReactNode,type PointerEvent as ReactPointerEvent} from 'react';
import {Check,GripVertical,Minus,Plus,Blend,ScanLine,Sparkles} from 'lucide-react';
import type {ScenioDocument} from 'scenio/core';
import ButtonCommon from '@/components/common/button';
import {WallpaperEffects} from './wallpaper-effects';
import {ImageThumb} from './image-thumb';
import {clipEnd,resizeClip,resizeFade,reorderClip} from './timeline-model';
type Props={galleryAction?:ReactNode;onEffectDrawerChange?:(open:boolean)=>void;document:ScenioDocument;songEnd:number;position:number;onChange:(doc:ScenioDocument)=>void;onSeek:(ms:number)=>void;disabled:boolean;t:(th:string,en:string)=>string};
type Resize={pointer:number;x:number;index:number;edge:'start'|'end';kind:'clip'|'fade';base:ScenioDocument;scroll:number};
export function WallpaperTimeline({document:doc,songEnd,position,onChange,onSeek,disabled,t,galleryAction,onEffectDrawerChange}:Props){
 const [scrollLeft,setScrollLeft]=useState(0),[viewWidth,setViewWidth]=useState(400);
 const [effectsOpen,setEffectsOpen]=useState(false);
 const [zoom,setZoom]=useState<number|null>(64),[selected,setSelected]=useState<string|null>(null),[effect,setEffect]=useState<string|null>(null),[ordering,setOrdering]=useState(false),[dragging,setDragging]=useState<string|null>(null),[over,setOver]=useState<string|null>(null);
 const viewport=useRef<HTMLDivElement>(null),resize=useRef<Resize|null>(null),hold=useRef<ReturnType<typeof setTimeout>|null>(null),holdPoint=useRef({x:0,y:0}),drag=useRef<{from:string;to:string}|null>(null),latest=useRef({doc,onChange,songEnd});
 useEffect(()=>{latest.current={doc,onChange,songEnd};},[doc,onChange,songEnd]);
 const clearHold=()=>{if(hold.current)clearTimeout(hold.current);hold.current=null;};
 useEffect(()=>{const move=(e:PointerEvent)=>{if(!drag.current)return;e.preventDefault();const target=window.document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-reorder-id]');if(target){drag.current.to=target.dataset.reorderId!;setOver(drag.current.to);}const grid=window.document.querySelector<HTMLElement>('[data-reorder-grid]');if(grid){const r=grid.getBoundingClientRect();if(e.clientY>r.bottom-48)grid.scrollTop+=12;else if(e.clientY<r.top+48)grid.scrollTop-=12;}};
 const end=()=>{if(drag.current){const {doc,onChange,songEnd}=latest.current;onChange(reorderClip(doc,doc.scenes.findIndex(s=>s.id===drag.current!.from),doc.scenes.findIndex(s=>s.id===drag.current!.to),songEnd));drag.current=null;setDragging(null);setOver(null);}clearHold();};
 window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);return()=>{clearHold();window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);};},[]);
 useEffect(()=>{const element=viewport.current;if(!element)return;const observer=new ResizeObserver(entries=>setViewWidth(entries[0].contentRect.width));observer.observe(element);return()=>observer.disconnect();},[]);
 const scrub=useRef<number|null>(null);
 const fitScale=Math.max(0.001,viewWidth/(songEnd/1000)),scale=zoom===null?fitScale:Math.max(fitScale,zoom),maxScale=Math.max(160,fitScale*4);
 const zoomAnchor=useRef<{seconds:number;x:number}|null>(null),pinch=useRef<{distance:number;scale:number;seconds:number}|null>(null),pinchBlockedUntil=useRef(0);
 const zoomAt=useCallback((requested:number,x?:number,seconds?:number)=>{const v=viewport.current;if(!v)return;const point=x??v.clientWidth/2;const next=Math.max(fitScale,Math.min(maxScale,requested));const anchor={seconds:seconds??(v.scrollLeft+point)/scale,x:point};
  if(Math.abs(next-scale)<0.00001){v.scrollLeft=Math.max(0,anchor.seconds*next-anchor.x);zoomAnchor.current=null;return;}
  zoomAnchor.current=anchor;setZoom(next<=fitScale+0.00001?null:next);
 },[fitScale,maxScale,scale]);
 useLayoutEffect(()=>{const v=viewport.current,anchor=zoomAnchor.current;if(v&&anchor){v.scrollLeft=Math.max(0,anchor.seconds*scale-anchor.x);zoomAnchor.current=null;}},[scale]);
 useEffect(()=>{const v=viewport.current;if(!v)return;
  const start=(e:TouchEvent)=>{if(disabled||e.touches.length<2)return;if(e.cancelable)e.preventDefault();clearHold();resize.current=null;scrub.current=null;
   const a=e.touches[0],b=e.touches[1],r=v.getBoundingClientRect(),x=(a.clientX+b.clientX)/2-r.left-v.clientLeft;
   if(!pinch.current)pinch.current={distance:Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)),scale,seconds:(v.scrollLeft+x)/scale};
   pinchBlockedUntil.current=Date.now()+400;
  };
  const move=(e:TouchEvent)=>{if(!pinch.current&&e.touches.length>=2)start(e);const gesture=pinch.current;if(!gesture)return;if(e.cancelable)e.preventDefault();pinchBlockedUntil.current=Date.now()+400;if(e.touches.length<2)return;
   const a=e.touches[0],b=e.touches[1],r=v.getBoundingClientRect(),x=(a.clientX+b.clientX)/2-r.left-v.clientLeft;
   zoomAt(gesture.scale*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/gesture.distance,x,gesture.seconds);
  };
  const end=(e:TouchEvent)=>{if(!pinch.current)return;if(e.cancelable)e.preventDefault();pinchBlockedUntil.current=Date.now()+400;if(!e.touches.length)pinch.current=null;};
  v.addEventListener('touchstart',start,{passive:false});v.addEventListener('touchmove',move,{passive:false});v.addEventListener('touchend',end,{passive:false});v.addEventListener('touchcancel',end,{passive:false});
  return()=>{v.removeEventListener('touchstart',start);v.removeEventListener('touchmove',move);v.removeEventListener('touchend',end);v.removeEventListener('touchcancel',end);};
 },[disabled,scale,zoomAt]);
 const selectedIndex=doc.scenes.findIndex(s=>s.id===selected),effectIndex=doc.scenes.findIndex(s=>s.id===effect);
 const targetIndex=selectedIndex>=0?selectedIndex:effectIndex;
 const effectsVisible=effectsOpen&&targetIndex>=0;
 useEffect(()=>{onEffectDrawerChange?.(effectsVisible);return()=>onEffectDrawerChange?.(false);},[effectsVisible,onEffectDrawerChange]);
 useEffect(()=>{if(effectsVisible||ordering)return;
  const clearSelection=(event:PointerEvent)=>{const target=event.target;if(!(target instanceof Element))return;
   if(target.closest('[data-timeline-clip],[data-transition],[data-wallpaper-effects-trigger],[data-slot="sheet-content"],[data-reorder-grid]'))return;
   setSelected(null);setEffect(null);
  };
  window.document.addEventListener('pointerdown',clearSelection);return()=>window.document.removeEventListener('pointerdown',clearSelection);
 },[effectsVisible,ordering]);
 const width=Math.max(viewWidth,songEnd/1000*scale),tickSeconds=[1,2,5,10,15,30,60,120,300,600,1800,3600].find(step=>step*scale>=70)??Math.ceil(70/scale);
 const firstTick=Math.max(0,Math.floor((scrollLeft-100)/(scale*tickSeconds))),lastTick=Math.min(Math.floor(songEnd/1000/tickSeconds),Math.ceil((scrollLeft+viewWidth+100)/(scale*tickSeconds)));
 const visible=(start:number,end:number)=>end/1000*scale>=scrollLeft-120&&start/1000*scale<=scrollLeft+viewWidth+120;
 const scrubAt=(clientX:number,autoScroll=false)=>{const v=viewport.current;if(!v)return;const r=v.getBoundingClientRect();if(autoScroll){if(clientX>r.right-24)v.scrollLeft+=12;else if(clientX<r.left+24)v.scrollLeft-=12;}onSeek(Math.max(0,Math.min(songEnd,Math.round((clientX-r.left-v.clientLeft+v.scrollLeft)/scale*10)*100)));};
 const startScrub=(e:ReactPointerEvent<HTMLElement>)=>{if(disabled)return;e.preventDefault();e.stopPropagation();clearHold();scrub.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);scrubAt(e.clientX);};
 const moveScrub=(e:ReactPointerEvent<HTMLElement>)=>{if(scrub.current!==e.pointerId)return;e.preventDefault();e.stopPropagation();scrubAt(e.clientX,true);};
 const endScrub=(e:ReactPointerEvent<HTMLElement>)=>{if(scrub.current!==e.pointerId)return;e.preventDefault();e.stopPropagation();if(e.type!=='pointercancel')scrubAt(e.clientX);scrub.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);};
 const startResize=(e:ReactPointerEvent<HTMLButtonElement>,index:number,edge:'start'|'end',kind:'clip'|'fade')=>{if(disabled||pinch.current)return;e.preventDefault();e.stopPropagation();clearHold();if(kind==='clip'&&selected!==doc.scenes[index].id){setSelected(doc.scenes[index].id);setEffect(null);return;}e.currentTarget.setPointerCapture(e.pointerId);resize.current={pointer:e.pointerId,x:e.clientX,index,edge,kind,base:doc,scroll:viewport.current?.scrollLeft??0};setSelected(kind==='clip'?doc.scenes[index].id:null);setEffect(kind==='fade'?doc.scenes[index].id:null);};
 const moveResize=(e:ReactPointerEvent<HTMLButtonElement>)=>{const r=resize.current;if(!r||r.pointer!==e.pointerId)return;e.preventDefault();e.stopPropagation();const v=viewport.current;if(v){const box=v.getBoundingClientRect();if(e.clientX>box.right-32)v.scrollLeft+=8;else if(e.clientX<box.left+32)v.scrollLeft-=8;}const delta=(e.clientX-r.x+(v?.scrollLeft??0)-r.scroll)/scale*1000;
 onChange(r.kind==='clip'?resizeClip(r.base,r.index,r.edge,delta,songEnd):resizeFade(r.base,r.index,r.base.scenes[r.index].transition.durationMs+2*(r.edge==='start'?-delta:delta),songEnd));};
 const finishResize=(e:ReactPointerEvent<HTMLButtonElement>)=>{if(resize.current?.pointer!==e.pointerId)return;e.stopPropagation();resize.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);};
 const handle=(index:number,edge:'start'|'end',kind:'clip'|'fade')=><button type="button" disabled={disabled} aria-label={`${kind==='clip'?'Clip':'Fade'} ${index+1} ${edge} handle`} className={`absolute top-0 z-20 flex h-full w-7 touch-none cursor-ew-resize items-center justify-center ${edge==='start'?'left-0':'right-0'} ${kind==='fade'?'text-primary':`bg-black/30 text-white transition-opacity ${selected===doc.scenes[index].id?'opacity-100':'opacity-25'}`}`} onPointerDown={e=>startResize(e,index,edge,kind)} onPointerMove={moveResize} onPointerUp={finishResize} onPointerCancel={finishResize} onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const delta=e.key==='ArrowLeft'?-100:100;onChange(kind==='clip'?resizeClip(doc,index,edge,delta,songEnd):resizeFade(doc,index,doc.scenes[index].transition.durationMs+2*(edge==='start'?-delta:delta),songEnd));}}}><span className="h-5 w-1 rounded-full bg-current opacity-80"/></button>;
 const remove=()=>{if(targetIndex<0)return;const end=clipEnd(doc,targetIndex,songEnd),length=end-doc.scenes[targetIndex].startMs;onChange({...doc,scenes:doc.scenes.filter((_,i)=>i!==targetIndex).map((s,i)=>i>=targetIndex?{...s,startMs:s.startMs-length,endMs:(s.endMs??songEnd)-length}:s)});setSelected(null);};
 return <div className="flex min-h-0 flex-1 flex-col gap-2" data-wallpaper-timeline>
  <div className="flex shrink-0 items-center justify-between gap-1">{galleryAction}<div className="flex items-center gap-1">{targetIndex>=0&&<ButtonCommon variant="outline" size="xs" disabled={disabled} icon={<Sparkles/>} data-wallpaper-effects-trigger aria-label="Effect" childrenClassName="max-[360px]:hidden" onClick={()=>setEffectsOpen(true)}>Effect</ButtonCommon>}<ButtonCommon variant="ghost" size="xs" circle disabled={disabled} icon={<ScanLine/>} aria-label="Fit entire song" onClick={()=>zoomAt(fitScale,0,0)}/><ButtonCommon variant="ghost" size="xs" circle disabled={disabled||scale<=fitScale+0.001} icon={<Minus/>} aria-label="Zoom timeline out" onClick={()=>zoomAt(scale/1.5)}/><ButtonCommon variant="ghost" size="xs" circle disabled={disabled||scale>=maxScale} icon={<Plus/>} aria-label="Zoom timeline in" onClick={()=>zoomAt(scale*1.5)}/></div></div>
  <div ref={viewport} onClickCapture={e=>{if(Date.now()<pinchBlockedUntil.current){e.preventDefault();e.stopPropagation();}}} onScroll={e=>setScrollLeft(e.currentTarget.scrollLeft)} className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain border border-line bg-base" style={{touchAction:'pan-x'}} data-timeline-scroll>
   <div className="relative h-full min-h-[166px] select-none overflow-hidden" style={{width}}>
    <div className="absolute inset-x-0 top-0 h-7 cursor-pointer border-b border-line" aria-label="Timeline ruler" style={{touchAction:'none'}} onPointerDown={startScrub} onPointerMove={moveScrub} onPointerUp={endScrub} onPointerCancel={endScrub}>{Array.from({length:Math.max(0,lastTick-firstTick+1)},(_,n)=>{const i=firstTick+n;return <span key={i} className="absolute top-1 h-6 border-l border-line pl-1 text-[9px] text-muted-foreground" style={{left:i*tickSeconds*scale}}>{i*tickSeconds}s</span>;})}</div>
    {doc.scenes.map((s,i)=>{const length=clipEnd(doc,i,songEnd)-s.startMs;if(!visible(s.startMs,s.startMs+length))return null;return <div key={s.id} data-timeline-clip={s.id} className={`absolute top-9 h-[72px] overflow-hidden border-2 ${selected===s.id?'border-primary':'border-line'}`} style={{left:s.startMs/1000*scale,width:Math.max(1,length/1000*scale)}}>
     <button type="button" disabled={disabled} className="absolute inset-0 cursor-pointer" aria-label={`Select clip ${i+1}`} onClick={()=>{setSelected(s.id);setEffect(null);}} onContextMenu={e=>e.preventDefault()} onPointerDown={e=>{if(disabled)return;clearHold();holdPoint.current={x:e.clientX,y:e.clientY};hold.current=setTimeout(()=>{setOrdering(true);setDragging(s.id);setOver(s.id);drag.current={from:s.id,to:s.id};hold.current=null;},450);}} onPointerMove={e=>{if(Math.hypot(e.clientX-holdPoint.current.x,e.clientY-holdPoint.current.y)>8)clearHold();}} onPointerUp={clearHold} onPointerCancel={clearHold}>
      <ImageThumb id={s.assetId}/>{s.motion&&<span className="pointer-events-none absolute inset-x-7 top-1 truncate text-center text-[9px] text-white drop-shadow">{s.motion.type==='zoom-in'?'Zoom in':'Zoom out'}</span>}<span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-7 py-1 text-[10px] text-white">{i+1} · {(length/1000).toFixed(1)}s</span>
     </button>{handle(i,'start','clip')}{handle(i,'end','clip')}
    </div>;})}
    {doc.scenes.map((s,i)=>i>0&&s.transition.durationMs>0&&visible(s.startMs-s.transition.durationMs/2-28000/scale,s.startMs+s.transition.durationMs/2+28000/scale)&&<div key={s.id} className={`absolute top-[120px] h-11 border ${effect===s.id?'border-primary bg-primary/20':'border-line bg-panel-2'}`} style={{left:s.startMs/1000*scale-(56+s.transition.durationMs/1000*scale)/2,width:56+s.transition.durationMs/1000*scale}} data-transition={s.id}>
     <button type="button" disabled={disabled} className="absolute inset-0 flex cursor-pointer items-center justify-center gap-1 text-[9px]" aria-label={`Select transition ${i+1}`} onClick={()=>{setEffect(s.id);setSelected(s.id);setEffectsOpen(true);}}><Blend size={12}/><span>{(s.transition.durationMs/1000).toFixed(1)}s</span></button>{handle(i,'start','fade')}{handle(i,'end','fade')}
    </div>)}
    <div className="pointer-events-none absolute inset-y-0 z-30 w-px bg-primary" style={{left:Math.min(width-1,Math.max(0,position/1000*scale))}}><span className="absolute -left-1 top-0 size-2 rotate-45 bg-primary"/></div>
    <button type="button" role="slider" aria-label="Timeline playhead" aria-valuemin={0} aria-valuemax={songEnd} aria-valuenow={Math.round(position)} disabled={disabled} className="absolute inset-y-0 z-40 w-6 touch-none cursor-ew-resize" style={{left:Math.max(0,Math.min(width-24,position/1000*scale-12))}} onPointerDown={startScrub} onPointerMove={moveScrub} onPointerUp={endScrub} onPointerCancel={endScrub} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();onSeek(Math.max(0,Math.min(songEnd,position+(e.key==='ArrowLeft'?-100:100))));}}}/>

   </div>
  </div>
  <WallpaperEffects open={effectsVisible} onClose={()=>setEffectsOpen(false)} document={doc} index={targetIndex} songEnd={songEnd} onChange={onChange} onReorder={()=>setOrdering(true)} onDelete={remove} disabled={disabled} t={t}/>
  {ordering&&<div className="absolute inset-0 z-40 flex flex-col bg-panel p-4" role="group" aria-label="Reorder wallpaper clips"><div className="mb-3 flex shrink-0 items-center justify-between"><div><p className="text-sm font-medium">{t('เรียงลำดับภาพ','Reorder clips')}</p><p className="text-[10px] text-muted-foreground">{t('ลากภาพเพื่อเปลี่ยนตำแหน่ง','Drag a square to change its position')}</p></div><ButtonCommon size="sm" icon={<Check/>} onClick={()=>{drag.current=null;setDragging(null);setOrdering(false);}}>{t('เสร็จ','Done')}</ButtonCommon></div><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-reorder-grid><div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{doc.scenes.map((s,i)=><button key={s.id} type="button" disabled={disabled} data-reorder-id={s.id} aria-label={`Reorder clip ${i+1}`} className={`relative aspect-square touch-none cursor-grab overflow-hidden border-2 ${over===s.id?'border-primary':'border-line'} ${dragging===s.id?'opacity-50':''}`} onPointerDown={e=>{e.preventDefault();drag.current={from:s.id,to:s.id};setDragging(s.id);setOver(s.id);}} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();onChange(reorderClip(doc,i,i+(e.key==='ArrowLeft'?-1:1),songEnd));}}}><ImageThumb id={s.assetId}/><span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-2 py-1 text-xs text-white">{i+1}<GripVertical size={14}/></span></button>)}</div></div></div>}
 </div>;
}
