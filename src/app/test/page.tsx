"use client";
import React, { useState, useRef } from "react";
import { FileImageCodec } from "./FileImageEncoder";

export default function FileImageConverter() {
  const [encodedImage, setEncodedImage] = useState<string>("");
  const [decodedFile, setDecodedFile] = useState<{
    blob: Blob;
    filename: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>(""); // ✅ URL ที่ผู้ใช้กรอก
  const hiddenImgRef = useRef<HTMLImageElement>(null); // ✅ เก็บ ref ของ hidden image

  const handleFileEncode = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert("File size must be less than 1MB");
      return;
    }

    setIsProcessing(true);
    try {
      const { canvas, filename } = await FileImageCodec.encodeFileToImage(file);
      const dataUrl = canvas.toDataURL("image/png");
      setEncodedImage(dataUrl);

      // Auto download
      FileImageCodec.downloadCanvas(canvas, `${filename}.png`);
    } catch (error) {
      console.error("Encoding failed:", error);
      alert("Encoding failed");
    }
    setIsProcessing(false);
  };

  const handleImageDecode = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    setIsProcessing(true);
    try {
      const canvas = await FileImageCodec.loadImageFromFile(file);
      const result = await FileImageCodec.decodeImageToFile(canvas);
      setDecodedFile(result);
    } catch (error) {
      console.error("Decoding failed:", error);
      alert("Decoding failed");
    }
    setIsProcessing(false);
  };

  // ✅ ถูกเรียกเมื่อ hidden image โหลดเสร็จ
  const handleHiddenImageLoaded = async () => {
    if (!hiddenImgRef.current) return;
    setIsProcessing(true);
    try {
      // ใช้ image element -> วาดลง canvas เอง
      const img = hiddenImgRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Cannot get canvas context");
      ctx.drawImage(img, 0, 0);

      const result = await FileImageCodec.decodeImageToFile(canvas);
      setDecodedFile(result);
    } catch (error) {
      console.error("Decoding from hidden image failed:", error);
      alert("Decoding from URL failed");
    }
    setIsProcessing(false);
  };

  const triggerDecodeFromUrl = () => {
    if (!imageUrl.trim()) {
      alert("Please enter image URL");
      return;
    }
    // การ set src จะทำให้ hidden <img> โหลด และเมื่อโหลดเสร็จจะไปเรียก handleHiddenImageLoaded
    if (hiddenImgRef.current) {
      hiddenImgRef.current.src = imageUrl.trim();
    }
  };

  const downloadDecodedFile = () => {
    if (decodedFile) {
      FileImageCodec.downloadBlob(decodedFile.blob, decodedFile.filename);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>File ↔ Image Converter</h1>

      {/* -------- Encode Section -------- */}
      <div
        style={{
          marginBottom: "30px",
          padding: "20px",
          border: "1px solid #ccc",
        }}
      >
        <h2>Encode File to Image</h2>
        <input
          type="file"
          onChange={handleFileEncode}
          disabled={isProcessing}
          style={{ marginBottom: "10px" }}
        />
        <div>Max size: 1MB</div>
        {encodedImage && (
          <div style={{ marginTop: "10px" }}>
            <div>Encoded image:</div>
            <img
              src={encodedImage}
              alt="Encoded"
              style={{
                maxWidth: "200px",
                maxHeight: "200px",
                border: "1px solid #ccc",
              }}
            />
          </div>
        )}
      </div>

      {/* -------- Decode Section -------- */}
      <div style={{ padding: "20px", border: "1px solid #ccc" }}>
        <h2>Decode Image to File</h2>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageDecode}
          disabled={isProcessing}
          style={{ marginBottom: "10px" }}
        />

        {/* ✅ เพิ่ม input URL */}
        <div style={{ marginTop: "10px" }}>
          <input
            type="text"
            placeholder="Paste image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            style={{ width: "100%", marginBottom: "10px", padding: "5px" }}
            disabled={isProcessing}
          />
          <button
            onClick={triggerDecodeFromUrl}
            disabled={isProcessing}
            style={{
              padding: "10px 20px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Decode from URL
          </button>
        </div>

        {decodedFile && (
          <div style={{ marginTop: "10px" }}>
            <button
              onClick={downloadDecodedFile}
              style={{
                marginTop: "10px",
                padding: "10px 20px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Download File
            </button>
          </div>
        )}
      </div>

      {isProcessing && (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          Processing...
        </div>
      )}

      {/* ✅ hidden preview image (ไม่แสดงบนจอ) */}
      <img
        ref={hiddenImgRef}
        alt="hidden"
        style={{ display: "none" }}
        onLoad={handleHiddenImageLoaded}
        crossOrigin="anonymous" // 🔑 เผื่อ CORS ต้องการ
      />
    </div>
  );
}
