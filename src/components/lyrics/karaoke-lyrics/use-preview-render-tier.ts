"use client";
import {useEffect,useState} from 'react';
/** Keep the canvas pixel budget small on touch devices, without changing FPS. */
export function usePreviewRenderTier(){
 const [tier,setTier]=useState<'low'|'medium'|'high'>('medium');
 useEffect(()=>{const touch=window.matchMedia('(pointer:coarse)');
  const update=()=>{const memory=(navigator as Navigator&{deviceMemory?:number}).deviceMemory;
   const small=(memory!==undefined&&memory<=4)||(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4);
   setTier(small?'low':touch.matches?'medium':'high');
  };
  update();touch.addEventListener?.('change',update);return()=>touch.removeEventListener?.('change',update);
 },[]);return tier;
}
