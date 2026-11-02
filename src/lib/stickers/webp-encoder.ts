/** Safari can return PNG for a WebP toBlob request. Load the WASM worker only
 * when native WebP encoding is unavailable; ordinary playback never loads it. */
export function createStaticWebpEncoder(signal?: AbortSignal) {
  let nativeWebp: boolean | undefined;
  let worker: Worker | undefined;
  const check = () => {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  };
  return {
    async encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
      check();
      if (nativeWebp !== false) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
        check();
        nativeWebp = blob?.type === "image/webp";
        if (nativeWebp && blob) return blob;
      }
      const context = canvas.getContext("2d");
      if (!context) throw new Error("image-optimize-failed");
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      worker ??= new Worker(new URL("./webp-encoder.worker.ts", import.meta.url), { type: "module" });
      const encoder = worker;
      return new Promise<Blob>((resolve, reject) => {
        const finish = (blob?: Blob, error?: unknown) => {
          clearTimeout(timeout);
          signal?.removeEventListener("abort", cancel);
          encoder.onmessage = null;
          encoder.onerror = null;
          if (blob) resolve(blob); else reject(error ?? new Error("image-optimize-failed"));
        };
        const cancel = () => {
          encoder.terminate();
          finish(undefined, new DOMException("Aborted", "AbortError"));
        };
        const timeout = setTimeout(() => {
          encoder.terminate();
          finish(undefined, new Error("image-optimize-failed"));
        }, 30_000);
        signal?.addEventListener("abort", cancel, { once: true });
        encoder.onerror = () => finish();
        encoder.onmessage = (event: MessageEvent<{ bytes?: ArrayBuffer; error?: string }>) => {
          if (event.data.bytes) finish(new Blob([event.data.bytes], { type: "image/webp" }));
          else finish();
        };
        try {
          encoder.postMessage({ pixels, width: canvas.width, height: canvas.height, quality }, [pixels.buffer]);
        } catch (error) { finish(undefined, error); }
      });
    },
    dispose() { worker?.terminate(); worker = undefined; },
  };
}
