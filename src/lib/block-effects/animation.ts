/** Only presentation opacity changes. Artwork animation is a discrete image sequence. */
export const EFFECT_ANIMATION_CSS = '.lyric-frame-run{opacity:calc(.82 + var(--effect-power,0)*.15);transition:opacity .15s}';
export function ensureEffectStyles() {
  const id = 'lyric-frame-styles'; if (document.getElementById(id)) return;
  const style = document.createElement('style');style.id=id;style.textContent=EFFECT_ANIMATION_CSS;document.head.append(style);
}
const painters = new Set<(time: number, reduced: boolean) => void>();
let frame: number | null = null, media: MediaQueryList | null = null;
function paint(time: number) {
  frame=null;for(const painter of painters)painter(time,media?.matches??false);
  if(painters.size && !media?.matches)frame=requestAnimationFrame(paint);
}
export function subscribeFramePainter(painter: (time: number, reduced: boolean) => void) {
  if(!media){media=window.matchMedia('(prefers-reduced-motion: reduce)');media.addEventListener('change',()=>{
    if(frame!==null){cancelAnimationFrame(frame);frame=null;}paint(performance.now());
  });}
  painters.add(painter);painter(performance.now(),media.matches);
  if(frame===null && !media.matches)frame=requestAnimationFrame(paint);
  return ()=>{painters.delete(painter);if(!painters.size && frame!==null){cancelAnimationFrame(frame);frame=null;}};
}
export function refreshFramePainter(painter: (time: number, reduced: boolean) => void) { painter(performance.now(),media?.matches??false); }
