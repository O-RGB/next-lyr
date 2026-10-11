"use client";
import {useMemo} from 'react';
import {LyricsCanvas} from '@next-karaoke/lyrics/react';
import type {LyricCellDraft} from '@/lib/karaoke/inline-content';
import {useSettingsStore} from '@/features/settings/settings-store';
import {text} from '@/features/settings/locale';
import '@/lib/lyrics-runtime';
const textStyle={fontSize:30};
export function LyricDraftPreview({cells,projectId}:{cells:LyricCellDraft[];projectId:string|null}){
  const locale=useSettingsStore(state=>state.uiLocale);
  const blocks=useMemo(()=>cells.map((cell,index)=>({text:cell.text||'…',vocal:cell.vocal,kind:cell.kind,sticker:cell.sticker,effect:cell.effect,index,lineIndex:0,at:1})),[cells]);
  return <LyricsCanvas layout="inline" blocks={blocks} scope={projectId} textStyle={textStyle} inlineBaseline={55}
    ariaLabel={`${text(locale,'ตัวอย่างเนื้อร้อง','Lyric preview')}: ${cells.map(cell=>cell.kind==='image'?cell.sticker?.name??'':cell.text).join(' ')}`}
    className="h-[92px] w-full rounded-lg bg-base" style={{height:92,fontFamily:'var(--font-lyrics)'}}/>;
}
