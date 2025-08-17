"use client";

import React, {
  useRef,
  useCallback,
  useState,
  useEffect,
  useMemo,
} from "react";
import LyricsPanel from "../panel/lyrics-panel";
import ChordEditModal from "../modals/chord";
import MetadataForm from "../metadata/metadata-form";
import EditLyricLineModal from "../modals/edit-lyrics/edit-lyric-line-modal";
import KeyboardRender from "./keybord-render";
import LyricsPlayer from "../lyrics/karaoke-lyrics";
import DonateModal from "../modals/donate";
import ModalCommon from "../common/modal";
import PlayerHost, { PlayerRef } from "./player-host";
import { useKaraokeStore } from "../../stores/karaoke-store";
import { ChordEvent } from "../../modules/midi-klyr-parser/lib/processor";
import { PlayerControls } from "@/hooks/useKeyboardControls";
import { FaMusic, FaListAlt } from "react-icons/fa";
import { FloatingButtonGroup } from "../common/floating-button";
import { useTimerWorker } from "@/hooks/useTimerWorker";

const FLOATING_ACTIONS_CONFIG = [
  {
    icon: <FaMusic size={24} />,
    label: "Lyrics Preview",
    className: "bg-purple-600",
    action: "preview" as const,
  },
  {
    icon: <FaListAlt size={24} />,
    label: "Metadata",
    className: "bg-indigo-600",
    action: "metadata" as const,
  },
];

const usePlayerSetup = (
  projectId: number | null,
  rawFile: File | null,
  isPlayerReady: boolean,
  mode: string | null,
  duration: number | null
) => {
  const [playerControls, setControls] = useState<PlayerControls | null>(null);
  const playerRef = useRef<PlayerRef>(null);
  const timerControls = useTimerWorker();

  useEffect(() => {
    setControls(null);
    timerControls.resetTimer();
  }, [projectId, rawFile, timerControls]);

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

  return { playerControls, playerRef, timerControls };
};

const useModalState = () => {
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const closeMetadata = useCallback(() => setIsMetadataOpen(false), []);
  const closePreview = useCallback(() => setIsPreviewOpen(false), []);
  const openMetadata = useCallback(() => setIsMetadataOpen(true), []);
  const openPreview = useCallback(() => setIsPreviewOpen(true), []);

  return {
    isMetadataOpen,
    isPreviewOpen,
    closeMetadata,
    closePreview,
    openMetadata,
    openPreview,
  };
};

const usePlayerHandlers = (
  lyricsData: any[],
  playerControls: PlayerControls | null,
  actions: any,
  mode: string | null
) => {
  const handleStop = useCallback(() => {
    if (!playerControls) return;

    playerControls.pause();
    playerControls.seek(0);
    actions.setIsPlaying(false);
    actions.stopTiming();
    actions.setPlaybackIndex(null);
    actions.setCurrentIndex(0);
    actions.setCorrectionIndex(null);
  }, [playerControls, actions]);

  const handleWordClick = useCallback(
    (index: number) => {
      const word = lyricsData.find((w) => w.index === index);
      if (!word || !playerControls) return;

      const seekTo = calculateSeekTime(word, lyricsData, mode, index);

      if (seekTo !== null) {
        actions.setIsChordPanelAutoScrolling(true);
        actions.stopTiming();
        playerControls.seek(seekTo);

        if (!playerControls.isPlaying()) {
          playerControls.play();
        }
      }
    },
    [lyricsData, playerControls, actions, mode]
  );

  const handleEditLine = useCallback(
    (lineIndex: number) => {
      if (!playerControls) return;

      const { success, preRollTime } = actions.startEditLine(lineIndex);
      if (success) {
        actions.setIsPlaying(true);
        playerControls.seek(preRollTime);
        playerControls.play();
      }
    },
    [actions, playerControls]
  );

  return { handleStop, handleWordClick, handleEditLine };
};

