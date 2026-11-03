/** Coalesce gestures and serialize writes so older snapshots cannot win. */
export function createWallpaperAutosave<T>(write:(value:T)=>Promise<void>,report:(state:'saving'|'saved'|'error',error?:unknown)=>void,delay=350){
 let pending:{value:T}|null=null,running:Promise<void>|null=null,timer:ReturnType<typeof setTimeout>|null=null;
 const clear=()=>{if(timer)clearTimeout(timer);timer=null;};
 const flush=():Promise<void>=>{
  clear();if(running)return running.then(()=>pending?flush():undefined);
  if(!pending)return Promise.resolve();
  running=(async()=>{report('saving');while(pending){const next=pending;pending=null;try{await write(next.value);}catch(error){if(!pending)pending=next;report('error',error);throw error;}}report('saved');})();
  return running.finally(()=>{running=null;});
 };
 return {schedule(value:T){pending={value};report('saving');clear();timer=setTimeout(()=>{timer=null;void flush().catch(()=>{});},delay);},flush};
}
