import {embedMidiWallpaper,readMidiWallpaper} from 'scenio/midi';
import {emptyDocument,type ScenioDocument} from 'scenio/core';
import {db} from '@/lib/database/db';
export function exportMidiWallpaper(midi:Blob,document?:ScenioDocument){
 return embedMidiWallpaper(midi,document??emptyDocument(),async id=>(await db.wallpaperAssets.get(id))?.blob);
}
/** Import a standalone MIDI into a new Studio project, retaining portable wallpaper. */
export async function importMidiWallpaper(midi:Blob){
 try{const bundle=await readMidiWallpaper(midi);if(!bundle)return;
  await db.wallpaperAssets.bulkPut(bundle.document.assets.map(asset=>({id:asset.id,asset,name:`wallpaper-${asset.id.slice(0,8)}.webp`,blob:bundle.entries.find(e=>e.name===`scenio-${asset.id}.webp`)!.blob,createdAt:new Date()})));
  return bundle.document;
 }catch(error){console.warn('Skipping invalid MIDI wallpaper:',error instanceof Error?error.message:String(error));}
}
