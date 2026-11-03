"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {Images,Pause,Play} from 'lucide-react';
import {ScenioView} from 'scenio/react';
import {emptyDocument,validateDocument,type ScenioDocument} from 'scenio/core';
import ModalCommon from '@/components/common/modal';
import ButtonCommon from '@/components/common/button';
import {useUiStore} from '@/features/ui/ui-store';
import {useKaraokeStore} from '@/stores/karaoke-store';
import {usePlayerSetupStore} from '@/hooks/usePlayerSetup';
import {useTimerStore} from '@/timer-worker/store';
import {saveProjectWallpaper,type WallpaperAssetSummary} from '@/lib/database/db';
import {useSettingsStore} from '@/features/settings/settings-store';
import {text} from '@/features/settings/locale';
import LyricsPreview from '@/modules/lyrics-editor/lyrics-preview';
import {midiDurationSeconds} from '@/lib/karaoke-engine/midi-clock';
import {songWallpaperClock,seekWallpaper,createWallpaperPreviewClock} from './clock';
import {resolveWallpaperAsset} from './storage';
import {EditorDrawer} from '@/components/modals/edit-lyrics/editor-drawer';
import {WallpaperGallery} from './wallpaper-gallery';
import {WallpaperBlocks} from './wallpaper-blocks';
import {DEFAULT_WALLPAPER_URL} from './default-wallpaper';
import {createWallpaperPlayback} from './wallpaper-playback';
import {createWallpaperAutosave} from './wallpaper-autosave';
import {pushHistory} from '@/stores/karaoke-store/history';
import {snapshot} from '@/stores/karaoke-store/actions/history.actions';
import {fitWallpaperBlocks} from './wallpaper-block-model';
const formatTime=(ms:number)=>`${Math.floor(ms/60000).toString().padStart(2,'0')}:${(ms%60000/1000).toFixed(3).padStart(6,'0')}`;
export function WallpaperEditor(){
 const open=useUiStore(s=>s.dialog==='wallpaper'),projectId=useKaraokeStore(s=>s.projectId);
 return open&&projectId?<WallpaperEditorSession key={projectId}/>:null;
}
function WallpaperEditorSession(){
 const close=useUiStore(s=>s.openDialog),projectId=useKaraokeStore(s=>s.projectId);
 const locale=useSettingsStore(s=>s.uiLocale);const t=(th:string,en:string)=>text(locale,th,en);
 const [draft,setDraftState]=useState<ScenioDocument>(()=>structuredClone(useKaraokeStore.getState().wallpaper??emptyDocument())),[error,setError]=useState(''),[busy,setBusy]=useState(false),[seekMs,setSeekMs]=useState(()=>songWallpaperClock.read().positionMs),[gallery,setGallery]=useState(false),[effectDrawerOpen,setEffectDrawerOpen]=useState(false);
 const [globalFade,setGlobalFade]=useState(()=>useKaraokeStore.getState().wallpaper?.scenes[0]?.transition.durationMs??1000);
 const galleryButton=useRef<HTMLButtonElement>(null);
 const [saveState,setSaveState]=useState<'saving'|'saved'|'error'>('saved');
 const autosave=useMemo(()=>createWallpaperAutosave<ScenioDocument>(next=>saveProjectWallpaper(projectId!,next),(state,error)=>{setSaveState(state);if(error)setError(error instanceof Error?error.message:String(error));}),[projectId]);
 useEffect(()=>{return()=>{void autosave.flush().catch(error=>console.error('Wallpaper autosave failed:',error));};},[autosave]);
 const clock=useMemo(()=>createWallpaperPreviewClock(songWallpaperClock),[]);
 const totalSeconds=useTimerStore(s=>s.totalSeconds);
 const storedDuration=useKaraokeStore(s=>s.playerState.duration),midi=useKaraokeStore(s=>s.playerState.midi),mode=useKaraokeStore(s=>s.mode);
 const sourceSeconds=mode==='midi'&&midi?midiDurationSeconds(storedDuration??midi.duration,midi.ticksPerBeat,midi.tempos):storedDuration;
 const knownSeconds=sourceSeconds&&sourceSeconds>0?sourceSeconds:totalSeconds;
 const songEnd=Math.max(1000,Math.round(knownSeconds>0?knownSeconds*1000:Math.max(30000,...draft.scenes.map(s=>(s.endMs??s.startMs+10000)))));
 const blockDocument=useMemo(()=>fitWallpaperBlocks(draft,songEnd),[draft,songEnd]);
 const setDraft=(value:ScenioDocument)=>{try{
  const fitted=fitWallpaperBlocks(value,songEnd),used=new Set(fitted.scenes.map(s=>s.assetId)),next={...fitted,assets:fitted.assets.filter(a=>used.has(a.id))};
  validateDocument(next,knownSeconds>0?Math.round(knownSeconds*1000):undefined);
  setDraftState(next);setError('');
  useKaraokeStore.setState(state=>({wallpaper:next,history:pushHistory(state.history,snapshot({...state,wallpaper:next}),{label:'Wallpaper',coalesce:'wallpaper'})}));
  autosave.schedule(next);
 }catch(error){setError(error instanceof Error?error.message:String(error));}};
 const playback=useMemo(()=>createWallpaperPlayback({
  isPlaying:()=>usePlayerSetupStore.getState().playerControls?.isPlaying()??false,
  pause:()=>{usePlayerSetupStore.getState().playerControls?.pause();useKaraokeStore.getState().actions.setIsPlaying(false);},
  play:()=>usePlayerSetupStore.getState().playerControls?.play(),
  seek:ms=>seekWallpaper(ms/1000),
  preview:ms=>{clock.override(ms);if(ms!==null)setSeekMs(ms);},
  error:error=>setError(error instanceof Error?error.message:String(error)),
 }),[clock]);
 const playing=useKaraokeStore(s=>s.isPlaying),controls=usePlayerSetupStore(s=>s.playerControls);
 useEffect(()=>{playback.activate();const off=songWallpaperClock.subscribe(()=>{if(!clock.isManual())setSeekMs(songWallpaperClock.read().positionMs);});return()=>{off();playback.dispose();};},[playback,clock]);
 const draftValidation=useMemo(()=>{try{validateDocument(draft);return '';}catch(e){return e instanceof Error?e.message:String(e);}},[draft]);
 const validPreview=draftValidation?null:draft;
 const seek=(ms:number)=>playback.seek(ms);

 const addFromGallery=(row:WallpaperAssetSummary)=>{try{
  const next=structuredClone(draft);if((next.scenes.length+1)*1000>songEnd)throw new Error(t('เวลาเพลงไม่พอสำหรับภาพเพิ่ม','Not enough song time for another image'));
  if(!next.assets.some(a=>a.id===row.id))next.assets.push(row.asset);
  next.scenes.push({id:crypto.randomUUID(),assetId:row.id,startMs:0,transition:{type:'fade',durationMs:globalFade}});
  setDraft(fitWallpaperBlocks(next,songEnd,globalFade));setGallery(false);setError('');
 }catch(error){setError(error instanceof Error?error.message:String(error));}};
 const changeAllTransitions=(duration:number)=>{setGlobalFade(duration);setDraft(fitWallpaperBlocks(draft,songEnd,duration));};

 const backToTimeline=()=>setGallery(false);
 const dismiss=async()=>{if(gallery){backToTimeline();return;}if(effectDrawerOpen||busy)return;
  setBusy(true);try{await autosave.flush();close(null);}catch(error){setError(error instanceof Error?error.message:String(error));}finally{setBusy(false);}};
 return <ModalCommon open={true} onClose={()=>void dismiss()} showCloseButton={!gallery&&!effectDrawerOpen}
 title="Wallpaper · Scenio"
 description={t('เพิ่มภาพแล้วแบ่งเวลาเต็มเพลงให้อัตโนมัติ · ลากเพื่อเรียงภาพ','Add images to fill the song automatically · drag to reorder')}
 onKeyDown={event=>{
  if(event.code!=='Space'||event.ctrlKey||event.metaKey||event.altKey||gallery||effectDrawerOpen)return;
  const target=event.target as HTMLElement;
  if(target.isContentEditable||target.closest('textarea,select,[contenteditable="true"],input:not([type="range"])'))return;
  event.preventDefault();event.stopPropagation();
  if(!event.repeat&&controls&&!busy)playback.toggle();
 }}
 bodyClassName="relative flex min-h-0 flex-col overflow-hidden" modalClassName="h-[calc(100dvh-1rem)] !max-h-[calc(100dvh-1rem)]"
 footer={<div className="flex items-center justify-between gap-2"><span role="status" className={`text-xs ${saveState==='error'?'text-destructive':'text-muted-foreground'}`}>{saveState==='saving'?t('กำลังบันทึก…','Saving…'):saveState==='error'?t('บันทึกไม่สำเร็จ','Could not save'):t('บันทึกอัตโนมัติแล้ว','All changes saved')}</span><ButtonCommon variant="outline" disabled={busy} onClick={()=>void dismiss()}>{t('ปิด','Close')}</ButtonCommon></div>}>

 <div className="flex min-h-0 flex-1 flex-col">

 <div className="relative aspect-video max-h-[24dvh] min-h-0 w-full shrink overflow-hidden border border-line bg-black" style={{backgroundImage:`url("${DEFAULT_WALLPAPER_URL}")`,backgroundPosition:'center',backgroundSize:'cover'}} data-wallpaper-preview>
 {validPreview&&<ScenioView targetFps={()=>useSettingsStore.getState().targetFps} document={blockDocument} clock={clock} resolveAsset={resolveWallpaperAsset}/>}
 <div className="pointer-events-none absolute inset-0 bg-black/20"/>
 <div className="pointer-events-none absolute inset-0"><LyricsPreview textStyle={{fontSize:20}} wallpaper={false}/></div>
 </div>
 <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
 <div className="my-2 flex h-10 shrink-0 items-center gap-2" data-wallpaper-transport><ButtonCommon size="sm" circle disabled={!controls||busy} icon={playing?<Pause/>:<Play/>} aria-label={playing?'Pause':'Play'} onClick={()=>playback.toggle()}/><label className="flex h-full min-w-0 flex-1 flex-col"><input aria-label="Wallpaper player position" className="block h-7 min-h-0 w-full accent-primary" type="range" min={0} max={songEnd} step={100} value={Math.min(songEnd,seekMs)} disabled={busy} onChange={e=>void seek(+e.target.value)}/><span className="flex h-3 items-start justify-between font-mono text-[9px] leading-[10px] text-muted-foreground"><span>{formatTime(Math.round(seekMs))}</span><span>{formatTime(songEnd)}</span></span></label></div>


 {(error||draftValidation)&&<p role="alert" className="shrink-0 pb-2 text-xs text-destructive">{error||draftValidation}</p>}
 <WallpaperBlocks fadeMs={globalFade} onFadeChange={changeAllTransitions} galleryAction={<ButtonCommon ref={galleryButton} variant="outline" size="sm" disabled={busy} icon={<Images/>} onClick={()=>setGallery(true)}>{t('คลังภาพ','Gallery')}</ButtonCommon>} onEffectDrawerChange={setEffectDrawerOpen} document={blockDocument} songEnd={songEnd} onChange={setDraft} disabled={busy} t={t}/>
 </div>
 </div>
 <EditorDrawer open={gallery} onClose={backToTimeline} title={t('คลังภาพ Wallpaper','Wallpaper gallery')} description={t('เลือกภาพเพื่อเพิ่ม หรืออัปโหลดเก็บไว้ในคลัง','Select an image to add, or upload to your gallery')} bodyClassName="flex min-h-0 flex-col overflow-hidden">
 {gallery&&<WallpaperGallery onSelect={addFromGallery} t={t}/>}
 </EditorDrawer>
 </ModalCommon>;
}
