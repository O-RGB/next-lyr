// update/pages/index.tsx
"use client";

import React, { useRef, useMemo } from "react";
import ControlPanel from "../components/panel/control-panel";
import LyricsPanel from "../components/panel/lyrics-panel";
import PreviewModal from "../components/modals/preview-modal";
import EditLyricLineModal from "../components/modals/edit-lyric-line-modal";
import ChordEditModal from "../components/modals/chord-edit-modal";
import MidiPlayer, { MidiPlayerRef } from "../modules/js-synth";
import MetadataForm from "../components/metadata/metadata-form";
import { useKaraokeStore } from "../store/useKaraokeStore";
import {
  useKeyboardControls,
  PlayerControls,
} from "../hooks/useKeyboardControls";
import { usePlaybackSync } from "../hooks/usePlaybackSync";
import { MidiParseResult } from "../lib/midi-tags-decode";
import { ChordEvent } from "../modules/midi-klyr-parser/lib/processor";
import TimelinePanel from "../components/panel/timeline-panel";
import VideoPlayer, { VideoPlayerRef } from "../modules/video/video-player";
import YoutubePlayer, {
  YouTubePlayerRef,
} from "../modules/youtube/youtube-player";

const LyrEditerPanel: React.FC = () => {
  // --- STATE & ACTIONS from ZUSTAND ---
  const {
    mode,
    lyricsData,
    metadata,
    audioSrc,
    videoSrc,
    youtubeId,
    selectedLineIndex,
    isPreviewing,
    previewLyrics,
    previewTimestamps,
    isEditModalOpen,
    isChordModalOpen,
    selectedChord,
    suggestedChordTick,
    actions,
  } = useKaraokeStore();

  // --- REFS ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<VideoPlayerRef | null>(null);
  const youtubeRef = useRef<YouTubePlayerRef | null>(null);
  const midiPlayerRef = useRef<MidiPlayerRef | null>(null);

  // --- PLAYER CONTROLS INTERFACE (ฉบับแก้ไขที่ถูกต้อง) ---
  const playerControls = useMemo<PlayerControls | null>(() => {
    if (!mode) return null;

    return {
      play: () => {
        switch (mode) {
          case "mp3":
            audioRef.current?.play();
            break;
          case "mp4":
            videoRef.current?.play();
            break;
          case "youtube":
            youtubeRef.current?.play();
            break;
          case "midi":
            midiPlayerRef.current?.play();
            break;
        }
      },
      pause: () => {
        switch (mode) {
          case "mp3":
            audioRef.current?.pause();
            break;
          case "mp4":
            videoRef.current?.pause();
            break;
          case "youtube":
            youtubeRef.current?.pause();
            break;
          case "midi":
            midiPlayerRef.current?.pause();
            break;
        }
      },
      seek: (time: number) => {
        switch (mode) {
          case "mp3":
            if (audioRef.current) audioRef.current.currentTime = time;
            break;
          case "mp4":
            videoRef.current?.seek(time);
            break;
          case "youtube":
            youtubeRef.current?.seek(time);
            break;
          case "midi":
            midiPlayerRef.current?.seek(time);
            break;
        }
      },
      getCurrentTime: () => {
        switch (mode) {
          case "mp3":
            return audioRef.current?.currentTime ?? 0;
          case "mp4":
            return videoRef.current?.getCurrentTime() ?? 0;
          case "youtube":
            return youtubeRef.current?.getCurrentTime() ?? 0;
          case "midi":
            return midiPlayerRef.current?.currentTick ?? 0;
          default:
            return 0;
        }
      },
      isPlaying: () => {
        switch (mode) {
          case "mp3":
            return !!audioRef.current && !audioRef.current.paused;
          case "mp4":
            return videoRef.current?.isPlaying() ?? false;
          case "youtube":
            return youtubeRef.current?.isPlaying() ?? false;
          case "midi":
            return midiPlayerRef.current?.isPlaying ?? false;
          default:
            return false;
        }
      },
    };
  }, [mode]); // <-- Dependency ที่ถูกต้องคือ [mode] เท่านั้น

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
      actions.openChordModal(undefined, playerControls?.getCurrentTime() ?? 0);
    }
  };

  const handleChordClick = (chord: ChordEvent) => {
    actions.openChordModal(chord);
  };

  const handleAddChordClick = (lineIndex: number) => {
    const firstWordOfLine = lyricsData.find((w) => w.lineIndex === lineIndex);
    let suggestedTick = 0;

    if (firstWordOfLine?.start !== null) {
      suggestedTick = firstWordOfLine?.start ?? 0;
    } else {
      suggestedTick = playerControls?.getCurrentTime() ?? 0;
    }

    if (
      suggestedTick === 0 &&
      (firstWordOfLine === undefined || firstWordOfLine.start === null)
    ) {
      suggestedTick = 1;
    }

    actions.openChordModal(undefined, Math.round(suggestedTick));
  };

  // --- HOOKS ---
  useKeyboardControls(playerControls, handleEditLine);
  usePlaybackSync(audioRef, videoRef, youtubeRef, midiPlayerRef);

  // --- RENDER ---
  if (!mode) {
    return (
      <main className="flex h-screen flex-col items-center justify-center bg-slate-100 text-slate-800">
        <h1 className="text-4xl font-bold mb-8">Karaoke Maker</h1>
        <div className="flex flex-wrap justify-center gap-4 p-4">
          <button
            onClick={() => actions.setMode("mp3")}
            className="px-8 py-4 bg-blue-500 text-white font-bold rounded-lg shadow-lg hover:bg-blue-600 transition-all"
          >
            Start with MP3
          </button>
          <button
            onClick={() => actions.setMode("mp4")}
            className="px-8 py-4 bg-purple-500 text-white font-bold rounded-lg shadow-lg hover:bg-purple-600 transition-all"
          >
            Start with MP4
          </button>
          <button
            onClick={() => actions.setMode("youtube")}
            className="px-8 py-4 bg-red-600 text-white font-bold rounded-lg shadow-lg hover:bg-red-700 transition-all"
          >
            Start with YouTube
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
      <div className="flex flex-col p-4 gap-4 overflow-hidden h-full">
        {/* Top Section */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          <div className="w-[70%] h-full">
            <LyricsPanel
              onWordClick={handleWordClick}
              onEditLine={handleEditLine}
              onStopTiming={handleStop}
              onRulerClick={handleRulerClick}
              onChordClick={handleChordClick}
              onAddChordClick={handleAddChordClick}
              currentPlaybackTime={playerControls?.getCurrentTime()}
              mode={mode}
            />
          </div>
          <div className="w-[30%] flex flex-col p-4 gap-6 bg-slate-200/50 border border-slate-300 rounded-lg">
            {mode === "mp3" && (
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
            )}
            {mode === "mp4" && (
              <div className="space-y-4">
                <VideoPlayer
                  ref={videoRef}
                  src={videoSrc}
                  onFileChange={(file) =>
                    actions.setVideoSrc(URL.createObjectURL(file), file.name)
                  }
                />
                <MetadataForm
                  metadata={metadata}
                  onMetadataChange={actions.setMetadata}
                />
              </div>
            )}
            {mode === "youtube" && (
              <div className="space-y-4">
                <YoutubePlayer
                  ref={youtubeRef}
                  youtubeId={youtubeId}
                  onUrlChange={(url) => actions.setYoutubeId(url)}
                />
                <MetadataForm
                  metadata={metadata}
                  onMetadataChange={actions.setMetadata}
                />
              </div>
            )}
            {mode === "midi" && (
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

        {/* <div className="h-[200px] mt-4 flex-shrink-0">
          <TimelinePanel />
        </div> */}
      </div>

      <footer className="w-full bg-slate-800 text-white p-2 text-center text-sm shadow-inner flex-shrink-0">
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
            actions.updateLine(selectedLineIndex, newText);
            actions.closeEditModal();
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
