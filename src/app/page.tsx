"use client";

import { ThaiWordDict } from "@/lib/wordcut";
import { useEffect, useState } from "react";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [segmentedText, setSegmentedText] = useState<string[][]>([]);
  const [thaiSegmenter, setThaiSegmenter] = useState<ThaiWordDict | null>(null);

  const loadWords = async () => {
    const words: string[] = await fetch("/dict.json")
      .then((res) => res.json())
      .then((data) => data);

    const segmenter = new ThaiWordDict();
    segmenter.prepareWordDict(words);
    setThaiSegmenter(segmenter);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    if (thaiSegmenter) {
      // 1. แยกข้อความเป็นบรรทัดก่อน [1]
      const lines = text.split("\n");

      // 2. วนลูปตัดคำทีละบรรทัด แล้วเก็บเป็นอาร์เรย์ซ้อนอาร์เรย์ [2]
      const segmentedLines = lines.map((line) =>
        thaiSegmenter.segmentText(line)
      );

      setSegmentedText(segmentedLines);
    }
  };

  useEffect(() => {
    loadWords();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">ตัดคำภาษาไทย</h1>
      <textarea
        className="w-full p-2 border rounded mb-4"
        rows={5}
        placeholder="พิมพ์ข้อความที่นี่"
        value={inputText}
        onChange={handleTextChange}
      ></textarea>
      <div className="bg-gray-100 p-2 rounded">
        <div className="font-semibold mb-2">ผลลัพธ์การตัดคำ:</div>

        {segmentedText.map((data, index) => (
          <div key={`res-${index}`}>{data.join(" | ")}</div>
        ))}
      </div>
    </div>
  );
}
