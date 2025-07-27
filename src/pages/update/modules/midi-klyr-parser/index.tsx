"use client";

import { useState, ChangeEvent } from "react";
import * as MidiEditer from "./lib/processor";
import { ParseResult } from "./lib/processor";

export default function MidiEditorComponent() {
  const [parsedData, setParsedData] = useState<ParseResult | null>(null);
  const [infoJson, setInfoJson] = useState<string>("");
  const [lyricsJson, setLyricsJson] = useState<string>("");
  const [chordsJson, setChordsJson] = useState<string>("");
  const [status, setStatus] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showStatus = (message: string, type: "success" | "error") => {
    setStatus({ message, type });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();

      const result = MidiEditer.parse(arrayBuffer);

      setParsedData(result);
      setInfoJson(JSON.stringify(result.info, null, 2));
      setLyricsJson(JSON.stringify(result.lyrics, null, 2));
      setChordsJson(JSON.stringify(result.chords, null, 2));

      showStatus("อ่านไฟล์ MIDI สำเร็จ!", "success");
    } catch (error) {
      const err = error as Error;
      console.error("Error parsing MIDI file:", err);
      showStatus(`เกิดข้อผิดพลาด: ${err.message}`, "error");
    }
  };

  const handleSave = () => {
    if (!parsedData) {
      showStatus("กรุณาโหลดไฟล์ MIDI ก่อน", "error");
      return;
    }

    try {
      const newSongInfo: MidiEditer.SongInfo = JSON.parse(infoJson);
      const newLyricsData: MidiEditer.LyricEvent[][] = JSON.parse(lyricsJson);
      const newChordsData: MidiEditer.ChordEvent[] = JSON.parse(chordsJson);

      const newMidiBuffer = MidiEditer.buildModifiedMidi({
        originalMidiData: parsedData.midiData,
        newSongInfo,
        newLyricsData,
        newChordsData,
        headerToUse: parsedData.detectedHeader,
      });

      const blob = new Blob([newMidiBuffer], { type: "audio/midi" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${newSongInfo.TITLE || "edited_song"}.mid`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showStatus("บันทึกไฟล์สำเร็จ!", "success");
    } catch (error) {
      const err = error as Error;
      console.error("Error saving MIDI file:", err);
      showStatus(`เกิดข้อผิดพลาดตอนบันทึก: ${err.message}`, "error");
    }
  };

  return (
    <>
      <div
        className="container"
        style={{
          maxWidth: "800px",
          margin: "2rem auto",
          background: "#f0f2f5",
          padding: "2rem",
          borderRadius: "8px",
          color: "#333",
        }}
      >
        <h1 style={{ textAlign: "center", marginBottom: "2rem" }}>
          MIDI Editor (Next.js)
        </h1>

        <div
          className="section"
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            marginBottom: "1rem",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          }}
        >
          <label
            htmlFor="midi-upload"
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "bold",
            }}
          >
            เลือกไฟล์ MIDI (.mid)
          </label>
          <input
            id="midi-upload"
            type="file"
            accept=".mid,.midi"
            onChange={handleFileChange}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>

        {status && (
          <div
            style={{
              padding: "1rem",
              borderRadius: "4px",
              margin: "1rem 0",
              border: "1px solid",
              borderColor: status.type === "success" ? "#4ade80" : "#f87171",
              backgroundColor:
                status.type === "success" ? "#dcfce7" : "#fee2e2",
              color: status.type === "success" ? "#15803d" : "#b91c1c",
            }}
          >
            {status.message}
          </div>
        )}

        {parsedData && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <div
              className="section"
              style={{
                background: "white",
                padding: "1rem",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <h2>Music Info JSON</h2>
              <textarea
                value={infoJson}
                onChange={(e) => setInfoJson(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "150px",
                  fontFamily: "monospace",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  padding: "0.5rem",
                }}
              />
            </div>
            <div
              className="section"
              style={{
                background: "white",
                padding: "1rem",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <h2>Lyrics JSON</h2>
              <textarea
                value={lyricsJson}
                onChange={(e) => setLyricsJson(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "200px",
                  fontFamily: "monospace",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  padding: "0.5rem",
                }}
              />
            </div>
            <div
              className="section"
              style={{
                background: "white",
                padding: "1rem",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <h2>Chords JSON</h2>
              <textarea
                value={chordsJson}
                onChange={(e) => setChordsJson(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "150px",
                  fontFamily: "monospace",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  padding: "0.5rem",
                }}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={!parsedData}
              style={{
                padding: "0.75rem 1.5rem",
                background: !parsedData ? "#ccc" : "#0070f3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: !parsedData ? "not-allowed" : "pointer",
                fontSize: "1rem",
                fontWeight: "bold",
                alignSelf: "center",
              }}
            >
              บันทึกไฟล์ MIDI
            </button>
          </div>
        )}
      </div>
    </>
  );
}
