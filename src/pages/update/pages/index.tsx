"use client";

import React, { useRef, useMemo } from "react";
import ControlPanel from "../components/panel/control-panel";
import LyricsPanel from "../components/panel/lyrics-panel";
import PreviewModal from "../components/modals/preview-modal";
import EditLyricLineModal from "../components/modals/edit-lyric-line-modal";
import MidiPlayer, { MidiPlayerRef } from "../modules/js-synth";
import MetadataForm from "../components/metadata/metadata-form";
import { useKaraokeStore } from "../store/useKaraokeStore";
import { useKeyboardControls } from "../hooks/useKeyboardControls";
import { usePlaybackSync } from "../hooks/usePlaybackSync";

const LyrEditerPanel: React.FC = () => {
  // --- STATE & ACTIONS from ZUSTAND ---
  const {
    mode,
    lyricsData,
    metadata,
    audioSrc,
    selectedLineIndex,
    isPreviewing,
    previewLyrics,
    previewTimestamps,
    isEditModalOpen,
    actions,
  } = useKaraokeStore();

  // --- REFS ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const midiPlayerRef = useRef<MidiPlayerRef | null>(null);

  // --- PLAYER CONTROLS INTERFACE ---
  // Create a unified interface for keyboard controls to interact with players
  const playerControls = useMemo(
    () =>
      mode
        ? {
            play: () =>
              mode === "mp3"
                ? audioRef.current?.play()
                : midiPlayerRef.current?.play(),
            pause: () =>
              mode === "mp3"
                ? audioRef.current?.pause()
                : midiPlayerRef.current?.pause(),
            seek: (time: number) =>
              mode === "mp3"
                ? (audioRef.current!.currentTime = time)
                : midiPlayerRef.current?.seek(time),
            getCurrentTime: () =>
              (mode === "mp3"
                ? audioRef.current?.currentTime
                : midiPlayerRef.current?.currentTick) ?? 0,
            isPlaying: () =>
              (mode === "mp3"
                ? !audioRef.current?.paused
                : midiPlayerRef.current?.isPlaying) ?? false,
          }
        : null,
    [mode, audioRef, midiPlayerRef]
  );

  // --- HOOKS ---
  useKeyboardControls(playerControls);
  usePlaybackSync(audioRef, midiPlayerRef);

  // --- HANDLERS ---
  const handleStop = () => {
    playerControls?.pause();
    playerControls?.seek(0);
    actions.stopTiming();
    actions.setPlaybackIndex(null);
    actions.setCurrentIndex(0);
    actions.setCorrectionIndex(null);
  };

  const handleWordClick = (index: number) => {
    const word = lyricsData[index];
    if (word?.start !== null && playerControls) {
      playerControls.seek(word.start);
      playerControls.play();
      actions.stopTiming();
    }
  };

  const handleEditLine = (lineIndex: number) => {
    const { success, preRollTime } = actions.startEditLine(lineIndex);
    if (success && playerControls) {
      playerControls.seek(preRollTime);
      playerControls.play();
    }
  };

  // --- RENDER ---
  if (!mode) {
    return (
      <main className="flex h-screen flex-col items-center justify-center bg-slate-100 text-slate-800">
        <h1 className="text-4xl font-bold mb-8">Karaoke Maker</h1>
        <div className="flex gap-4">
          <button
            onClick={() => actions.setMode("mp3")}
            className="px-8 py-4 bg-blue-500 text-white font-bold rounded-lg shadow-lg hover:bg-blue-600 transition-all"
          >
            Start with MP3
          </button>
          <button
            onClick={() => actions.setMode("midi")}
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
        {/* LyricsPanel now gets most props from the store directly */}
        <LyricsPanel
          onWordClick={handleWordClick}
          onEditLine={handleEditLine}
          onStopTiming={handleStop}
        />
        <div className="flex-[2] flex flex-col p-4 gap-6 bg-slate-200/50 border border-slate-300 rounded-lg">
          {mode === "mp3" ? (
            <ControlPanel
              audioRef={audioRef}
              audioSrc={audioSrc}
              metadata={metadata}
              onAudioLoad={(file) => {
                actions.setAudioSrc(URL.createObjectURL(file), file.name);
              }}
              onMetadataChange={actions.setMetadata}
              onPlay={() => playerControls?.play()}
              onPause={() => playerControls?.pause()}
              onStop={handleStop}
            />
          ) : (
            <div className="space-y-4">
              <MidiPlayer
                ref={midiPlayerRef}
                onFileLoaded={(file, durationTicks, ppq, bpm) => {
                  actions.setMidiInfo({
                    fileName: file.name,
                    durationTicks,
                    ppq,
                    bpm,
                  });
                }}
              />
              <MetadataForm
                metadata={metadata}
                onMetadataChange={actions.setMetadata}
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
          onClose={actions.closePreview}
        />
      )}

      {isEditModalOpen && selectedLineIndex !== null && (
        <EditLyricLineModal
          lineWords={lyricsData.filter(
            (w) => w.lineIndex === selectedLineIndex
          )}
          onClose={actions.closeEditModal}
          onSave={(newText) => actions.updateLine(selectedLineIndex, newText)}
        />
      )}
    </main>
  );
};

export default LyrEditerPanel;
