import { fitStickerDimensions, inspectStickerImage } from "./image-info";
import { MAX_GIF_STICKER_BYTES, MAX_STATIC_STICKER_BYTES, MAX_STICKER_INPUT_BYTES } from "./types";

const aborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
};

async function decodeImage(blob: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("invalid-image"));
      image.src = url;
    });
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => {} };
  } finally { URL.revokeObjectURL(url); }
}

async function optimizeGif(buffer: ArrayBuffer, maximum: number, colors: number, lossy: number, signal?: AbortSignal): Promise<Blob> {
  const moduleUrl = "/vendor/gifsicle/gifsicle.min.js";
  const { default: engine } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ moduleUrl);
  aborted(signal);
  return new Promise((resolve, reject) => {
    const worker = new Worker(engine.tool.worker());
    const finish = (result?: Blob, error?: unknown) => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", cancel);
      worker.terminate();
      if (result) resolve(result); else reject(error ?? new Error("gif-optimize-failed"));
    };
    const cancel = () => finish(undefined, new DOMException("Aborted", "AbortError"));
    const timeout = setTimeout(() => finish(undefined, new Error("gif-optimize-failed")), 20_000);
    signal?.addEventListener("abort", cancel, { once: true });
    worker.onerror = () => finish(undefined, new Error("gif-optimize-failed"));
    worker.onmessage = (event) => {
      const output = Array.isArray(event.data) ? event.data.find((file: { name: string }) => file.name.endsWith(".gif")) : null;
      finish(output?.file ? new Blob([output.file], { type: "image/gif" }) : undefined);
    };
    worker.postMessage({
      data: [{ name: "input.gif", file: buffer }], folder: [], isStrict: false,
      command: [`-O2 --resize-fit ${maximum}x${maximum} --colors ${colors} ${lossy ? `--lossy=${lossy}` : ""} input.gif -o /out/sticker.gif`],
    });
  });
}

export async function optimizeSticker(file: File, signal?: AbortSignal) {
  if (!file.size) throw new Error("invalid-image");
  if (file.size > MAX_STICKER_INPUT_BYTES) throw new Error("file-too-large");
  const buffer = await file.arrayBuffer();
  aborted(signal);
  const original = inspectStickerImage(new Uint8Array(buffer));
  let blob: Blob | null = null;
  let width = original.width, height = original.height;
  if (original.mime === "image/gif") {
    for (const [maximum, colors, lossy] of [[256, 128, 0], [192, 96, 30], [128, 64, 40]]) {
      aborted(signal);
      const candidate = await optimizeGif(buffer, maximum, colors, lossy, signal);
      const info = inspectStickerImage(new Uint8Array(await candidate.arrayBuffer()));
      if (original.frames > 1 && info.frames < 2) throw new Error("gif-optimize-failed");
      if (!blob || candidate.size < blob.size) { blob = candidate; width = info.width; height = info.height; }
      if (blob.size <= MAX_GIF_STICKER_BYTES) break;
    }
    if (Math.max(original.width, original.height) <= 256 && file.size <= (blob?.size ?? Infinity)) {
      blob = new Blob([buffer], { type: original.mime }); width = original.width; height = original.height;
    }
    if (!blob || blob.size > MAX_GIF_STICKER_BYTES) throw new Error("optimized-image-too-large");
  } else {
    const bitmap = await decodeImage(new Blob([buffer], { type: original.mime }));
    try {
      for (const maximum of [256, 192, 128]) {
        const size = fitStickerDimensions(bitmap.width, bitmap.height, maximum);
        const canvas = document.createElement("canvas");
        canvas.width = size.width; canvas.height = size.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("image-optimize-failed");
        context.drawImage(bitmap.source, 0, 0, size.width, size.height);
        const candidate = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
        aborted(signal);
        if (!candidate) throw new Error("image-optimize-failed");
        blob = candidate; width = size.width; height = size.height;
        if (blob.size <= MAX_STATIC_STICKER_BYTES) break;
      }
      if (Math.max(bitmap.width, bitmap.height) <= 256 && file.size <= (blob?.size ?? Infinity)) {
        blob = new Blob([buffer], { type: original.mime }); width = bitmap.width; height = bitmap.height;
      }
    } finally { bitmap.close(); }
    if (!blob || blob.size > MAX_STATIC_STICKER_BYTES) throw new Error("optimized-image-too-large");
  }
  aborted(signal);
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  const id = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  return { blob, sticker: { id, name: file.name, mime: blob.type, width, height,
    bytes: blob.size, originalBytes: file.size, position: "before" as const } };
}
