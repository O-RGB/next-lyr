import encode from "@jsquash/webp/encode.js";

self.onmessage = async (event: MessageEvent<{ pixels: Uint8ClampedArray<ArrayBuffer>; width: number; height: number; quality: number }>) => {
  try {
    const { pixels, width, height, quality } = event.data;
    const bytes = await encode(new ImageData(pixels, width, height), {
      quality: quality * 100,
      alpha_quality: 100,
      method: 4,
    });
    self.postMessage({ bytes }, { transfer: [bytes] });
  } catch {
    self.postMessage({ error: "image-optimize-failed" });
  }
};
