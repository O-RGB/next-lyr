"use client";
import {useEffect,useRef,useState} from 'react';
import {db} from '@/lib/database/db';
import {createWallpaperThumbnail} from './thumbnail';
export function ImageThumb({id,className='h-full w-full object-cover'}:{id:string;className?:string}){
 const host=useRef<HTMLSpanElement>(null),[url,setUrl]=useState('');
 useEffect(()=>{
  let request:AbortController|undefined,source='';
  const clear=()=>{request?.abort();request=undefined;if(source)URL.revokeObjectURL(source);source='';setUrl('');};
  const load=()=>{if(request)return;request=new AbortController();const signal=request.signal;
   void createWallpaperThumbnail(async()=>(await db.wallpaperAssets.get(id))?.blob,signal).then(blob=>{if(!blob||signal.aborted)return;source=URL.createObjectURL(blob);setUrl(source);}).catch(()=>{});
  };
  const observer=typeof IntersectionObserver==='undefined'?undefined:new IntersectionObserver(entries=>{if(entries[0]?.isIntersecting)load();else clear();},{rootMargin:'80px'});
  if(observer&&host.current)observer.observe(host.current);else load();
  return()=>{observer?.disconnect();request?.abort();if(source)URL.revokeObjectURL(source);};
 },[id]);
 return <span ref={host} className={`${className} block overflow-hidden bg-panel-2`}>
  {/* IndexedDB/object URLs bypass the Next image optimizer. */}
  {/* eslint-disable-next-line @next/next/no-img-element */}
  {url&&<img src={url} alt="" draggable={false} decoding="async" className={className}/>}
 </span>;
}
