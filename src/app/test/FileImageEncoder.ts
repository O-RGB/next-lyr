export class FileImageCodec {
  static encodeFileToImage(file: File): Promise<{
    canvas: HTMLCanvasElement;
    filename: string;
    originalBytes: Uint8Array;
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          const filename = file.name;

          const filenameBytes = new TextEncoder().encode(filename);
          const filenameLength = filenameBytes.length;

          const finalData = new Uint8Array(
            4 + filenameLength + 4 + bytes.length
          );

          new DataView(finalData.buffer).setUint32(0, filenameLength, true);

          finalData.set(filenameBytes, 4);

          new DataView(finalData.buffer).setUint32(
            4 + filenameLength,
            bytes.length,
            true
          );

          finalData.set(bytes, 4 + filenameLength + 4);

          const pixelsNeeded = Math.ceil(finalData.length / 3);
          const canvasSize = Math.ceil(Math.sqrt(pixelsNeeded));

          const canvas = document.createElement("canvas");
          canvas.width = canvasSize;
          canvas.height = canvasSize;
          const ctx = canvas.getContext("2d")!;

          const imageData = ctx.createImageData(canvasSize, canvasSize);

          for (let i = 0; i < finalData.length; i++) {
            const pixelIndex = Math.floor(i / 3);
            const channelIndex = i % 3;
            imageData.data[pixelIndex * 4 + channelIndex] = finalData[i];
          }

          for (let i = 3; i < imageData.data.length; i += 4) {
            imageData.data[i] = 255;
          }

          ctx.putImageData(imageData, 0, 0);
          resolve({ canvas, filename, originalBytes: bytes });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  static decodeImageToFile(
    canvas: HTMLCanvasElement
  ): Promise<{ blob: Blob; filename: string; size: number }> {
    return new Promise((resolve, reject) => {
      try {
        const ctx = canvas.getContext("2d")!;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const rgbData = new Uint8Array(canvas.width * canvas.height * 3);
        for (let i = 0; i < canvas.width * canvas.height; i++) {
          rgbData[i * 3] = imageData.data[i * 4];
          rgbData[i * 3 + 1] = imageData.data[i * 4 + 1];
          rgbData[i * 3 + 2] = imageData.data[i * 4 + 2];
        }

        const filenameLength = new DataView(rgbData.buffer).getUint32(0, true);

        const filenameBytes = rgbData.slice(4, 4 + filenameLength);
        const filename = new TextDecoder().decode(filenameBytes);

        const fileSizeStart = 4 + filenameLength;
        const fileSize = new DataView(rgbData.buffer).getUint32(
          fileSizeStart,
          true
        );

        const fileDataStart = fileSizeStart + 4;
        const actualFileData = rgbData.slice(
          fileDataStart,
          fileDataStart + fileSize
        );

        const blob = new Blob([actualFileData]);

        resolve({ blob, filename, size: fileSize });
      } catch (error) {
        reject(error);
      }
    });
  }

  static loadImageFromFile(file: File): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  static downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    }, "image/png");
  }

  static downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
