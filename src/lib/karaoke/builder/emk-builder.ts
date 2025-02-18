import pako from "pako";
import iconv from "iconv-lite";

export const readFileAsUint8Array = (file: File): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error("เกิดข้อผิดพลาดในการอ่านไฟล์"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });

export function hexStringToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16); // ใช้ slice() แทน substr()
  }
  return arr;
}

export function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  arrays.forEach((arr) => {
    result.set(arr, offset);
    offset += arr.length;
  });
  return result;
}

export function uint32ToBytesLE(num: number): Uint8Array {
  const arr = new Uint8Array(4);
  const view = new DataView(arr.buffer);
  view.setUint32(0, num, true);
  return arr;
}

export function encodeCP874(str: string): Uint8Array {
  const buf = iconv.encode(str, "cp874");
  return new Uint8Array(buf);
}

export function decodeCP874(bytes: Uint8Array): string {
  const buf = Buffer.from(bytes);
  return iconv.decode(buf, "cp874");
}

interface Section {
  tag: string;
  rawData: Uint8Array;
  compressed: Uint8Array;
  uncompressedSize: number;
}

export class EMKBuilder {
  private xorKey: Uint8Array;
  private magic: Uint8Array;
  private sfdsMagic: Uint8Array;
  private sections: Section[];

  constructor() {
    this.xorKey = hexStringToUint8Array("AFF24C9CE9EA9943");
    this.magic = hexStringToUint8Array("2e53464453");
    this.sfdsMagic = hexStringToUint8Array("53464453");
    this.sections = [];
    this.validateXORKey();
  }

  private validateXORKey() {
    if (this.xorKey.length !== 8) {
      throw new Error("XOR Key must be exactly 8 bytes");
    }
  }

  addSection(tag: string, data: string | Uint8Array) {
    let rawData: Uint8Array;

    if (tag === "LYRIC_DATA") {
      rawData =
        typeof data === "string"
          ? encodeCP874(data)
          : encodeCP874(decodeCP874(data));
    } else {
      rawData =
        typeof data === "string" ? encodeCP874(data) : new Uint8Array(data);
    }

    const compressed = pako.deflate(rawData, {
      level: 9,
      windowBits: 15,
      memLevel: 9,
      strategy: 0,
    });

    this.sections.push({
      tag,
      rawData,
      compressed,
      uncompressedSize: rawData.length,
    });
  }

  build(): Uint8Array {
    let currentPos = 42;
    const sectionOffsets: Array<[number, number]> = [];
    const mainDataParts: Uint8Array[] = [];

    for (const section of this.sections) {
      const start = currentPos;
      mainDataParts.push(section.compressed);
      currentPos += section.compressed.length;
      sectionOffsets.push([start, currentPos]);
    }

    const mainData = concatUint8Arrays(mainDataParts);
    const headerParts: Uint8Array[] = [];

    for (let i = 0; i < this.sections.length; i++) {
      const section = this.sections[i];

      headerParts.push(this.sfdsMagic);
      headerParts.push(new Uint8Array([6]));
      headerParts.push(new Uint8Array([section.tag.length]));
      headerParts.push(new TextEncoder().encode(section.tag));
      headerParts.push(new Uint8Array([4]));
      headerParts.push(uint32ToBytesLE(section.uncompressedSize));
      headerParts.push(new Uint8Array([4]));
      headerParts.push(uint32ToBytesLE(0xffffffff));
      headerParts.push(new Uint8Array([4]));
      headerParts.push(uint32ToBytesLE(sectionOffsets[i][0]));
      headerParts.push(new Uint8Array([4]));
      headerParts.push(uint32ToBytesLE(sectionOffsets[i][1]));
      headerParts.push(new Uint8Array([4]));
      headerParts.push(uint32ToBytesLE(0));
      headerParts.push(new Uint8Array([4]));
      headerParts.push(uint32ToBytesLE(0));
      headerParts.push(new Uint8Array(0x10));
      headerParts.push(new Uint8Array([4]));
      headerParts.push(uint32ToBytesLE(0));
      headerParts.push(new Uint8Array([4]));
      headerParts.push(uint32ToBytesLE(0));
    }

    const header = concatUint8Arrays(headerParts);
    const headerPos = 34 + 8 + mainData.length;
    const headerEnd = headerPos + header.length;

    const decryptedParts: Uint8Array[] = [
      this.magic,
      new Uint8Array(29),
      uint32ToBytesLE(headerPos),
      uint32ToBytesLE(headerEnd),
      mainData,
      header,
    ];

    const decryptedData = concatUint8Arrays(decryptedParts);
    const emkData = new Uint8Array(decryptedData.length);

    for (let i = 0; i < decryptedData.length; i++) {
      emkData[i] = decryptedData[i] ^ this.xorKey[i % this.xorKey.length];
    }

    return emkData;
  }
}

export function verifyEMK(emkData: Uint8Array, xorKey: Uint8Array): boolean {
  const decryptedData = new Uint8Array(emkData.length);
  for (let i = 0; i < emkData.length; i++) {
    decryptedData[i] = emkData[i] ^ xorKey[i % xorKey.length];
  }
  return decryptedData.slice(0, 5).toString() === ".SFDS";
}
