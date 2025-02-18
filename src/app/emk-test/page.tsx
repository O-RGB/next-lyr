"use client";
"use client";
import React, { useState } from "react";
import { decodeCP874, EMKBuilder, readFileAsUint8Array } from "../../lib/karaoke/emk-builder";

const EmkBuilderComponent: React.FC = () => {
  const [midiFile, setMidiFile] = useState<File | null>(null);
  const [lyricFile, setLyricFile] = useState<File | null>(null);
  const [cursorFile, setCursorFile] = useState<File | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>("");

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      setter(e.target.files[0]);
    }
  };

  const buildEmk = async () => {
    if (!midiFile || !lyricFile || !cursorFile) {
      alert("กรุณาเลือกไฟล์ให้ครบทุกไฟล์");
      return;
    }

    try {
      const midiData = await readFileAsUint8Array(midiFile);
      const lyricBuffer = await readFileAsUint8Array(lyricFile);
      const lyricText = decodeCP874(lyricBuffer);
      const cursorData = await readFileAsUint8Array(cursorFile);

      const builder = new EMKBuilder();
      builder.addSection("MIDI_DATA", midiData);
      builder.addSection("LYRIC_DATA", lyricText);
      builder.addSection("CURSOR_DATA", cursorData);
      const emkData = builder.build();

      const blob = new Blob([emkData], {
        type: "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการประมวลผลไฟล์");
    }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h1>EMK Builder</h1>
      <div>
        <label>
          MIDI File:
          <input
            type="file"
            accept=".mid"
            onChange={(e) => handleFileChange(e, setMidiFile)}
          />
        </label>
      </div>
      <div>
        <label>
          LYR File:
          <input
            type="file"
            accept=".lyr"
            onChange={(e) => handleFileChange(e, setLyricFile)}
          />
        </label>
      </div>
      <div>
        <label>
          CUR File:
          <input
            type="file"
            accept=".cur"
            onChange={(e) => handleFileChange(e, setCursorFile)}
          />
        </label>
      </div>
      <button onClick={buildEmk} style={{ marginTop: "1rem" }}>
        สร้างไฟล์ EMK
      </button>
      {downloadUrl && (
        <div style={{ marginTop: "1rem" }}>
          <a href={downloadUrl} download="output.emk">
            คลิกที่นี่เพื่อดาวน์โหลดไฟล์ EMK
          </a>
        </div>
      )}
    </div>
  );
};

export default EmkBuilderComponent;
