"use client";
import {useMemo,type ReactNode} from 'react';
import {LyricsCanvas} from '@next-karaoke/lyrics/react';
import {useKaraokeStore} from '@/stores/karaoke-store';
import {useTimerStore} from '@/timer-worker/store';
import type {LyricsCharacterStyle} from '../lyrics-character';
import '@/lib/lyrics-runtime';
const clock={getValue:()=>useTimerStore.getState().presentationValue,
  on:(listener:(time:number)=>void)=>useTimerStore.subscribe((next,previous)=>{if(next.presentationValue!==previous.presentationValue)listener(next.presentationValue);})};
export default function LyricsPlayer({textStyle,playerControls}:{textStyle?:LyricsCharacterStyle;playerControls?:ReactNode}){
  const source=useKaraokeStore(state=>state.lyricsProcessed),scope=useKaraokeStore(state=>state.projectId);
  const style=useMemo(()=>({fontSize:Number(textStyle?.fontSize)||undefined,fontWeight:textStyle?.fontWeight??700,
    ...(textStyle?.color?.color?{unsungFill:textStyle.color.color}:{}),...(textStyle?.activeColor?.color?{unsungStroke:textStyle.activeColor.color}:{}),
    ...(textStyle?.color?.colorBorder?{sungFill:textStyle.color.colorBorder}:{}),...(textStyle?.activeColor?.colorBorder?{sungStroke:textStyle.activeColor.colorBorder}:{})}),[textStyle]);
  return <div className="flex h-full min-h-0 w-full flex-col">
    <div className="relative flex min-h-0 flex-1 w-full items-center justify-center overflow-hidden rounded-lg text-center"
      style={{ backgroundImage: 'url("https://play.nextfeeder.com/wallpaper-3.png")', backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat' }}>
      <LyricsCanvas layout="authoring" authoring={source} scope={scope} textStyle={style} timerSignal={clock}
        lineHoldMs={100} targetFps={30} ariaLabel="Karaoke lyrics preview" className="relative block h-full w-full" style={{fontFamily:'var(--font-lyrics)'}}/>
    </div>{playerControls}
  </div>;
}
