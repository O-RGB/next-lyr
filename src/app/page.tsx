"use client";
import PlayerBox from "@/components/midi/plyer-box";
import NavBar from "@/components/navbar/navbar-menu";
import { ThaiWordDict } from "@/lib/wordcut";
import { JsSynthEngine } from "@/modules/js-synth-engine";
import LyricsSection from "@/tools/lyrics-setcion";
import React from "react";
import { useEffect, useState } from "react";
import { FaFile, FaPlus } from "react-icons/fa";

export default function Home() {
  const [inputText, setInputText] = useState("");

  const [cursor, setCursor] = useState<number[]>([]);
  const [lineIndex, setLineIndex] = useState<number>(0);
  const [wordIndex, setWordIndex] = useState<number>(-1);

  const [segmentedText, setSegmentedText] = useState<string[][]>([]);
  const [thaiSegmenter, setThaiSegmenter] = useState<ThaiWordDict | null>(null);
  const [synth, setSynth] = useState<JsSynthEngine>();

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
      const lines = text.split("\n");

      const segmentedLines = lines.map((line) =>
        thaiSegmenter.segmentText(line)
      );

      setSegmentedText(segmentedLines);
    }
  };

  const play = async () => {
    if (!synth) {
      return;
    }
    fetch("/emk/WN00849.mid")
      .then((response) => response.blob())
      .then(async (blob) => {
        const file = new File([blob], "D10299.mid", { type: "audio/midi" });
        await synth?.player?.loadMidi(file);
        setTimeout(() => {
          synth?.player?.play();
        }, 1000);
      })
      .catch((error) => console.error("Error loading MIDI file:", error));
  };

  const loadSynth = async () => {
    const s = new JsSynthEngine();
    await s.startup();
    setSynth(s);
  };

  const showTime = async (charIndex: number) => {
    const cursor = await synth?.player?.getCurrentTiming();
    if (cursor) {
      setCursor((v) => {
        let clone = [...v];
        clone[charIndex + 1] = cursor;
        console.log(clone);
        return clone;
      });
    }
  };

  const moveWord = (forward: boolean) => {
    if (forward) {
      const currentLineMaxWords = segmentedText[lineIndex].length;
      if (wordIndex + 1 < currentLineMaxWords) {
        setWordIndex(wordIndex + 1);
        showTime(wordIndex);
      } else if (lineIndex + 1 < segmentedText.length) {
        setLineIndex(lineIndex + 1);
        setWordIndex(0);
        showTime(wordIndex);
      }
    } else {
      if (wordIndex - 1 >= 0) {
        setWordIndex(wordIndex - 1);
        showTime(wordIndex);
      } else if (lineIndex - 1 >= 0) {
        setLineIndex(lineIndex - 1);
        setWordIndex(segmentedText[lineIndex - 1].length - 1);
      }
    }
  };

  useEffect(() => {
    loadWords();
    loadSynth();
  }, []);

  return (
    <div className="broder-4 border-red-600">
      <div className="w-full bg-slate-300">
        <NavBar></NavBar>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 w-full h-[94.5vh] p-2">
        <div className="col-span-1 lg:col-span-4 overflow-auto">
          <div className="grid grid-row-6 w-full h-full">
            <div className="row-span-2 w-full h-full">
              <div className="text-xs">เนื้อเพลง :</div>
              <textarea
                className="w-full p-2 border rounded"
                rows={5}
                placeholder="พิมพ์ข้อความที่นี่"
                value={inputText}
                onChange={handleTextChange}
              ></textarea>
            </div>
            <LyricsSection
              lineCurrent={lineIndex}
              wordCurrent={wordIndex}
              segmentedText={segmentedText}
              onLyricsListChange={(v) => {
                setSegmentedText(v);
                setCursor(Array(v.reduce((c, r) => c + r.length, 0)).fill(0));
              }}
            ></LyricsSection>
          </div>
        </div>
        <div className="col-span-1 lg:col-span-2">
          <PlayerBox></PlayerBox>
          <div onClick={play} className="p-2 border">
            test
          </div>
          lineIndex: {lineIndex} | wordIndex: {wordIndex}
          <div className="flex gap-2 mb-4">
            <button
              className="p-2 border rounded"
              onClick={() => moveWord(false)}
            >
              ⬅️ Left
            </button>
            <button
              className="p-2 border rounded"
              onClick={() => moveWord(true)}
            >
              ➡️ Right
            </button>
          </div>
          <div className="h-[300px] w-full overflow-auto">
            {JSON.stringify(cursor.values())}
            cursor: {JSON.stringify(cursor.length)}
          </div>
        </div>
      </div>
    </div>
  );
}
