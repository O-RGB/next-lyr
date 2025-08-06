"use client";

import { buildMp3 } from "@/modules/mp3-klyr-parser/builder";
import { readMp3 } from "@/modules/mp3-klyr-parser/read";
import { IParsedMp3Data } from "@/modules/mp3-klyr-parser/type";
import React, { useState } from "react";
// ⬇️ นำเข้าฟังก์ชันและ Types จากไฟล์ที่คุณสร้างไว้

export default function Mp3EditorPage() {
  // --- State Management ---
  const [jsonText, setJsonText] = useState("");
  const [audioData, setAudioData] = useState<ArrayBuffer | null>(null);
  const [originalFileName, setOriginalFileName] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // --- Functions ---
  const showMessage = (
    text: string,
    type: "success" | "error" | "info" = "info",
    duration = 5000
  ) => {
    setMessage({ text, type });
    if (duration > 0) {
      setTimeout(() => setMessage(null), duration);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    showMessage("🔄 กำลังโหลดและประมวลผลไฟล์...", "info", 0); // แสดงค้างไว้
    setDownloadUrl(null);

    try {
      // ✅ เรียกใช้ Logic จาก processor.ts
      const { parsedData, audioData } = await readMp3(file);

      setJsonText(JSON.stringify(parsedData, null, 2));
      setAudioData(audioData);
      setOriginalFileName(file.name);

      if (parsedData.lyrics.length > 0) {
        showMessage("✅ โหลดไฟล์และเนื้อเพลงสำเร็จ!", "success");
      } else {
        showMessage("⚠️ โหลดไฟล์สำเร็จ แต่ไม่พบข้อมูลเนื้อเพลง", "info");
      }
    } catch (error: any) {
      console.error(error);
      showMessage(`❌ เกิดข้อผิดพลาด: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuildClick = () => {
    if (!audioData) {
      showMessage("❌ ไม่มีข้อมูลเสียงสำหรับสร้างไฟล์", "error");
      return;
    }

    setIsLoading(true);
    showMessage("🛠️ กำลังสร้างไฟล์ MP3 ใหม่...", "info", 0);

    try {
      // ✅ เรียกใช้ Logic จาก processor.ts
      const currentData: IParsedMp3Data = JSON.parse(jsonText);
      // currentData.miscTags = DEFAULT_MISC;
      const newMp3Buffer = buildMp3(currentData, audioData);

      const blob = new Blob([newMp3Buffer], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      showMessage("🎉 สร้างไฟล์ใหม่สำเร็จ! คลิกเพื่อดาวน์โหลด", "success");
    } catch (error: any) {
      console.error(error);
      showMessage(`❌ เกิดข้อผิดพลาดในการสร้างไฟล์: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // --- JSX Rendering ---
  return (
    <main className="bg-gray-900 text-gray-200 min-h-screen font-sans">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            MP3 ID3 & Lyrics Editor
          </h1>
          <p className="text-gray-400 mt-2">
            แก้ไขข้อมูลและเนื้อเพลง (Karaoke) ในไฟล์ MP3
          </p>
        </header>

        {/* Message Display */}
        {message && (
          <div
            className={`p-4 mb-6 rounded-lg text-white font-semibold text-center
            ${message.type === "success" && "bg-green-600/80"}
            ${message.type === "error" && "bg-red-600/80"}
            ${message.type === "info" && "bg-blue-600/80"}`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-8">
          {/* Step 1: File Upload */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">
              1. เลือกไฟล์ MP3
            </h2>
            <input
              type="file"
              accept="audio/mp3"
              onChange={handleFileChange}
              disabled={isLoading}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50"
            />
          </div>

          {/* Step 2: Edit Data */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">
              2. แก้ไขข้อมูล (JSON)
            </h2>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder="ข้อมูลจากไฟล์ MP3 จะแสดงที่นี่..."
              disabled={isLoading || !jsonText}
              className="w-full h-96 p-4 bg-gray-900 border border-gray-700 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
            <button
              onClick={handleBuildClick}
              disabled={isLoading || !jsonText}
              className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isLoading ? "กำลังประมวลผล..." : "สร้างไฟล์ MP3 ที่แก้ไขแล้ว"}
            </button>
          </div>

          {/* Step 3: Download */}
          {downloadUrl && (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center">
              <h2 className="text-2xl font-semibold mb-4">
                3. ดาวน์โหลดผลลัพธ์
              </h2>
              <a
                href={downloadUrl}
                download={originalFileName.replace(/\.mp3$/i, "_modified.mp3")}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-300"
              >
                📥 ดาวน์โหลดไฟล์
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
