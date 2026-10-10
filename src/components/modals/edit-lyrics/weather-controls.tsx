"use client";
import { WEATHER_CHOICES, type WeatherStyle } from "@/lib/block-effects/types";
import type { LyricCellDraft } from "@/lib/karaoke/inline-content";
import { useSettingsStore } from "@/features/settings/settings-store";
import { text } from "@/features/settings/locale";
export function WeatherControls({targets,onChange}:{targets:LyricCellDraft[];onChange:(style:WeatherStyle)=>void}) {
  const locale=useSettingsStore(state=>state.uiLocale);
  const type=targets[0]?.effect?.type;
  const choices=type&&targets.every(cell=>cell.effect?.type===type)?WEATHER_CHOICES[type]:undefined;
  if(!choices)return null;
  const styles=new Set(targets.map(cell=>cell.effect?.variant??'plain'));
  const value=styles.size===1?[...styles][0]:'mixed';
  return <select data-effect-variant-control value={value} onChange={event=>onChange(event.target.value as WeatherStyle)}
    aria-label={text(locale,type==='rain'?'รูปแบบฝน':'รูปแบบท้องฟ้า',type==='rain'?'Rain style':'Sky style')}
    className="h-9 max-w-full rounded-md border border-line bg-base px-2">
    {value==='mixed'&&<option value="mixed" disabled>{text(locale,'หลายรูปแบบ','Mixed styles')}</option>}
    {choices.map(choice=><option key={choice.value} value={choice.value}>{text(locale,...choice.label)}</option>)}
  </select>;
}
