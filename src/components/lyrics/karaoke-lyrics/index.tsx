"use client";
import {usePreviewRenderTier} from './use-preview-render-tier';
import {useUiStore} from '@/features/ui/ui-store';
import {useSettingsStore} from '@/features/settings/settings-store';
import {DEFAULT_WALLPAPER_URL} from '@/modules/wallpaper/default-wallpaper';
import {SongWallpaper} from "@/modules/wallpaper/wallpaper-view";
import {useMemo,type ReactNode} from 'react';
import {LyricsCanvas} from 'lyrio/react';
import {useKaraokeStore} from '@/stores/karaoke-store';
import {useTimerStore} from '@/timer-worker/store';
import type {LyricsCharacterStyle} from '../lyrics-character';
import '@/lib/lyrics-runtime';
const clock={getValue:()=>useTimerStore.getState().presentationValue,
  on:(listener:(time:number)=>void)=>useTimerStore.subscribe((next,previous)=>{if(next.presentationValue!==previous.presentationValue)listener(next.presentationValue);})};
export default function LyricsPlayer({textStyle,playerControls,wallpaper=true}:{textStyle?:LyricsCharacterStyle;playerControls?:ReactNode;wallpaper?:boolean}){
  const cpuTier=usePreviewRenderTier();
  const covered=useUiStore(s=>s.dialog==='wallpaper');
  const targetFps=useSettingsStore(s=>s.targetFps);
  const source=useKaraokeStore(state=>state.lyricsProcessed),scope=useKaraokeStore(state=>state.projectId);
  const style=useMemo(()=>({fontSize:Number(textStyle?.fontSize)||undefined,fontWeight:textStyle?.fontWeight??700,
    ...(textStyle?.color?.color?{unsungFill:textStyle.color.color}:{}),...(textStyle?.activeColor?.color?{unsungStroke:textStyle.activeColor.color}:{}),
    ...(textStyle?.color?.colorBorder?{sungFill:textStyle.color.colorBorder}:{}),...(textStyle?.activeColor?.colorBorder?{sungStroke:textStyle.activeColor.colorBorder}:{})}),[textStyle]);
  if(wallpaper&&covered)return <div className="h-full w-full" aria-hidden="true"/>;
  return <div className="flex h-full min-h-0 w-full flex-col">
    <div className="relative flex min-h-0 flex-1 w-full items-center justify-center overflow-hidden rounded-lg text-center"
      style={{ backgroundImage: wallpaper ? `url("${DEFAULT_WALLPAPER_URL}")` : undefined, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat' }}>
      {wallpaper && <><SongWallpaper /><div className="pointer-events-none absolute inset-0 bg-black/20"/></>}
      <LyricsCanvas cpuTier={cpuTier} layout="authoring" authoring={source} scope={scope} textStyle={style} timerSignal={clock}
        lineHoldMs={100} targetFps={targetFps} ariaLabel="Karaoke lyrics preview" className="relative block h-full w-full" style={{fontFamily:'var(--font-lyrics)'}}/>
    </div>{playerControls}
  </div>;
}
