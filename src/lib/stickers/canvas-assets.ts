import { getStickerBlob } from "../database/db";
import { gifFrameAtTime } from "./gif-compositor";
import type { LyricSticker } from "./types";

export interface CanvasAsset {
  source?: CanvasImageSource;
  width: number; height: number; delays: number[]; loops: number; version: number;
  frame: number; startedAt: number; pending: boolean; failed: boolean;
  request(time: number, reduced: boolean): void;
}
interface Entry extends CanvasAsset {
  id: string; references: number; listeners: Set<() => void>; disposed: boolean;
  close?: () => void;
}
const cache = new Map<string, Entry>();
let worker: Worker | undefined;
let nextId = 0;
const gifEntries = new Map<string, Entry>();
function notify(entry: Entry) { for (const listener of entry.listeners) listener(); }
function fail(entry: Entry, error: unknown) {
  if (entry.disposed) return;
  entry.failed = true; entry.pending = false;
  console.error("Could not decode lyric image", error); notify(entry);
}
function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./gif.worker.ts", import.meta.url));
  worker.onmessage = event => {
    const message = event.data, entry = gifEntries.get(message.id);
    if (!entry || entry.disposed) { message.bitmap?.close(); return; }
    if (message.kind === "ready") { entry.delays = message.delays; entry.loops = message.loops; return; }
    if (message.kind === "error") { fail(entry, message.message); return; }
    if (message.kind === "frame") {
      let source: CanvasImageSource = message.bitmap;
      if (!source) {
        const canvas = document.createElement("canvas"); canvas.width = message.width; canvas.height = message.height;
        const context = canvas.getContext("2d");
        if (!context) { fail(entry, "image-context-unavailable"); return; }
        context.putImageData(new ImageData(new Uint8ClampedArray(message.pixels), message.width, message.height), 0, 0);
        source = canvas;
      }
      entry.close?.(); entry.source = source;
      entry.close = message.bitmap ? () => message.bitmap.close() : undefined;
      entry.width = message.bitmap?.width ?? message.width; entry.height = message.bitmap?.height ?? message.height;
      entry.frame = message.index; entry.pending = false; entry.version++;
      if (!entry.startedAt) entry.startedAt = performance.now();
      notify(entry);
    }
  };
  worker.onerror = error => { for (const entry of gifEntries.values()) fail(entry, error.message); };
  return worker;
}
async function load(entry: Entry, projectId: string, sticker: LyricSticker) {
  const blob = await getStickerBlob(projectId, sticker.id);
  if (!blob) throw new Error("missing-sticker");
  if (entry.disposed) return;
  if (blob.type === "image/gif" || sticker.mime === "image/gif") {
    const buffer = await blob.arrayBuffer(); if (entry.disposed) return;
    gifEntries.set(entry.id, entry); entry.pending = true;
    getWorker().postMessage({ kind: "load", id: entry.id, buffer }, [buffer]);
  } else {
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(blob);
        if (entry.disposed) { bitmap.close(); return; }
        entry.source = bitmap; entry.width = bitmap.width; entry.height = bitmap.height; entry.close = () => bitmap.close();
      } catch { /* Some browsers expose ImageBitmap but cannot decode every supported image format. */ }
    }
    if (!entry.source) {
      // Decode-only fallback: this image is never attached to the DOM.
      const url = URL.createObjectURL(blob), image = new Image();
      try {
        await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("invalid-image")); image.src = url; });
        if (entry.disposed) return;
        entry.source = image; entry.width = image.naturalWidth; entry.height = image.naturalHeight;
      } finally { URL.revokeObjectURL(url); }
    }
    entry.version++; notify(entry);
  }
}

/** One decoder/current frame per file, shared by every visible occurrence and canvas. */
export function acquireCanvasAsset(projectId: string, sticker: LyricSticker, onChange: () => void) {
  const key = `${projectId}:${sticker.id}`;
  let entry = cache.get(key);
  if (!entry) {
    entry = { id: `image-${++nextId}`, references: 0, listeners: new Set(), disposed: false,
      width: sticker.width, height: sticker.height, delays: [], loops: Infinity, version: 0, frame: -1,
      startedAt: 0, pending: false, failed: false,
      request(time, reduced) {
        if (this.pending || this.failed || this.disposed || !this.delays.length) return;
        const index = gifFrameAtTime(this.delays, time - this.startedAt, reduced, this.loops);
        if (index === this.frame) return;
        this.pending = true; getWorker().postMessage({ kind: "frame", id: this.id, index });
      },
    };
    cache.set(key, entry); void load(entry, projectId, sticker).catch(error => fail(entry!, error));
  }
  const current = entry;
  current.references++; current.listeners.add(onChange);
  let released = false;
  return { asset: current as CanvasAsset, release() {
    if (released) return; released = true;
    current.listeners.delete(onChange);
    if (--current.references) return;
    current.disposed = true; current.close?.(); current.source = undefined; cache.delete(key);
    if (gifEntries.delete(current.id)) worker?.postMessage({ kind: "release", id: current.id });
    if (!gifEntries.size) { worker?.terminate(); worker = undefined; }
  } };
}
