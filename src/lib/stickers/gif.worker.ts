import { GifCompositor, type GifPatch } from "./gif-compositor";
import { inspectStickerImage } from "./image-info";

interface RawFrame { image?: unknown; gce?: { delay: number; extras: { transparentColorGiven: boolean } }; application?: { id: string; blocks: Uint8Array } }
interface ParsedGif { frames: RawFrame[]; gct: number[][]; lsd: { width: number; height: number; backgroundColorIndex: number } }
interface GifDecoder { parseGIF(data: ArrayBuffer): ParsedGif; decompressFrame(frame: RawFrame, table: number[][], patch: true): GifPatch }
interface Session { gif: ParsedGif; frames: RawFrame[]; screen: GifCompositor; index: number; canvas?: OffscreenCanvas }
const sessions = new Map<string, Session>();
const endpoint = self as unknown as { onmessage: (event: MessageEvent) => void; postMessage: (message: unknown, transfer?: Transferable[]) => void };
let decoder: Promise<GifDecoder> | undefined;
function getDecoder() {
  const url = "/vendor/gifuct/gifuct-js.mjs";
  return decoder ??= import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url) as Promise<GifDecoder>;
}
async function sendFrame(id: string, index: number) {
  const session = sessions.get(id); if (!session) return;
  const library = await getDecoder();
  if (index <= session.index) { session.screen.reset(); session.index = -1; }
  while (session.index < index) session.screen.draw(library.decompressFrame(session.frames[++session.index], session.gif.gct, true));
  const { width, height, pixels } = session.screen;
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = session.canvas ??= new OffscreenCanvas(width, height), context = canvas.getContext("2d");
    if (!context) throw new Error("gif-context-unavailable");
    context.putImageData(new ImageData(new Uint8ClampedArray(pixels.buffer as ArrayBuffer), width, height), 0, 0);
    const bitmap = canvas.transferToImageBitmap();
    endpoint.postMessage({ kind: "frame", id, index, bitmap }, [bitmap]);
  } else {
    const copy = pixels.slice();
    endpoint.postMessage({ kind: "frame", id, index, width, height, pixels: copy.buffer }, [copy.buffer]);
  }
}
// Serialize decode requests, including messages that arrive during the dynamic import.
let queue = Promise.resolve();
endpoint.onmessage = event => {
  queue = queue.then(async () => {
    const message = event.data;
    if (message.kind === "release") { sessions.delete(message.id); return; }
    if (message.kind === "load") {
      const bytes = new Uint8Array(message.buffer);
      const info = inspectStickerImage(bytes);
      if (info.mime !== "image/gif") throw new Error("invalid-gif");
      const library = await getDecoder(), gif = library.parseGIF(message.buffer);
      const frames = gif.frames.filter(frame => frame.image);
      if (frames.length !== info.frames) throw new Error("invalid-gif");
      const background = frames[0].gce?.extras.transparentColorGiven ? [0, 0, 0, 0]
        : [...(gif.gct?.[gif.lsd.backgroundColorIndex] ?? [0, 0, 0]), gif.gct ? 255 : 0];
      const application = gif.frames.find(frame => /^(NETSCAPE2\.0|ANIMEXTS1\.0)$/.test(frame.application?.id ?? ""))?.application;
      const repetitions = application && application.blocks[0] === 1 ? application.blocks[1] + (application.blocks[2] << 8) : undefined;
      sessions.set(message.id, { gif, frames, screen: new GifCompositor(info.width, info.height, background), index: -1 });
      endpoint.postMessage({ kind: "ready", id: message.id,
        loops: repetitions === 0 ? Infinity : (repetitions ?? 0) + 1,
        delays: frames.map(frame => (frame.gce?.delay ?? 0) < 2 ? 100 : frame.gce!.delay * 10) });
      await sendFrame(message.id, 0);
    } else if (message.kind === "frame") await sendFrame(message.id, message.index);
  }).catch(error => endpoint.postMessage({ kind: "error", id: event.data.id, message: String(error) }));
};
