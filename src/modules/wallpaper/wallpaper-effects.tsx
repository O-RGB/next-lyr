"use client";
import {Blend,ZoomIn,ZoomOut,Shuffle,Trash2} from 'lucide-react';
import type {ScenioDocument} from 'scenio/core';
import ButtonCommon from '@/components/common/button';
import {EditorDrawer} from '@/components/modals/edit-lyrics/editor-drawer';
import {clipEnd,resizeFade} from './timeline-model';
export function WallpaperEffects({open,onClose,document:doc,index,songEnd,onChange,onReorder,onDelete,disabled,t}:{
 open:boolean;onClose:()=>void;document:ScenioDocument;index:number;songEnd:number;
 onChange:(doc:ScenioDocument)=>void;onReorder?:()=>void;onDelete:()=>void;disabled:boolean;t:(th:string,en:string)=>string;
}){
 const scene=doc.scenes[index];if(!scene)return null;
 const motion=(type:'zoom-in'|'zoom-out'|null)=>onChange({...doc,scenes:doc.scenes.map((s,i)=>i===index?{...s,endMs:clipEnd(doc,i,songEnd),motion:type?{type,amount:s.motion?.amount??.12}:undefined}:s)});
 const noTransition=()=>onChange({...doc,scenes:doc.scenes.map((s,i)=>i===index?{...s,transition:{type:'fade',durationMs:0}}:s)});
 return <EditorDrawer open={open} onClose={onClose} placement="bottom" size="compact" title={t('เอฟเฟกต์ภาพ','Image effects')} description={`${t('ภาพ','Clip')} ${index+1} · ${t('เลือก Transition และ Animation แยกกันได้','Choose transition and animation independently')}`} bodyClassName="space-y-4">
  <section className="space-y-2"><p className="text-xs font-medium">{t('ทรานสิชชัน','Transition')}</p><div className="flex gap-2" role="group" aria-label="Transition">
   <ButtonCommon size="sm" className="flex-1" disabled={disabled} variant={scene.transition.durationMs===0?'solid':'outline'} aria-pressed={scene.transition.durationMs===0} onClick={noTransition}>{t('ไม่มี','None')}</ButtonCommon>
   <ButtonCommon size="sm" className="flex-1" disabled={disabled} variant={scene.transition.durationMs>0?'solid':'outline'} aria-pressed={scene.transition.durationMs>0} icon={<Blend/>} onClick={()=>onChange(resizeFade(doc,index,scene.transition.durationMs||1000,songEnd))}>Fade</ButtonCommon>
  </div>{scene.transition.durationMs>0&&<label className="flex items-center gap-3 text-xs"><span className="w-10 shrink-0">{(scene.transition.durationMs/1000).toFixed(1)}s</span><input type="range" aria-label="Transition duration" className="h-7 min-w-0 flex-1 accent-primary" min={100} max={clipEnd(doc,index,songEnd)-scene.startMs} step={100} value={scene.transition.durationMs} disabled={disabled} onChange={e=>onChange(resizeFade(doc,index,+e.target.value,songEnd))}/></label>}</section>
  <section className="space-y-2"><p className="text-xs font-medium">{t('แอนิเมชัน','Animation')}</p><div className="flex gap-2" role="group" aria-label="Animation">
   <ButtonCommon size="sm" className="min-w-0 flex-1" disabled={disabled} variant={!scene.motion?'solid':'outline'} aria-pressed={!scene.motion} onClick={()=>motion(null)}>{t('ไม่มี','None')}</ButtonCommon>
   <ButtonCommon size="sm" className="min-w-0 flex-1" disabled={disabled} variant={scene.motion?.type==='zoom-in'?'solid':'outline'} aria-pressed={scene.motion?.type==='zoom-in'} icon={<ZoomIn/>} onClick={()=>motion('zoom-in')}>Zoom in</ButtonCommon>
   <ButtonCommon size="sm" className="min-w-0 flex-1" disabled={disabled} variant={scene.motion?.type==='zoom-out'?'solid':'outline'} aria-pressed={scene.motion?.type==='zoom-out'} icon={<ZoomOut/>} onClick={()=>motion('zoom-out')}>Zoom out</ButtonCommon>
  </div>{scene.motion&&<label className="flex items-center gap-3 text-xs"><span className="w-10 shrink-0">{Math.round(scene.motion.amount*100)}%</span><input type="range" aria-label="Zoom amount" className="h-7 min-w-0 flex-1 accent-primary" min={5} max={30} step={1} value={Math.round(scene.motion.amount*100)} disabled={disabled} onChange={e=>onChange({...doc,scenes:doc.scenes.map((s,i)=>i===index?{...s,motion:{...s.motion!,amount:+e.target.value/100}}:s)})}/></label>}</section>
  <div className="flex justify-end gap-1 border-t border-line pt-2">{onReorder&&<ButtonCommon variant="ghost" circle size="sm" disabled={disabled} icon={<Shuffle/>} aria-label={t('เรียงภาพ','Reorder clips')} onClick={()=>{onClose();onReorder?.();}}/>}<ButtonCommon variant="ghost" circle size="sm" color="danger" disabled={disabled} icon={<Trash2/>} aria-label={t('ลบภาพจากไทม์ไลน์','Delete clip')} onClick={()=>{onClose();onDelete();}}/></div>
 </EditorDrawer>;
}
