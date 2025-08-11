"use client";

import React, {
  useRef,
  useMemo,
  useCallback,
  useState,
  useEffect,
} from "react";
import LyricsPanel from "../panel/lyrics-panel";
import ChordEditModal from "../modals/chord";
import MetadataForm from "../metadata/metadata-form";
import { useKaraokeStore } from "../../stores/karaoke-store";
import { ChordEvent } from "../../modules/midi-klyr-parser/lib/processor";
import EditLyricLineModal from "../modals/edit-lyrics/edit-lyric-line-modal";
import { PlayerControls } from "@/hooks/useKeyboardControls";
import KeyboardRender from "./keybord-render";
import LyricsPlayer from "../lyrics/karaoke-lyrics";
import DonateModal from "../modals/donate";
import PlayerHost, { PlayerRef } from "./player-host";
import { FaMusic, FaListAlt } from "react-icons/fa";
import { FloatingButtonGroup } from "../common/floating-button";
import ModalCommon from "../common/modal";

const LyrEditerPanel: React.FC = () => {
  const projectId = useKaraokeStore((state) => state.projectId);
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
  const duration = useKaraokeStore((state) => state.playerState.duration);
  const rawFile = useKaraokeStore((state) => state.playerState.rawFile);

  const [playerControls, setControls] = useState<PlayerControls | null>(null);
  const playerRef = useRef<PlayerRef>(null);
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [isPlayerReady, setIsPlayerReady] = useState(false);

  useEffect(() => {
    setIsPlayerReady(false);
  }, [projectId, rawFile]);

  useEffect(() => {
    if (mode && playerRef.current && isPlayerReady) {
      setControls({
        play: () => playerRef.current?.play(),
        pause: () => playerRef.current?.pause(),
        seek: (time) => playerRef.current?.seek(time),
        getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
        isPlaying: () => playerRef.current?.isPlaying() ?? false,
      });
    }
  }, [mode, isPlayerReady, duration]);

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
      if (word?.start !== null && playerRef.current) {
        actions.setIsChordPanelAutoScrolling(true);
        playerRef.current.seek(word?.start ?? 0);
        if (!playerRef.current.isPlaying()) {
          playerRef.current.play();
        }
        actions.stopTiming();
      }
    },
    [lyricsData, actions]
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

  const floatingActions = [
    {
      icon: <FaMusic size={24} />,
      onClick: () => setIsPreviewOpen(true),
      label: "Lyrics Preview",
      className: "bg-purple-600",
    },
    {
      icon: <FaListAlt size={24} />,
      onClick: () => setIsMetadataOpen(true),
      label: "Metadata",
      className: "bg-indigo-600",
    },
  ];

  return (
    <main className="flex flex-col h-[calc(100vh-36px)]">
      <DonateModal />
      <KeyboardRender
        playerControls={playerControls}
        handleEditLine={handleEditLine}
      />

      {projectId ? (
        <div className="flex flex-col md:flex-row flex-grow w-full h-full overflow-hidden">
          <div className="flex-grow flex flex-col overflow-hidden h-full order-2 md:order-1">
            {mode ? (
              <>
                <div className="h-full md:h-[70%]">
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
                </div>
                <div className="hidden md:flex h-[30%] bg-gray-400  items-center justify-center">
                  {lyricsProcessed?.ranges.length && lyricsProcessed ? (
                    <LyricsPlayer lyricsProcessed={lyricsProcessed} />
                  ) : (
                    <p className="text-white">Lyrics Preview</p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100 ">
                <p className="text-gray-500">
                  Please select a mode from the File menu to begin.
                </p>
              </div>
            )}
          </div>

          <div className="md:w-[25%] p-2 md:p-4 md:bg-slate-200/50 md:border-l md:border-slate-300 md:h-full md:overflow-auto order-3 md:order-1">
            {mode ? (
              <>
                <PlayerHost
                  key={projectId}
                  ref={playerRef}
                  onReady={() => setIsPlayerReady(true)}
                />
                <div className="hidden md:block mt-4">
                  <MetadataForm
                    metadata={metadata}
                    onMetadataChange={actions.setMetadata}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100  md:bg-transparent">
                <p className="text-gray-500 text-center">
                  Control Panel will appear here after selecting a mode.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <h2 className="text-2xl font-semibold mb-2">
              Welcome to Lyrics Editor
            </h2>
            <p>Please open a project or create a new one to get started.</p>
          </div>
        </div>
      )}

      <div className="md:hidden">
        <FloatingButtonGroup actions={floatingActions} />
      </div>

      <ModalCommon
        open={isMetadataOpen}
        onClose={() => setIsMetadataOpen(false)}
        title="Metadata"
        footer={null}
      >
        <MetadataForm
          metadata={metadata}
          onMetadataChange={actions.setMetadata}
        />
      </ModalCommon>

      <ModalCommon
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Lyrics Preview"
        footer={null}
        classNames={{ modal: "!bg-gray-700" }}
      >
        <div className="flex flex-col gap-4">
          <div className="h-48 flex items-center justify-center">
            {lyricsProcessed?.ranges.length && lyricsProcessed ? (
              <LyricsPlayer
                lyricsProcessed={lyricsProcessed}
                playerControls={
                  <PlayerHost
                    key={projectId}
                    ref={playerRef}
                    onReady={() => setIsPlayerReady(true)}
                  />
                }
              />
            ) : (
              <p className="text-white">Lyrics Preview</p>
            )}
          </div>
        </div>
      </ModalCommon>

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
