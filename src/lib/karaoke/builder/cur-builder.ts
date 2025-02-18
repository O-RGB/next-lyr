export class CurBuilder {
  private values: number[];

  constructor(values: number[]) {
    this.values = values;
  }

  public getFileContent(): Uint8Array {
    const buffer = new Uint8Array(this.values.length * 2 + 1);
    let offset = 0;

    for (const value of this.values) {
      buffer[offset] = value & 0xff;
      buffer[offset + 1] = (value >> 8) & 0xff;
      offset += 2;
    }

    buffer[offset] = 0xff;
    return buffer;
  }

  public downloadFile(filename: string): void {
    const content = this.getFileContent();
    const blob = new Blob([content], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
