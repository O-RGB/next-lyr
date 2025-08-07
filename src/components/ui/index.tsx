"use client";

import React, { useRef, useMemo, useCallback } from "react";
import LyricsPanel from "../panel/lyrics-panel";
import ChordEditModal from "../modals/chord";
import MetadataForm from "../metadata/metadata-form";
import { useKaraokeStore } from "../../stores/karaoke-store";
import {
  ChordEvent,
  SongInfo,
} from "../../modules/midi-klyr-parser/lib/processor";
import EditLyricLineModal from "../modals/edit-lyrics/edit-lyric-line-modal";
import { PlayerControls } from "@/hooks/useKeyboardControls";
import KeyboardRender from "./keybord-render";
import LyricsPlayer from "../lyrics/karaoke-lyrics";
import DonateModal from "../modals/donate";
import PlayerHost, { PlayerRef } from "./player-host";

const LyrEditerPanel: React.FC = () => {
  const mode = useKaraokeStore((state) => state.mode);
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const metadata = useKaraokeStore((state) => state.metadata);
  const lyricsProcessed = useKaraokeStore((state) => state.lyricsProcessed);
  const isEditModalOpen = useKaraokeStore((state) => state.isEditModalOpen);
  const isChordModalOpen = useKaraokeStore((state) => state.isChordModalOpen);
  const selectedChord = useKaraokeStore((state) => state.selectedChord);
  const suggestedChordTick = useKaraokeStore(
    (state) => state.suggestedChordTick
  );
  const minChordTickRange = useKaraokeStore((state) => state.minChordTickRange);
  const maxChordTickRange = useKaraokeStore((state) => state.maxChordTickRange);
  const actions = useKaraokeStore((state) => state.actions);

  const playerRef = useRef<PlayerRef>(null);

  const playerControls = useMemo<PlayerControls | null>(() => {
    if (!mode || !playerRef.current) return null;

    return {
      play: () => playerRef.current?.play(),
      pause: () => playerRef.current?.pause(),
      seek: (time: number) => playerRef.current?.seek(time),
      getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
      isPlaying: () => playerRef.current?.isPlaying() ?? false,
    };
  }, [mode, playerRef.current]);

  const handleStop = useCallback(() => {
    playerControls?.pause();
    playerControls?.seek(0);
    actions.setIsPlaying(false);
    actions.stopTiming();
    actions.setPlaybackIndex(null);
    actions.setCurrentIndex(0);
    actions.setCorrectionIndex(null);
  }, [playerControls, actions]);

  const handleWordClick = useCallback(
    (index: number) => {
      const word = lyricsData.find((w) => w.index === index);
      if (word?.start !== null && playerControls) {
        actions.setIsChordPanelAutoScrolling(true);
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
      const { success, preRollTime } = actions.startEditLine(lineIndex);
      if (success && playerControls) {
        actions.setIsPlaying(true);

        playerControls.seek(preRollTime);
        playerControls.play();
      }
    },
    [actions, playerControls]
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

  const handleChordBlockClick = useCallback(
    (tick: number) => {
      if (playerControls) {
        playerControls.seek(tick);
        if (!playerControls.isPlaying()) {
          playerControls.play();
        }
      }
    },
    [playerControls]
  );

  const handleAddChordAtCurrentTime = useCallback(
    (setTick?: number) => {
      const tick = setTick
        ? setTick
        : Math.round(playerControls?.getCurrentTime() ?? 0);
      actions.openChordModal(undefined, tick);
    },
    [actions, playerControls]
  );

  const handleDeleteChord = useCallback(
    (tick: number) => {
      if (window.confirm("Are you sure you want to delete this chord?")) {
        actions.deleteChord(tick);
      }
    },
    [actions]
  );

  return (
    <main className="flex h-[calc(100vh-36px)]">
      <DonateModal />
      <KeyboardRender
        playerControls={playerControls}
        handleEditLine={handleEditLine}
      />

      <div className="flex gap-2 overflow-hidden w-full h-full p-4">
        {/* Left Section */}
        <div className="w-full flex flex-col gap-2 overflow-hidden">
          <div className="h-[70%]">
            {mode ? (
              <LyricsPanel
                onWordClick={handleWordClick}
                onEditLine={handleEditLine}
                onStopTiming={handleStop}
                onRulerClick={handleRulerClick}
                onChordClick={handleChordClick}
                onAddChordClick={handleAddChordClick}
                onChordBlockClick={handleChordBlockClick}
                onAddChordAtCurrentTime={handleAddChordAtCurrentTime}
                onDeleteChord={handleDeleteChord}
                mode={mode}
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
                <p className="text-gray-500">
                  Please select a mode from the File menu to begin.
                </p>
              </div>
            )}
          </div>
          {/* Real-time Preview Section */}
          <div className="h-[30%] bg-gray-400 rounded-lg flex items-center justify-center">
            {lyricsProcessed?.ranges.length && lyricsProcessed ? (
              <LyricsPlayer lyricsProcessed={lyricsProcessed} />
            ) : (
              <p className="text-white">Lyrics Preview</p>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="w-[40%] relative p-4 gap-6 bg-slate-200/50 border border-slate-300 rounded-lg h-full overflow-auto">
          {mode ? (
            <>
              <PlayerHost ref={playerRef} />
              <div className="mt-4">
                <MetadataForm
                  metadata={metadata}
                  onMetadataChange={actions.setMetadata}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 text-center">
                Control Panel will appear here after selecting a mode.
              </p>
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
