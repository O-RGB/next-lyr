import { usedEffectAtlasRoles } from "./catalog";
import type { BlockEffect, PlaybackFrameAtlas } from "./types";
export const atlasBindingKey=(atlas:Pick<PlaybackFrameAtlas,'type'|'role'>)=>`${atlas.type}:${atlas.role??'edge'}`;
export function materializeAtlasPayloads(atlases:PlaybackFrameAtlas[],strict=false) {
  const payloads=new Map<string,string>();
  for(const atlas of atlases)if(atlas.base64){
    if(strict&&payloads.has(atlas.id)&&payloads.get(atlas.id)!==atlas.base64)throw new Error('conflicting-frame-atlas');
    payloads.set(atlas.id,atlas.base64);
  }
  return atlases.map(atlas=>{
    const base64=atlas.base64||payloads.get(atlas.id);
    if(strict&&!base64)throw new Error('missing-frame-atlas');
    return base64?{...atlas,base64}:atlas;
  });
}
/** Keep role bindings, but store the shared binary only on its first occurrence. */
export function deduplicateAtlasPayloads(atlases:PlaybackFrameAtlas[]) {
  const written=new Set<string>();
  return materializeAtlasPayloads(atlases,true).map(atlas=>{
    if(!written.has(atlas.id)){written.add(atlas.id);return atlas;}
    return {...atlas,base64:''};
  });
}
export function selectPlaybackAtlases(lines:readonly(readonly{effect?:BlockEffect}[])[],atlases:PlaybackFrameAtlas[]) {
  const needed=usedEffectAtlasRoles(lines),keys=new Set(needed.map(atlasBindingKey));
  const selected=new Map(atlases.filter(atlas=>keys.has(atlasBindingKey(atlas))).map(atlas=>[atlasBindingKey(atlas),atlas]));
  if(needed.some(use=>!selected.has(atlasBindingKey(use))))throw new Error('missing-frame-atlas');
  // A required alias may point to a binary carried by a different, unused binding.
  const hydrated=materializeAtlasPayloads(atlases);
  const byKey=new Map(hydrated.map(atlas=>[atlasBindingKey(atlas),atlas]));
  return deduplicateAtlasPayloads(needed.map(use=>byKey.get(atlasBindingKey(use))!));
}
