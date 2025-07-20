"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import ControlPanel from "../components/control-panel";
import LyricsPanel from "../components/lyrics-panel";
import PreviewModal from "../components/preview-modal";
import { LyricWordData } from "../lib/type";
import { processRawLyrics } from "../lib/utils";
import {
  TickLyricSegmentGenerator,
  TimestampLyricSegmentGenerator,
} from "../lib/cur-generator";
import MidiPlayer, { MidiPlayerRef } from "../modules/js-synth";
import MetadataForm from "../components/metadata-form";
import EditLyricLineModal from "../components/edit-lyric-line-modal";

const Home: React.FC = () => {
  // --- STATE ---
  const [mode, setMode] = useState<"mp3" | "midi" | null>(null);
  const [lyricsData, setLyricsData] = useState<LyricWordData[]>([]);
  const [metadata, setMetadata] = useState({ title: "", artist: "" });

  // Timing & Playback
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTimingActive, setIsTimingActive] = useState(false);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const [playbackIndex, setPlaybackIndex] = useState<number | null>(null);
  const [correctionIndex, setCorrectionIndex] = useState<number | null>(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(
    null
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // MP3
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // MIDI
  const midiPlayerRef = useRef<MidiPlayerRef | null>(null);
  const [midiInfo, setMidiInfo] = useState<{
    fileName: string;
    durationTicks: number;
    ppq: number;
  } | null>(null);
  const [currentTick, setCurrentTick] = useState(0);

  // Preview
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewTimestamps, setPreviewTimestamps] = useState<number[]>([]);
  const [previewLyrics, setPreviewLyrics] = useState<string[][]>([]);

  const lyricInputRef = useRef<HTMLTextAreaElement | null>(null);

  const getPreRollTime = useCallback(
    (lineIndex: number): number => {
      if (lineIndex <= 0) return 0;
      const firstWordOfPrevLine = lyricsData.find(
        (w) => w.lineIndex === lineIndex - 1
      );
      if (firstWordOfPrevLine && firstWordOfPrevLine.start !== null) {
        return firstWordOfPrevLine.start;
      }
      const firstWordOfCurrentLine = lyricsData.find(
        (w) => w.lineIndex === lineIndex
      );
      if (!firstWordOfCurrentLine) return 0;
      const lastTimedWordBefore = lyricsData
        .slice(0, firstWordOfCurrentLine.index)
        .filter((w) => w.end !== null)
        .pop();
      return lastTimedWordBefore?.end ?? 0;
    },
    [lyricsData]
  );

  const handleImport = useCallback(() => {
    const rawText = lyricInputRef.current?.value;
    if (!rawText) return;
    setIsPreviewing(false);
    setIsTimingActive(false);
    setEditingLineIndex(null);
    setCurrentIndex(0);
    setCorrectionIndex(null);
    setSelectedLineIndex(null);
    setLyricsData(processRawLyrics(rawText));
  }, []);

  const handleDeleteLine = useCallback((lineIndexToDelete: number) => {
    if (
      !confirm(`Are you sure you want to delete line ${lineIndexToDelete + 1}?`)
    )
      return;
    setLyricsData((prev) => {
      const remainingWords = prev.filter(
        (word) => word.lineIndex !== lineIndexToDelete
      );
      const newLyricsData: LyricWordData[] = [];
      let globalWordIndex = 0;
      const lineMap = new Map<number, number>();
      let newLineIndexCounter = 0;
      remainingWords.forEach((word) => {
        let newLineIndex;
        if (lineMap.has(word.lineIndex)) {
          newLineIndex = lineMap.get(word.lineIndex)!;
        } else {
          newLineIndex = newLineIndexCounter;
          lineMap.set(word.lineIndex, newLineIndex);
          newLineIndexCounter++;
        }
        newLyricsData.push({
          ...word,
          lineIndex: newLineIndex,
          index: globalWordIndex++,
        });
      });
      return newLyricsData;
    });
    setSelectedLineIndex(null);
  }, []);

  const handleUpdateLine = useCallback(
    (lineIndexToUpdate: number, newText: string) => {
      const newWordsForLine = processRawLyrics(newText).map((word) => ({
        ...word,
        lineIndex: lineIndexToUpdate,
      }));
      setLyricsData((prev) => {
        const otherLinesWords = prev.filter(
          (word) => word.lineIndex !== lineIndexToUpdate
        );
        const updatedLyrics = [...otherLinesWords, ...newWordsForLine];
        updatedLyrics.sort((a, b) => {
          if (a.lineIndex !== b.lineIndex) {
            return a.lineIndex - b.lineIndex;
          }
          return a.index - b.index;
        });
        return updatedLyrics.map((word, index) => ({ ...word, index }));
      });
      setIsEditModalOpen(false);
    },
    []
  );

  const handleWordUpdate = useCallback(
    (index: number, newWordData: Partial<LyricWordData>) => {
      setLyricsData((prev) =>
        prev.map((word, i) =>
          i === index ? { ...word, ...newWordData } : word
        )
      );
    },
    []
  );

  const handlePlay = useCallback(() => {
    if (mode === "mp3") audioRef.current?.play();
    else midiPlayerRef.current?.play();
  }, [mode]);

  const handlePause = useCallback(() => {
    if (mode === "mp3") audioRef.current?.pause();
    else midiPlayerRef.current?.pause();
  }, [mode]);

  const handleStop = useCallback(() => {
    if (mode === "mp3" && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    } else if (mode === "midi") {
      midiPlayerRef.current?.stop();
    }
    setIsTimingActive(false);
    setCurrentIndex(0);
    setEditingLineIndex(null);
    setPlaybackIndex(null);
    setCorrectionIndex(null);
  }, [mode]);

  const handleMidiFileLoaded = (
    file: File,
    durationTicks: number,
    ppq: number
  ) => {
    setMidiInfo({ fileName: file.name, durationTicks, ppq });
    setMetadata({ title: file.name.replace(/\.[^/.]+$/, ""), artist: "" });
  };

  const handleEditLine = useCallback(
    (lineIndex: number) => {
      const firstWordOfLine = lyricsData.find((w) => w.lineIndex === lineIndex);
      if (!firstWordOfLine) return;
      const firstWordIndex = firstWordOfLine.index;
      const preRollTime = getPreRollTime(lineIndex);
      setSelectedLineIndex(lineIndex);
      setLyricsData((prev) =>
        prev.map((word) =>
          word.lineIndex === lineIndex
            ? { ...word, start: null, end: null, length: 0 }
            : word
        )
      );
      setCurrentIndex(firstWordIndex);
      setEditingLineIndex(lineIndex);
      setIsTimingActive(false);
      setCorrectionIndex(null);
      if (mode === "mp3" && audioRef.current) {
        audioRef.current.currentTime = preRollTime;
        audioRef.current.play();
      } else if (mode === "midi" && midiPlayerRef.current) {
        midiPlayerRef.current.seek(preRollTime);
        midiPlayerRef.current.play();
      }
    },
    [lyricsData, getPreRollTime, mode]
  );

  const handleStopTiming = useCallback(() => {
    handlePause();
    setIsTimingActive(false);
    setEditingLineIndex(null);
    alert("การจับเวลาถูกยกเลิก");
  }, [handlePause]);

  const handlePreview = useCallback(() => {
    const timedWords = lyricsData.filter(
      (w) => w.start !== null && w.end !== null
    );
    if (timedWords.length === 0) {
      alert("No timed lyrics to preview.");
      return;
    }
    let timestamps: number[] = [];
    if (mode === "midi" && midiPlayerRef.current) {
      const bpm = midiPlayerRef.current.currentBpm;
      const generator = new TickLyricSegmentGenerator(bpm);
      timestamps = generator.generateSegment(timedWords);
    } else {
      const generator = new TimestampLyricSegmentGenerator();
      timestamps = generator.generateSegment(timedWords);
    }
    setPreviewTimestamps(timestamps);
    const lyrs: string[][] = [];
    lyricsData.forEach((data) => {
      if (!lyrs[data.lineIndex]) lyrs[data.lineIndex] = [];
      lyrs[data.lineIndex].push(data.name);
    });
    setPreviewLyrics(lyrs);
    setIsPreviewing(true);
  }, [lyricsData, mode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || mode !== "mp3") return;
    const handleTimeUpdate = () => {
      if (
        isPreviewing ||
        audio.paused ||
        (isTimingActive && correctionIndex === null)
      ) {
        setPlaybackIndex(null);
        return;
      }
      const newPlaybackIndex = lyricsData.findIndex(
        (word) =>
          word.start !== null &&
          word.end !== null &&
          audio.currentTime >= word.start &&
          audio.currentTime < word.end
      );
      setPlaybackIndex(newPlaybackIndex > -1 ? newPlaybackIndex : null);
      if (newPlaybackIndex > -1) {
        const word = lyricsData[newPlaybackIndex];
        if (word && selectedLineIndex !== word.lineIndex) {
          setSelectedLineIndex(word.lineIndex);
        }
      }
    };
    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => audio.removeEventListener("timeupdate", handleTimeUpdate);
  }, [
    lyricsData,
    isTimingActive,
    isPreviewing,
    mode,
    correctionIndex,
    selectedLineIndex,
  ]);

  useEffect(() => {
    const player = midiPlayerRef.current;
    if (!player || mode !== "midi") return;
    const handleTickUpdate = (tick: number) => {
      setCurrentTick(tick);
      if (
        isPreviewing ||
        !player.isPlaying ||
        (isTimingActive && correctionIndex === null)
      ) {
        setPlaybackIndex(null);
        return;
      }
      const newPlaybackIndex = lyricsData.findIndex(
        (word) =>
          word.start !== null &&
          word.end !== null &&
          tick >= word.start &&
          tick < word.end
      );
      setPlaybackIndex(newPlaybackIndex > -1 ? newPlaybackIndex : null);
      if (newPlaybackIndex > -1) {
        const word = lyricsData[newPlaybackIndex];
        if (word && selectedLineIndex !== word.lineIndex) {
          setSelectedLineIndex(word.lineIndex);
        }
      }
    };
    player.addEventListener("tickupdate", handleTickUpdate);
    return () => player.removeEventListener("tickupdate", handleTickUpdate);
  }, [
    lyricsData,
    isTimingActive,
    isPreviewing,
    mode,
    midiPlayerRef,
    correctionIndex,
    selectedLineIndex,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isTimingActive || correctionIndex !== null) {
        const activeWordEl = document.querySelector(
          `[data-index="${currentIndex}"]`
        );
        activeWordEl?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      } else if (selectedLineIndex !== null) {
        const selectedLineEl = document.querySelector(
          `[data-line-index="${selectedLineIndex}"]`
        );
        selectedLineEl?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentIndex, selectedLineIndex, isTimingActive, correctionIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) ||
        isEditModalOpen
      )
        return;

      const playerActive =
        mode === "mp3"
          ? !audioRef.current?.paused
          : midiPlayerRef.current?.isPlaying;
      const totalLines = lyricsData.length
        ? Math.max(...lyricsData.map((w) => w.lineIndex)) + 1
        : 0;

      if (e.code === "ArrowUp") {
        e.preventDefault();
        setSelectedLineIndex((prev) => {
          if (prev === null) return totalLines > 0 ? 0 : null;
          return prev > 0 ? prev - 1 : 0;
        });
        return;
      }
      if (e.code === "ArrowDown") {
        e.preventDefault();
        setSelectedLineIndex((prev) => {
          if (prev === null) return totalLines > 0 ? 0 : null;
          return prev < totalLines - 1 ? prev + 1 : prev;
        });
        return;
      }
      if (e.code === "Enter" && selectedLineIndex !== null) {
        e.preventDefault();
        setIsEditModalOpen(true);
        return;
      }

      // ✅ MODIFIED: ปรับปรุง Logic ของ Spacebar
      if (e.code === "Space") {
        e.preventDefault();
        if (playerActive) {
          handlePause();
        } else {
          // ถ้ามีบรรทัดที่เลือกไว้ ให้เล่นจากบรรทัดก่อนหน้า
          if (selectedLineIndex !== null) {
            const preRollTime = getPreRollTime(selectedLineIndex);
            if (mode === "mp3" && audioRef.current) {
              audioRef.current.currentTime = preRollTime;
            } else if (mode === "midi" && midiPlayerRef.current) {
              midiPlayerRef.current.seek(preRollTime);
            }
          }
          handlePlay();
        }
        return;
      }

      if (
        (isTimingActive || correctionIndex !== null) &&
        e.code === "ArrowLeft"
      ) {
        e.preventDefault();
        if (currentIndex <= 0) return;

        const prevIndex = currentIndex - 1;
        const prevWord = lyricsData[prevIndex];
        if (!prevWord) return;

        setLyricsData((prev) => {
          const newData = [...prev];
          if (newData[currentIndex]) {
            newData[currentIndex].start = null;
          }
          if (newData[prevIndex]) {
            newData[prevIndex].end = null;
            newData[prevIndex].length = 0;
          }
          return newData;
        });

        setCurrentIndex(prevIndex);
        setCorrectionIndex(prevIndex);
        setIsTimingActive(true);

        const lineStartTime =
          lyricsData.find(
            (w) => w.lineIndex === prevWord.lineIndex && w.start !== null
          )?.start ?? getPreRollTime(prevWord.lineIndex);

        if (mode === "mp3" && audioRef.current) {
          audioRef.current.currentTime = lineStartTime;
          if (!playerActive) handlePlay();
        } else if (mode === "midi" && midiPlayerRef.current) {
          midiPlayerRef.current.seek(lineStartTime);
          if (!playerActive) handlePlay();
        }
        return;
      }

      if (!playerActive || e.code !== "ArrowRight") return;
      e.preventDefault();

      const currentTime =
        mode === "mp3" ? audioRef.current?.currentTime ?? 0 : currentTick;

      setCorrectionIndex(null);

      if (!isTimingActive) {
        setIsTimingActive(true);
        setLyricsData((prev) => {
          const newData = [...prev];
          if (newData[currentIndex]) newData[currentIndex].start = currentTime;
          return newData;
        });
        return;
      }

      setLyricsData((prev) => {
        const newData = [...prev];
        const currentWord = newData[currentIndex];
        if (currentWord) {
          currentWord.end = currentTime;
          currentWord.length =
            currentWord.end - (currentWord.start ?? currentTime);
        }
        const nextWord = newData[currentIndex + 1];
        if (nextWord) {
          if (
            currentWord &&
            nextWord.lineIndex !== currentWord.lineIndex &&
            editingLineIndex !== null
          ) {
            handlePause();
            setIsTimingActive(false);
            setEditingLineIndex(null);
          } else {
            nextWord.start = currentTime;
          }
        } else {
          alert("Timing complete!");
          handlePause();
          setIsTimingActive(false);
          setEditingLineIndex(null);
        }
        return newData;
      });

      if (currentIndex + 1 < lyricsData.length) {
        const nextIndex = currentIndex + 1;
        const nextWord = lyricsData[nextIndex];

        setCurrentIndex(nextIndex);

        if (nextWord && selectedLineIndex !== nextWord.lineIndex) {
          setSelectedLineIndex(nextWord.lineIndex);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentIndex,
    isTimingActive,
    lyricsData,
    editingLineIndex,
    handlePlay,
    handlePause,
    mode,
    currentTick,
    getPreRollTime,
    selectedLineIndex,
    isEditModalOpen,
    correctionIndex,
  ]);

  if (!mode) {
    return (
      <main className="flex h-screen flex-col items-center justify-center bg-slate-100 text-slate-800">
        <h1 className="text-4xl font-bold mb-8">Karaoke Maker</h1>
        <div className="flex gap-4">
          <button
            onClick={() => setMode("mp3")}
            className="px-8 py-4 bg-blue-500 text-white font-bold rounded-lg shadow-lg hover:bg-blue-600 transition-all"
          >
            Start with MP3
          </button>
          <button
            onClick={() => setMode("midi")}
            className="px-8 py-4 bg-green-500 text-white font-bold rounded-lg shadow-lg hover:bg-green-600 transition-all"
          >
            Start with MIDI
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col bg-slate-100 text-slate-800">
      <div className="flex-grow container mx-auto p-4 flex gap-4 overflow-hidden">
        <LyricsPanel
          lyricsData={lyricsData}
          currentIndex={currentIndex}
          isTimingActive={isTimingActive}
          editingLineIndex={editingLineIndex}
          playbackIndex={playbackIndex}
          correctionIndex={correctionIndex}
          selectedLineIndex={selectedLineIndex}
          lyricInputRef={lyricInputRef}
          onImport={handleImport}
          onWordClick={(index) => {
            const word = lyricsData[index];
            if (word?.start !== null) {
              if (mode === "mp3" && audioRef.current) {
                audioRef.current.currentTime = word.start;
                handlePlay();
              } else if (mode === "midi" && midiPlayerRef.current) {
                midiPlayerRef.current.seek(word.start);
                handlePlay();
              }
              setIsTimingActive(false);
              setEditingLineIndex(null);
              setCorrectionIndex(null);
            }
          }}
          onEditLine={handleEditLine}
          onDeleteLine={handleDeleteLine}
          onWordUpdate={handleWordUpdate}
          onWordDelete={() => {}}
          onPreview={handlePreview}
          onExport={() => alert("Exporting...")}
          onStopTiming={handleStopTiming}
        />
        <div className="flex-[2] flex flex-col p-4 gap-6 bg-slate-200/50 border border-slate-300 rounded-lg">
          {mode === "mp3" ? (
            <ControlPanel
              audioRef={audioRef}
              audioSrc={audioSrc}
              metadata={metadata}
              onAudioLoad={(file) => {
                setAudioSrc(URL.createObjectURL(file));
                setMetadata((prev) => ({
                  ...prev,
                  title: file.name.replace(/\.[^/.]+$/, ""),
                }));
              }}
              onMetadataChange={setMetadata}
              onPlay={handlePlay}
              onPause={handlePause}
              onStop={handleStop}
            />
          ) : (
            <div className="space-y-4">
              <MidiPlayer
                ref={midiPlayerRef}
                onFileLoaded={handleMidiFileLoaded}
              />
              <MetadataForm
                metadata={metadata}
                onMetadataChange={setMetadata}
              />
            </div>
          )}
        </div>
      </div>
      <footer className="w-full bg-slate-800 text-white p-2 text-center text-sm shadow-inner">
        <p>
          <b className="text-amber-400">Mode: {mode?.toUpperCase()}</b> |{" "}
          <b className="text-amber-400">Use ↑/↓ to Select Line</b> |{" "}
          <b className="text-amber-400">Enter: Edit Line</b> |{" "}
          <b className="text-amber-400">Space:</b> Play/Pause |{" "}
          <b className="text-amber-400">→:</b> Set Time |{" "}
          <b className="text-red-400">←:</b> Go Back/Correct
        </p>
      </footer>
      {isPreviewing && (
        <PreviewModal
          lyrics={previewLyrics}
          timestamps={previewTimestamps}
          mode={mode}
          audioRef={audioRef}
          midiPlayerRef={midiPlayerRef}
          onClose={() => setIsPreviewing(false)}
        />
      )}
      {isEditModalOpen && selectedLineIndex !== null && (
        <EditLyricLineModal
          lineWords={lyricsData.filter(
            (w) => w.lineIndex === selectedLineIndex
          )}
          onClose={() => setIsEditModalOpen(false)}
          onSave={(newText) => handleUpdateLine(selectedLineIndex, newText)}
        />
      )}
    </main>
  );
};

export default Home;
