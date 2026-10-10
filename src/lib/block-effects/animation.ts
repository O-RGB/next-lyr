/** Live and standalone canvases use the same opacity; animation is a discrete image sequence. */
export const EFFECT_ANIMATION_CSS = '.lyric-frame-run{opacity:1}';
export function ensureEffectStyles() {
  const id = 'lyric-frame-styles',existing=document.getElementById(id);
  if(existing){if(existing.textContent!==EFFECT_ANIMATION_CSS)existing.textContent=EFFECT_ANIMATION_CSS;return;}
  const style = document.createElement('style');style.id=id;style.textContent=EFFECT_ANIMATION_CSS;document.head.append(style);
}
const painters = new Set<(time: number, reduced: boolean) => void>();
let frame: number | null = null, media: MediaQueryList | null = null;
function paint(time: number) {
  frame=null;if(document.hidden)return;
  for(const painter of painters)painter(time,media?.matches??false);
  if(painters.size && !media?.matches)frame=requestAnimationFrame(paint);
}
export function subscribeFramePainter(painter: (time: number, reduced: boolean) => void) {
  if(!media){media=window.matchMedia('(prefers-reduced-motion: reduce)');const restart=()=>{
    if(frame!==null){cancelAnimationFrame(frame);frame=null;}paint(performance.now());
  };media.addEventListener('change',restart);document.addEventListener('visibilitychange',restart);}
  painters.add(painter);painter(performance.now(),media.matches);
  if(frame===null && !media.matches && !document.hidden)frame=requestAnimationFrame(paint);
  return ()=>{painters.delete(painter);if(!painters.size && frame!==null){cancelAnimationFrame(frame);frame=null;}};
}
export function refreshFramePainter(painter: (time: number, reduced: boolean) => void) { painter(performance.now(),media?.matches??false); }
