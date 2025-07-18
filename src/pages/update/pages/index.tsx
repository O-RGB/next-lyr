"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ControlPanel from "../components/control-panel";
import LyricsPanel from "../components/lyrics-panel";
import PreviewModal from "../components/preview-modal";
import { LyricWordData } from "../lib/type";
import { processRawLyrics, createAndDownloadJSON } from "../lib/utils";

export default function Home() {
  const [lyricsData, setLyricsData] = useState<LyricWordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTimingActive, setIsTimingActive] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [metadata, setMetadata] = useState({ title: "", artist: "" });

  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const [playbackIndex, setPlaybackIndex] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lyricInputRef = useRef<HTMLTextAreaElement | null>(null);

  const getPreRollTime = useCallback(
    (targetWordIndex: number): number => {
      if (!audioRef.current) return 0;

      const targetWord = lyricsData[targetWordIndex];
      if (!targetWord) return 0;

      let preRollTime = 0;

      if (targetWord.start !== null) {
        preRollTime = targetWord.start - 2;
      } else {
        const previousLineWords = lyricsData.filter(
          (w) => w.lineIndex === targetWord.lineIndex - 1
        );
        if (previousLineWords.length > 0) {
          const lastWordOfPreviousLine =
            previousLineWords[previousLineWords.length - 1];
          if (lastWordOfPreviousLine.end !== null) {
            preRollTime = lastWordOfPreviousLine.end - 1;
          }
        }
      }
      return Math.max(0, preRollTime);
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
    const processedLyrics = processRawLyrics(rawText);
    setLyricsData(processedLyrics);
  }, []);

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

  const handleEditLine = useCallback(
    (lineIndex: number) => {
      const firstWordOfLineEdit = lyricsData.find(
        (w) => w.lineIndex === lineIndex
      );
      if (!firstWordOfLineEdit) return;

      const firstWordIndex = firstWordOfLineEdit.index;
      const preRollTime = getPreRollTime(firstWordIndex);

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

      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, preRollTime);
        audioRef.current.play();
      }
    },
    [lyricsData, getPreRollTime]
  );

  const handleStopTiming = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsTimingActive(false);
    setEditingLineIndex(null);
    alert("การจับเวลาถูกยกเลิก");
  }, []);

  const handlePlay = useCallback(() => {
    if (!audioRef.current) return;
    const currentAudioTime = audioRef.current.currentTime;

    const currentWordAtTime = lyricsData.find(
      (word) =>
        word.start !== null &&
        word.end !== null &&
        currentAudioTime >= word.start &&
        currentAudioTime < word.end
    );

    let targetIndexForPreRoll = currentIndex;
    if (playbackIndex !== null) {
      targetIndexForPreRoll = playbackIndex;
    } else if (currentWordAtTime) {
      targetIndexForPreRoll = currentWordAtTime.index;
    } else if (currentAudioTime === 0 && lyricsData.length > 0) {
      targetIndexForPreRoll = 0;
    }

    const preRollTime = getPreRollTime(targetIndexForPreRoll);
    audioRef.current.currentTime = Math.max(0, preRollTime);
    audioRef.current.play();
    setIsTimingActive(false);
    setEditingLineIndex(null);
  }, [lyricsData, currentIndex, playbackIndex, getPreRollTime]);

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsTimingActive(false);
    setEditingLineIndex(null);
  }, []);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsTimingActive(false);
    setCurrentIndex(0);
    setEditingLineIndex(null);
    setPlaybackIndex(null);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (isTimingActive || isPreviewing) {
        if (playbackIndex !== null) setPlaybackIndex(null);
        return;
      }

      if (audio.paused && audio.currentTime === 0) {
        if (playbackIndex !== null) setPlaybackIndex(null);
        return;
      }

      if (!audio.paused || (audio.paused && playbackIndex !== null)) {
        const currentTime = audio.currentTime;
        const newPlaybackIndex = lyricsData.findIndex(
          (word) =>
            word.start !== null &&
            word.end !== null &&
            currentTime >= word.start &&
            currentTime < word.end
        );

        if (newPlaybackIndex !== -1 && newPlaybackIndex !== playbackIndex) {
          setPlaybackIndex(newPlaybackIndex);
        } else if (
          newPlaybackIndex === -1 &&
          playbackIndex !== null &&
          !audio.paused
        ) {
          setPlaybackIndex(null);
        }
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => audio.removeEventListener("timeupdate", handleTimeUpdate);
  }, [lyricsData, isTimingActive, isPreviewing, playbackIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) ||
        (e.target as HTMLElement).isContentEditable
      )
        return;

      const audio = audioRef.current;
      if (!audio) return;

      if (e.code === "Space") {
        e.preventDefault();
        audio.paused ? handlePlay() : handlePause();
        return;
      }

      if (e.code === "ArrowRight" && audio.paused) return;

      if (e.code === "ArrowLeft" && !isTimingActive) return;

      e.preventDefault();

      switch (e.code) {
        case "ArrowRight": {
          if (currentIndex >= lyricsData.length) return;
          const currentTime = audio.currentTime;
          if (!isTimingActive) {
            setIsTimingActive(true);
            setLyricsData((prev) => {
              const newData = [...prev];
              if (newData[currentIndex]) {
                newData[currentIndex].start = currentTime;
              }
              return newData;
            });
            return;
          }
          setLyricsData((prev) => {
            const newData = [...prev];
            const currentWord = newData[currentIndex];
            currentWord.end = currentTime;
            currentWord.length =
              currentWord.end - (currentWord.start ?? currentTime);
            const nextWord = newData[currentIndex + 1];
            if (nextWord) {
              if (
                nextWord.lineIndex !== currentWord.lineIndex &&
                editingLineIndex !== null
              ) {
                audio.pause();
                setIsTimingActive(false);
                setEditingLineIndex(null);
              } else {
                nextWord.start = currentTime;
              }
            } else {
              alert("Timing complete!");
              audio.pause();
              setIsTimingActive(false);
              setEditingLineIndex(null);
            }
            return newData;
          });
          if (currentIndex + 1 < lyricsData.length) {
            setCurrentIndex((prev) => prev + 1);
          }
          break;
        }
        case "ArrowLeft": {
          if (currentIndex === 0) return;
          const currentWord = lyricsData[currentIndex];
          const targetWord = lyricsData[currentIndex - 1];

          if (!isTimingActive || currentWord.lineIndex !== targetWord.lineIndex)
            return;
          audio.pause();
          const targetIndex = currentIndex - 1;
          const seekTime = targetWord.start;
          if (seekTime === null) return;
          setLyricsData((prev) => {
            const newData = [...prev];
            newData[targetIndex].end = null;
            newData[targetIndex].length = 0;
            if (newData[currentIndex]) {
              newData[currentIndex].start = null;
            }
            return newData;
          });
          setCurrentIndex(targetIndex);
          audio.currentTime = seekTime;
          break;
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
  ]);

  return (
    <main className="flex h-screen flex-col bg-slate-100 text-slate-800">
      <div className="flex-grow container mx-auto p-4 flex gap-4 overflow-hidden">
        <LyricsPanel
          lyricsData={lyricsData}
          currentIndex={currentIndex}
          isTimingActive={isTimingActive}
          editingLineIndex={editingLineIndex}
          playbackIndex={playbackIndex}
          lyricInputRef={lyricInputRef}
          onImport={handleImport}
          onWordClick={(index) => {
            const word = lyricsData[index];
            if (word?.start !== null && audioRef.current) {
              audioRef.current.currentTime = word.start;
              audioRef.current.play();
              setIsTimingActive(false);
              setEditingLineIndex(null);
            }
          }}
          onEditLine={handleEditLine}
          onWordUpdate={handleWordUpdate}
          onWordDelete={() => {}}
          onPreview={() => setIsPreviewing(true)}
          onExport={() => createAndDownloadJSON(lyricsData, metadata)}
          onStopTiming={handleStopTiming}
        />
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
      </div>
      <footer className="w-full bg-slate-800 text-white p-2 text-center text-sm shadow-inner">
        <p>
          <b className="text-amber-400">Tap "Edit" on a line</b> to start |{" "}
          <b className="text-amber-400">Space:</b> Play/Pause |{" "}
          <b className="text-amber-400">→ (while playing):</b> Set Time
        </p>
      </footer>
      {isPreviewing && (
        <PreviewModal
          lyricsData={lyricsData}
          audioRef={audioRef}
          onClose={() => setIsPreviewing(false)}
        />
      )}
    </main>
  );
}
