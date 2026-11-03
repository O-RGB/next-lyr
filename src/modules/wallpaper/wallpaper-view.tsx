"use client";
import {useSettingsStore} from '@/features/settings/settings-store';
import {ScenioView} from 'scenio/react';
import {useKaraokeStore} from '@/stores/karaoke-store';
import {songWallpaperClock} from './clock';
import {resolveWallpaperAsset} from './storage';
const report=(error:Error)=>console.warn('Scenio:',error.message);
export function SongWallpaper(){const targetFps=useSettingsStore(s=>s.targetFps);const document=useKaraokeStore(s=>s.wallpaper);if(!document?.scenes.length)return null;
 return <ScenioView targetFps={targetFps} document={document} clock={songWallpaperClock} resolveAsset={resolveWallpaperAsset} onError={report} style={{position:'absolute',inset:0}}/>;
}
