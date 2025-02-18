"use client";
import PlayerBox from "@/components/midi/plyer-box";
import NavBar from "@/components/navbar/navbar-menu";
import { CurBuilder } from "@/lib/karaoke/builder/cur-builder";
import { LyrBuilder } from "@/lib/karaoke/builder/lyr-builder";
import { loadWords } from "@/lib/wordcut";
import { ThaiWordDict } from "@/lib/wordcut/wordcut";
import { JsSynthEngine } from "@/modules/js-synth-engine";
import LyricsSection from "@/tools/lyrics-setcion";
import React from "react";
import { useEffect, useState } from "react";

export default function Home() {
  const [inputText, setInputText] = useState("");

  const [cursor, setCursor] = useState<number[]>([]);
  const [lineIndex, setLineIndex] = useState<number>(0);
  const [wordIndex, setWordIndex] = useState<number>(-1);

  const [segmentedText, setSegmentedText] = useState<string[][]>([]);
  const [thaiSegmenter, setThaiSegmenter] = useState<ThaiWordDict | null>(null);
  const [synth, setSynth] = useState<JsSynthEngine>();

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

  const loadCur = () => {
    const curBuild = new CurBuilder([
      0, 14, 19, 24, 29, 40, 44, 48, 57, 60, 63, 68, 75, 82, 91, 96, 107, 111,
      115, 120, 124, 129, 131, 133, 165, 165, 169, 177, 180, 187, 197, 217, 220,
      223, 226, 236, 240, 244, 254, 257, 260, 263, 269, 275, 288, 290, 292, 294,
      296, 337, 337, 369, 433, 444, 455, 477, 485, 501, 527, 555, 583, 603, 630,
    ]);
    curBuild.downloadFile("song.cur");
  };

  const loadLyr = () => {
    const lyrBuild = new LyrBuilder({
      artist: "ไหมไทย",
      key: "cm",
      name: "นะหน้าทอง",
      lyrics: [
        "เพลง คนน่าฮักอกหักบ่คือ",
        "แสดงสด ไหมไทย หัวใจศิลป์",
        "Intro:>>>>>>",
        ">>>เป็นตาฮักกะด้อ",
        "เจ็บเป็นอยู่บ้อคนดี",
      ],
    });
    lyrBuild.downloadFile("song.lyr");
  };

  useEffect(() => {
    loadWords().then((word) => {
      setThaiSegmenter(word);
    });
    loadSynth();
  }, []);

  return (
    <div className="broder-4 border-red-600">
      <div className="w-full bg-slate-300">
        <NavBar></NavBar>
      </div>
      <div onClick={loadLyr}>lyr</div>
      <div onClick={loadCur}>cur</div>
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
