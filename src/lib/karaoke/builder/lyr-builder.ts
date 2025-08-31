import iconv from "iconv-lite";

export function encodeCP874(str: string): Uint8Array {
  const buf = iconv.encode(str, "cp874");
  return new Uint8Array(buf);
}

export interface ILyricsBuilder {
  name: string;
  artist: string;
  key: string;
  lyrics: string[];
}

export class LyrBuilder {
  private values: ILyricsBuilder;
  constructor(values: ILyricsBuilder) {
    this.values = values;
  }

  public getFileContent(): Uint8Array {
    return encodeCP874(
      [
        this.values.name,
        this.values.artist,
        this.values.key,
        "",
        ...this.values.lyrics,
      ].join("\r\n")
    );
  }

  public downloadFile(filename: string): void {
    const content = this.getFileContent();
    const blob = new Blob([content as BlobPart], {
      type: "application/octet-stream",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
