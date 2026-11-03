import {useTimerStore} from '@/timer-worker/store';
import {createSmoothClock,type ScenioClock} from 'scenio/runtime';
import {useSettingsStore} from '@/features/settings/settings-store';
import {usePlayerSetupStore} from '@/hooks/usePlayerSetup';
import {useKaraokeStore} from '@/stores/karaoke-store';
import {midiTickToSeconds} from '@/lib/karaoke-engine/midi-clock';
export const songWallpaperClock:ScenioClock=createSmoothClock({
 read:()=>{const t=useTimerStore.getState();return {positionMs:Math.max(0,t.elapsedSeconds*1000),playing:t.presentationRunning};},
 subscribe:listener=>useTimerStore.subscribe(listener),
},()=>useSettingsStore.getState().playbackRate);
/** PlayerRef takes ticks for MIDI and seconds for other sources. Never assume fixed BPM. */
export async function seekWallpaper(seconds:number){
 const controls=usePlayerSetupStore.getState().playerControls;if(!controls)return;
 controls.pause();useKaraokeStore.getState().actions.setIsPlaying(false);
 const {mode,playerState}=useKaraokeStore.getState();
 if(mode==='midi'&&playerState.midi){const m=playerState.midi;let low=0,high=Math.max(1,m.ticksPerBeat);while(midiTickToSeconds(high,m.ticksPerBeat,m.tempos)<seconds&&high<2**45)high*=2;
  for(let i=0;i<48;i++){const mid=(low+high)/2;if(midiTickToSeconds(mid,m.ticksPerBeat,m.tempos)<seconds)low=mid;else high=mid;}await controls.seek(high);
 }else await controls.seek(seconds);
 // Wait for the seek acknowledgement before handing the preview back to the live clock.
 await useTimerStore.getState().getCurrentTiming();
}


/** Mutable transport state stays outside React; no selected lyric position is consulted. */
export function createWallpaperPreviewClock(host:ScenioClock){
 let position:number|null=null;const listeners=new Set<()=>void>();
 return {
  read:()=>position===null?host.read():{positionMs:position,playing:false},
  isManual:()=>position!==null,
  override(value:number|null){position=value;for(const listener of listeners)listener();},
  subscribe(listener:()=>void){listeners.add(listener);const off=host.subscribe(listener);return()=>{listeners.delete(listener);off();};},
 };
}
