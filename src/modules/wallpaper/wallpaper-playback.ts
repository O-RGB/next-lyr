/** Wallpaper transport deliberately ignores the selected lyric line. */
export function createWallpaperPlayback(adapter:{
 isPlaying:()=>boolean; pause:()=>void; play:()=>void;
 seek:(ms:number)=>Promise<void>; preview:(ms:number|null)=>void; error:(error:unknown)=>void;
},delay=90){
 let disposed=false,timer:ReturnType<typeof setTimeout>|null=null,running:Promise<void>|null=null;
 let pending:number|null=null,position:number|null=null,resume=false;
 const cancelTimer=()=>{if(timer)clearTimeout(timer);timer=null;};
 const flush=():Promise<void>=>{
  cancelTimer();if(running)return running;if(pending===null)return Promise.resolve();
  running=(async()=>{try{
   while(!disposed&&pending!==null){const target=pending;pending=null;await adapter.seek(target);}
   if(disposed)return;
   if(resume){resume=false;position=null;adapter.play();adapter.preview(null);}
  }catch(error){resume=false;if(!disposed)adapter.error(error);}finally{running=null;}})();
  return running;
 };
 return {
  activate(){disposed=false;},
  seek(ms:number){if(disposed)return;if(!timer&&!running&&pending===null)resume=adapter.isPlaying();
   adapter.pause();position=ms;pending=ms;adapter.preview(ms);cancelTimer();timer=setTimeout(()=>{timer=null;void flush();},delay);
  },
  toggle(){if(disposed)return;
   if(adapter.isPlaying()){resume=false;adapter.pause();return;}
   resume=true;
   if(position!==null)pending=position;
   if(pending!==null||running||timer){void flush();return;}
   resume=false;adapter.play();adapter.preview(null);
  },
  dispose(){disposed=true;resume=false;pending=null;cancelTimer();},
 };
}
