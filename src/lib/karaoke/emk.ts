import * as zlib from "zlib";

export async function parseEMKFile(
  file: File
): Promise<{ mid?: File; lyr?: File; cur?: File }> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const xorKey = new Uint8Array([
    0xaf, 0xf2, 0x4c, 0x9c, 0xe9, 0xea, 0x99, 0x43,
  ]);
  const magic = new Uint8Array([0x2e, 0x53, 0x46, 0x44, 0x53]);

  // XOR decrypt
  for (let i = 0; i < data.length; i++) {
    data[i] ^= xorKey[i % xorKey.length];
  }

  // Check magic bytes
  if (!magic.every((byte, i) => byte === data[i])) {
    throw new Error("Invalid magic");
  }

  // Read header position and end
  const headerPos = readOffset(data, 0x22);
  const headerEnd = readOffset(data, 0x2a);

  // Extract header
  const header = data.slice(headerPos, headerEnd);
  let off = 0;

  const readByte = (): number => {
    return header[off++];
  };

  const readUshort = (): number => {
    const value = header[off] | (header[off + 1] << 8);
    off += 2;
    return value;
  };

  const readUint = (): number => {
    const value =
      header[off] |
      (header[off + 1] << 8) |
      (header[off + 2] << 16) |
      (header[off + 3] << 24);
    off += 4;
    return value >>> 0; // Convert to unsigned
  };

  const readString = (): string => {
    const length = readByte();
    const str = new TextDecoder("utf-8").decode(
      header.slice(off, off + length)
    );
    off += length;
    return str;
  };

  const checkHeaderMagic = (magic: Uint8Array): void => {
    if (!magic.every((byte, i) => byte === header[off + i])) {
      throw new Error(
        `Invalid magic in header: ${Array.from(
          header.slice(off, off + magic.length)
        )
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")} != ${Array.from(magic)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")}`
      );
    }
    off += magic.length;
  };

  const readTag = (): number | string => {
    const tag = readByte();
    switch (tag) {
      case 2:
        return readByte();
      case 3:
        return readUshort();
      case 4:
        return readUint();
      case 6:
        return readString();
      default:
        throw new Error(`Unknown tag: 0x${tag.toString(16)}`);
    }
  };

  let mid: File | undefined = undefined;
  let lyr: File | undefined = undefined;
  let cur: File | undefined = undefined;

  const extractData = (): void => {
    const magic = new Uint8Array([0x53, 0x46, 0x44, 0x53]); // SFDS
    while (off < header.length) {
      checkHeaderMagic(magic);
      const tag = readTag() as string;
      const uncompressedSize = readTag() as number;
      readTag(); // unk2
      const dataBegin = readTag() as number;
      const dataEnd = readTag() as number;
      readTag(); // unk5
      readTag(); // unk6
      off += 0x10;
      readTag(); // unk7
      readTag(); // unk8

      const compressedData = data.slice(dataBegin, dataEnd);
      const rawData = zlib.inflateSync(Buffer.from(compressedData));

      if (rawData.length !== uncompressedSize) {
        throw new Error("Invalid uncompressed size");
      }

      switch (tag) {
        case "MIDI_DATA":
          mid = new File([rawData], `${file.name}.mid`, { type: "audio/midi" });
          break;
        case "LYRIC_DATA":
          lyr = new File([rawData], `${file.name}.lyr`, { type: "text/plain" });
          break;
        case "CURSOR_DATA":
          cur = new File([rawData], `${file.name}.cur`, {
            type: "application/octet-stream",
          });
          break;
      }
    }
  };

  extractData();

  return { mid, lyr, cur };
}

function readOffset(data: Uint8Array, pos: number): number {
  return new DataView(data.buffer).getUint32(pos, true);
}