const calculateSeekTime = (
  word: any,
  lyricsData: any[],
  mode: string | null,
  index: number
): number | null => {
  if (mode === "midi") {
    return word.start;
  }

  if (word.start !== null) {
    return word.start;
  }

  const lastTimedWord = lyricsData
    .slice(0, index)
    .filter((w) => w.start !== null)
    .pop();

  return lastTimedWord?.start ?? 0;
};

const LyrEditerPanel: React.FC = () => {
  const projectId = useKaraokeStore((state) => state.projectId);
  const mode = useKaraokeStore((state) => state.mode);
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const metadata = useKaraokeStore((state) => state.metadata);
  const lyricsProcessed = useKaraokeStore((state) => state.lyricsProcessed);
  const duration = useKaraokeStore((state) => state.playerState.duration);
  const rawFile = useKaraokeStore((state) => state.playerState.rawFile);

  const isEditModalOpen = useKaraokeStore((state) => state.isEditModalOpen);
  const isChordModalOpen = useKaraokeStore((state) => state.isChordModalOpen);
  const selectedChord = useKaraokeStore((state) => state.selectedChord);
  const suggestedChordTick = useKaraokeStore(
    (state) => state.suggestedChordTick
  );
  const minChordTickRange = useKaraokeStore((state) => state.minChordTickRange);
  const maxChordTickRange = useKaraokeStore((state) => state.maxChordTickRange);

  const actions = useKaraokeStore((state) => state.actions);

  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const modalState = useModalState();

  const { playerControls, playerRef, timerControls } = usePlayerSetup(
    projectId,
    rawFile,
    isPlayerReady,
    mode,
    duration
  );

  const { handleStop, handleWordClick, handleEditLine } = usePlayerHandlers(
    lyricsData,
    playerControls,
    actions,
    mode
  );

  const chordHandlers = useMemo(
    () => ({
      handleRulerClick: (
        lineIndex: number,
        percentage: number,
        lineDuration: number
      ) => {
        const firstWordOfLine = lyricsData.find(
          (w) => w.lineIndex === lineIndex
        );
        if (firstWordOfLine?.start !== null) {
          const clickedTick =
            (firstWordOfLine?.start ?? 0) + lineDuration * percentage;
          actions.openChordModal(undefined, Math.round(clickedTick));
        } else {
          actions.openChordModal(
            undefined,
            playerControls?.getCurrentTime() ?? 0
          );
        }
      },

      handleChordClick: (chord: ChordEvent) => {
        actions.openChordModal(chord);
      },

      handleAddChordClick: (lineIndex: number) => {
        const wordsInLine = lyricsData.filter((w) => w.lineIndex === lineIndex);
        const timedWordsInLine = wordsInLine.filter(
          (w) => w.start !== null && w.end !== null
        );

        const { minLineTick, maxLineTick } =
          timedWordsInLine.length > 0
            ? {
                minLineTick: Math.min(...timedWordsInLine.map((w) => w.start!)),
                maxLineTick: Math.max(...timedWordsInLine.map((w) => w.end!)),
              }
            : { minLineTick: undefined, maxLineTick: undefined };

        let suggestedTick = playerControls?.getCurrentTime() ?? 0;

        if (minLineTick !== undefined && maxLineTick !== undefined) {
          suggestedTick = Math.max(
            minLineTick,
            Math.min(maxLineTick, suggestedTick)
          );
        } else if (suggestedTick === 0) {
          suggestedTick = 1;
        }

        actions.openChordModal(
          undefined,
          Math.round(suggestedTick),
          minLineTick,
          maxLineTick
        );
      },

      handleChordBlockClick: (tick: number) => {
        if (playerControls) {
          playerControls.seek(tick);
          if (!playerControls.isPlaying()) {
            playerControls.play();
          }
        }
      },

      handleAddChordAtCurrentTime: (setTick?: number) => {
        const tick =
          setTick ?? Math.round(playerControls?.getCurrentTime() ?? 0);
        actions.openChordModal(undefined, tick);
      },

      handleDeleteChord: (tick: number) => {
        if (window.confirm("Are you sure you want to delete this chord?")) {
          actions.deleteChord(tick);
        }
      },
    }),
    [lyricsData, actions, playerControls]
  );

  const floatingActions = useMemo(
    () =>
      FLOATING_ACTIONS_CONFIG.map((config) => ({
        icon: config.icon,
        onClick:
          config.action === "preview"
            ? modalState.openPreview
            : modalState.openMetadata,
        label: config.label,
        className: config.className,
      })),
    [modalState.openPreview, modalState.openMetadata]
  );

  const renderMainContent = () => {
    if (!projectId) {
      return (
        <div className="flex-grow flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <h2 className="text-2xl font-semibold mb-2">
              Welcome to Lyrics Editor
            </h2>
            <p>Please open a project or create a new one to get started.</p>
          </div>
        </div>
      );
    }

    if (!mode) {
      return (
        <div className="flex flex-col md:flex-row flex-grow w-full h-full overflow-hidden">
          <div className="flex-grow flex items-center justify-center bg-gray-100">
            <p className="text-gray-500">
              Please select a mode from the File menu to begin.
            </p>
          </div>
          <div className="md:w-[25%] p-2 md:p-4 md:bg-slate-200/50 md:border-l md:border-slate-300">
            <div className="flex items-center justify-center h-full bg-gray-100 md:bg-transparent">
              <p className="text-gray-500 text-center">
                Control Panel will appear here after selecting a mode.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col md:flex-row flex-grow w-full h-full overflow-hidden">
        <div className="flex-grow flex flex-col overflow-hidden h-full order-2 md:order-1">
          <div className="h-full md:h-[70%]">
            <LyricsPanel
              onWordClick={handleWordClick}
              onEditLine={handleEditLine}
              onStopTiming={handleStop}
              onRulerClick={chordHandlers.handleRulerClick}
              onChordClick={chordHandlers.handleChordClick}
              onAddChordClick={chordHandlers.handleAddChordClick}
              onChordBlockClick={chordHandlers.handleChordBlockClick}
              onAddChordAtCurrentTime={
                chordHandlers.handleAddChordAtCurrentTime
              }
              onDeleteChord={chordHandlers.handleDeleteChord}
              mode={mode}
            />
          </div>

          <div className="hidden md:flex h-[30%] bg-gray-400 items-center justify-center">
            {lyricsProcessed?.ranges.length ? (
              <LyricsPlayer lyricsProcessed={lyricsProcessed} />
            ) : (
              <p className="text-white">Lyrics Preview</p>
            )}
          </div>
        </div>

        <div className="md:w-[25%] p-2 md:p-4 md:bg-slate-200/50 md:border-l md:border-slate-300 md:h-full md:overflow-auto order-3 md:order-1">
          <PlayerHost
            key={projectId}
            ref={playerRef}
            onReady={() => setIsPlayerReady(true)}
            timerControls={timerControls}
          />
          <div className="hidden md:block mt-4">
            <MetadataForm
              metadata={metadata}
              onMetadataChange={actions.setMetadata}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="flex flex-col h-[calc(100vh-36px)]">
      <DonateModal />
      <KeyboardRender
        playerControls={playerControls}
        handleEditLine={handleEditLine}
      />

      {renderMainContent()}

      <div className="md:hidden">
        <FloatingButtonGroup actions={floatingActions} />
      </div>

      {/* Modals */}
      <ModalCommon
        open={modalState.isMetadataOpen}
        onClose={modalState.closeMetadata}
        title="Metadata"
        footer={null}
      >
        <MetadataForm
          metadata={metadata}
          onMetadataChange={actions.setMetadata}
        />
      </ModalCommon>

      <ModalCommon
        open={modalState.isPreviewOpen}
        onClose={modalState.closePreview}
        title="Lyrics Preview"
        footer={null}
        classNames={{ modal: "!bg-gray-700" }}
      >
        <div className="flex flex-col gap-4">
          <div className="h-48 flex items-center justify-center">
            {lyricsProcessed?.ranges.length ? (
              <LyricsPlayer
                lyricsProcessed={lyricsProcessed}
                playerControls={
                  <PlayerHost
                    key={projectId}
                    ref={playerRef}
                    onReady={() => setIsPlayerReady(true)}
                    timerControls={timerControls}
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
