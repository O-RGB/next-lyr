// update/pages/index.tsx
"use client";

import React, { useRef, useMemo } from "react";
import ControlPanel from "../components/panel/control-panel";
import LyricsPanel from "../components/panel/lyrics-panel";
import PreviewModal from "../components/modals/preview-modal";
import EditLyricLineModal from "../components/modals/edit-lyric-line-modal";
import ChordEditModal from "../components/modals/chord-edit-modal"; // Import new modal
import MidiPlayer, { MidiPlayerRef } from "../modules/js-synth";
import MetadataForm from "../components/metadata/metadata-form";
import { useKaraokeStore } from "../store/useKaraokeStore";
import {
  useKeyboardControls,
  PlayerControls,
} from "../hooks/useKeyboardControls";
import { usePlaybackSync } from "../hooks/usePlaybackSync";
import { MidiParseResult } from "../lib/midi-tags-decode";
import { ChordEvent } from "../modules/midi-klyr-parser/lib/processor"; // Import ChordEvent type

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
    isChordModalOpen, // New
    selectedChord, // New
    suggestedChordTick, // New
    actions,
  } = useKaraokeStore();

  // --- REFS ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const midiPlayerRef = useRef<MidiPlayerRef | null>(null);

  // --- PLAYER CONTROLS INTERFACE ---
  const playerControls = useMemo<PlayerControls | null>(
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
    [mode]
  );

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
    const word = lyricsData.find((w) => w.index === index);
    if (word?.start !== null && playerControls) {
      playerControls.seek(word?.start ?? 0);
      if (!playerControls.isPlaying()) {
        playerControls.play();
      }
      // Stop any active timing session when clicking a word
      actions.stopTiming();
    }
  };

  const handleEditLine = (lineIndex: number) => {
    if (lineIndex === null) return;
    const { success, preRollTime } = actions.startEditLine(lineIndex);
    if (success && playerControls) {
      playerControls.seek(preRollTime);
      playerControls.play();
    }
  };

  // New handler for ruler clicks
  const handleRulerClick = (
    lineIndex: number,
    percentage: number,
    lineDuration: number
  ) => {
    const firstWordOfLine = lyricsData.find((w) => w.lineIndex === lineIndex);
    if (firstWordOfLine && firstWordOfLine.start !== null) {
      const clickedTick = firstWordOfLine.start + lineDuration * percentage;
      actions.openChordModal(undefined, Math.round(clickedTick));
    } else {
      // If line not timed, maybe open modal at 0 tick or current playback tick
      actions.openChordModal(undefined, playerControls?.getCurrentTime() ?? 0);
    }
  };

  // New handler for chord clicks
  const handleChordClick = (chord: ChordEvent) => {
    actions.openChordModal(chord);
  };

  // New handler for adding chords via the '+' button
  const handleAddChordClick = (lineIndex: number) => {
    const firstWordOfLine = lyricsData.find((w) => w.lineIndex === lineIndex);
    let suggestedTick = 0;

    if (firstWordOfLine?.start !== null) {
      suggestedTick = firstWordOfLine?.start ?? 0; // Use start of line if timed
    } else {
      suggestedTick = playerControls?.getCurrentTime() ?? 0; // Use current playback time if not timed
    }

    // Add a small offset if the suggested tick is 0, to differentiate it
    if (
      suggestedTick === 0 &&
      (firstWordOfLine === undefined || firstWordOfLine.start === null)
    ) {
      suggestedTick = 1; // A small positive tick
    }

    actions.openChordModal(undefined, Math.round(suggestedTick));
  };

  // --- HOOKS ---
  useKeyboardControls(playerControls, handleEditLine);
  usePlaybackSync(audioRef, midiPlayerRef);

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
    <main className="flex h-screen flex-col ">
      <div className="flex p-4 gap-4 overflow-hidden h-full">
        <div className="w-[70%] h-full">
          <LyricsPanel
            onWordClick={handleWordClick}
            onEditLine={handleEditLine}
            onStopTiming={handleStop}
            onRulerClick={handleRulerClick}
            onChordClick={handleChordClick}
            onAddChordClick={handleAddChordClick} // Pass new handler
            currentPlaybackTime={playerControls?.getCurrentTime()}
            mode={mode}
          />
        </div>
        <div className="w-[30%] flex flex-col p-4 gap-6 bg-slate-200/50 border border-slate-300 rounded-lg">
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
                onLyricsParsed={(data: MidiParseResult) => {
                  if (data.info && (data.info.TITLE || data.info.ARTIST)) {
                    actions.setMetadata({
                      title: data.info.TITLE || metadata.title,
                      artist: data.info.ARTIST || metadata.artist,
                    });
                  }
                  actions.importParsedMidiData({
                    lyrics: data.lyrics,
                    chords: data.chords,
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
          <b className="text-amber-400">Up/Down: Select</b> |{" "}
          <b className="text-amber-400">Enter: Edit Text</b> |{" "}
          <b className="text-amber-400">Shift+Enter: Start Timing</b> |{" "}
          <b className="text-amber-400">Space: Play/Pause</b> |{" "}
          <b className="text-amber-400">Right: Set Time</b> |{" "}
          <b className="text-red-400">Left: Correct</b>
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
          onSave={(newText) => {
            // 1. Update the line text
            actions.updateLine(selectedLineIndex, newText);
            // 2. Close the modal
            actions.closeEditModal();
            // 3. Immediately start the line re-timing process
            handleEditLine(selectedLineIndex);
          }}
        />
      )}
      {isChordModalOpen && (
        <ChordEditModal
          initialChord={selectedChord || undefined}
          suggestedTick={suggestedChordTick || undefined}
          onClose={actions.closeChordModal}
          onSave={(chord) => {
            if (selectedChord) {
              actions.updateChord(selectedChord.tick, chord);
            } else {
              actions.addChord(chord);
            }
          }}
          onDelete={selectedChord ? actions.deleteChord : undefined}
        />
      )}
    </main>
  );
};

export default LyrEditerPanel;
