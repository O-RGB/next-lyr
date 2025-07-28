"use client";

import React, { useRef, useMemo, useCallback } from "react";
import ControlPanel from "../panel/control-panel";
import LyricsPanel from "../panel/lyrics-panel";
import ChordEditModal from "../modals/chord";
import MidiPlayer, {
  MidiParseResult,
  MidiPlayerRef,
} from "../../modules/js-synth/player";
import MetadataForm from "../metadata/metadata-form";
import { useKaraokeStore } from "../../stores/karaoke-store";

import { ChordEvent } from "../../modules/midi-klyr-parser/lib/processor";
import YoutubePlayer, {
  YouTubePlayerRef,
} from "../../modules/youtube/youtube-player";
import VideoPlayer, { VideoPlayerRef } from "../../modules/video/video-player";
import LyricsPlayer from "../../lib/karaoke/lyrics";
import EditLyricLineModal from "../modals/edit-lyrics/edit-lyric-line-modal";
import { PlayerControls } from "@/hooks/useKeyboardControls";
import KeyboardRender from "./keybord-render";

const LyrEditerPanel: React.FC = () => {
  const mode = useKaraokeStore((state) => state.mode);
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const metadata = useKaraokeStore((state) => state.metadata);
  const audioSrc = useKaraokeStore((state) => state.audioSrc);
  const videoSrc = useKaraokeStore((state) => state.videoSrc);
  const youtubeId = useKaraokeStore((state) => state.youtubeId);

  const lyricsProcessed = useKaraokeStore((state) => state.lyricsProcessed);
  const isEditModalOpen = useKaraokeStore((state) => state.isEditModalOpen);
  const isChordModalOpen = useKaraokeStore((state) => state.isChordModalOpen);
  const selectedChord = useKaraokeStore((state) => state.selectedChord);
  const suggestedChordTick = useKaraokeStore(
    (state) => state.suggestedChordTick
  );
  const minChordTickRange = useKaraokeStore((state) => state.minChordTickRange);
  const maxChordTickRange = useKaraokeStore((state) => state.maxChordTickRange);
  const midiInfo = useKaraokeStore((state) => state.midiInfo);
  const actions = useKaraokeStore((state) => state.actions);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<VideoPlayerRef | null>(null);
  const youtubeRef = useRef<YouTubePlayerRef | null>(null);
  const midiPlayerRef = useRef<MidiPlayerRef | null>(null);

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
  }, [mode]);

  const handleStop = useCallback(() => {
    playerControls?.pause();
    playerControls?.seek(0);
    actions.stopTiming();
    actions.setPlaybackIndex(null);
    actions.setCurrentIndex(0);
    actions.setCorrectionIndex(null);
  }, [playerControls, actions]);

  const handleWordClick = useCallback(
    (index: number) => {
      const word = lyricsData.find((w) => w.index === index);
      if (word?.start !== null && playerControls) {
        playerControls.seek(word?.start ?? 0);
        if (!playerControls.isPlaying()) {
          playerControls.play();
        }
        actions.stopTiming();
      }
    },
    [lyricsData, playerControls, actions]
  );

  const handleEditLine = useCallback(
    (lineIndex: number) => {
      if (lineIndex === null || midiInfo === null) return;
      const { success, preRollTime } = actions.startEditLine(lineIndex);
      if (success && playerControls) {
        playerControls.seek(preRollTime);
        playerControls.play();
      }
    },
    [midiInfo, actions, playerControls]
  );

  const handleRulerClick = useCallback(
    (lineIndex: number, percentage: number, lineDuration: number) => {
      const firstWordOfLine = lyricsData.find((w) => w.lineIndex === lineIndex);
      if (firstWordOfLine && firstWordOfLine.start !== null) {
        const clickedTick = firstWordOfLine.start + lineDuration * percentage;
        actions.openChordModal(undefined, Math.round(clickedTick));
      } else {
        actions.openChordModal(
          undefined,
          playerControls?.getCurrentTime() ?? 0
        );
      }
    },
    [lyricsData, actions, playerControls]
  );

  const handleChordClick = useCallback(
    (chord: ChordEvent) => {
      actions.openChordModal(chord);
    },
    [actions]
  );

  const handleAddChordClick = useCallback(
    (lineIndex: number) => {
      const wordsInLine = lyricsData.filter((w) => w.lineIndex === lineIndex);
      const timedWordsInLine = wordsInLine.filter(
        (w) => w.start !== null && w.end !== null
      );

      let minLineTick: number | undefined;
      let maxLineTick: number | undefined;

      if (timedWordsInLine.length > 0) {
        minLineTick = Math.min(...timedWordsInLine.map((w) => w.start!));
        maxLineTick = Math.max(...timedWordsInLine.map((w) => w.end!));
      }

      let suggestedTick = playerControls?.getCurrentTime() ?? 0;

      if (minLineTick !== undefined && maxLineTick !== undefined) {
        suggestedTick = Math.max(
          minLineTick,
          Math.min(maxLineTick, suggestedTick)
        );
      } else {
        if (suggestedTick === 0) {
          suggestedTick = 1;
        }
      }

      actions.openChordModal(
        undefined,
        Math.round(suggestedTick),
        minLineTick,
        maxLineTick
      );
    },
    [lyricsData, actions, playerControls]
  );

  if (!mode) {
    return (
      <main className="flex h-screen flex-col items-center justify-center bg-slate-100 text-slate-800">
        <h1 className="text-4xl font-bold mb-8">Karaoke Maker</h1>
        <div className="flex flex-wrap justify-center gap-2 p-4">
          <button
            onClick={() => actions.setMode("mp3")}
            className="px-8 py-4 bg-blue-500 text-white font-bold rounded-lg shadow-lg hover:bg-blue-600 transition-all"
          >
            Start with MP3{" "}
          </button>
          <button
            onClick={() => actions.setMode("mp4")}
            className="px-8 py-4 bg-purple-500 text-white font-bold rounded-lg shadow-lg hover:bg-purple-600 transition-all"
          >
            Start with MP4{" "}
          </button>
          <button
            onClick={() => actions.setMode("youtube")}
            className="px-8 py-4 bg-red-600 text-white font-bold rounded-lg shadow-lg hover:bg-red-700 transition-all"
          >
            Start with YouTube{" "}
          </button>
          <button
            onClick={() => actions.setMode("midi")}
            className="px-8 py-4 bg-green-500 text-white font-bold rounded-lg shadow-lg hover:bg-green-600 transition-all"
          >
            Start with MIDI{" "}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[calc(100vh-36px)]">
      <KeyboardRender
        audioRef={audioRef}
        handleEditLine={handleEditLine}
        midiPlayerRef={midiPlayerRef}
        playerControls={playerControls}
        videoRef={videoRef}
        youtubeRef={youtubeRef}
      ></KeyboardRender>
      <div className="flex gap-2 overflow-hidden w-full h-full p-4">
        {/* Top Section */}
        <div className="w-full flex flex-col gap-2 overflow-hidden">
          <div className="h-[70%]">
            <LyricsPanel
              onWordClick={handleWordClick}
              onEditLine={handleEditLine}
              onStopTiming={handleStop}
              onRulerClick={handleRulerClick}
              onChordClick={handleChordClick}
              onAddChordClick={handleAddChordClick}
              mode={mode}
            />
          </div>
          {/* Real-time Preview Section */}
          <div className="h-[30%] bg-gray-400 rounded-lg flex items-center justify-center">
            {(lyricsProcessed?.ranges.length ?? 0) > 0 && lyricsProcessed && (
              <LyricsPlayer lyricsProcessed={lyricsProcessed} />
            )}
          </div>
        </div>
        <div className="relative p-4 gap-6 bg-slate-200/50 border border-slate-300 rounded-lg h-full overflow-auto">
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
                  actions.setMetadata(data.info);
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
      <EditLyricLineModal
        open={isEditModalOpen}
        lyricsData={lyricsData}
        handleEditLine={handleEditLine}
      />
      <ChordEditModal
        open={isChordModalOpen}
        initialChord={selectedChord || undefined}
        suggestedTick={suggestedChordTick || undefined}
        minTick={minChordTickRange ?? undefined}
        maxTick={maxChordTickRange ?? undefined}
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
    </main>
  );
};

export default LyrEditerPanel;
