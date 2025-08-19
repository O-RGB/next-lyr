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

// Custom hook for managing player setup and controls
const usePlayerSetup = (
  projectId: string | null,
  rawFile: File | null,
  isPlayerReady: boolean,
  mode: string | null,
  duration: number | null
) => {
  console.log("[usePlayerSetup] Hook called with:", {
    projectId,
    isPlayerReady,
    mode,
    duration,
  });
  const [playerControls, setControls] = useState<PlayerControls | null>(null);
  const playerRef = useRef<PlayerRef>(null);
  const timerControls = useTimerWorker();

  // Effect to reset player when project or file changes
  useEffect(() => {
    console.log(
      "[usePlayerSetup] useEffect [projectId, rawFile] triggered. Project:",
      projectId,
      "File:",
      rawFile?.name
    );
    console.log(
      "[usePlayerSetup] Project/file changed, stopping timer and resetting controls."
    );
    setControls(null);
    timerControls.forceStopTimer();
  }, [projectId, rawFile, timerControls]);

  // Effect to stop timer when mode changes
  useEffect(() => {
    console.log("[usePlayerSetup] useEffect [mode] triggered. New mode:", mode);
    if (mode) {
      console.log("[usePlayerSetup] Mode changed, stopping timer.");
      timerControls.forceStopTimer();
    }
  }, [mode, timerControls]);

  // Effect to set up player controls when ready
  useEffect(() => {
    console.log(
      "[usePlayerSetup] useEffect [mode, isPlayerReady, duration] triggered.",
      { mode, isPlayerReady, duration }
    );
    if (mode && playerRef.current && isPlayerReady) {
      console.log("[usePlayerSetup] Conditions met. Setting player controls.");
      setControls({
        play: () => playerRef.current?.play(),
        pause: () => playerRef.current?.pause(),
        seek: (time) => playerRef.current?.seek(time),
        getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
        isPlaying: () => playerRef.current?.isPlaying() ?? false,
      });
    } else {
      console.log("[usePlayerSetup] Conditions not met for setting controls.");
    }
  }, [mode, isPlayerReady, duration]);

  return { playerControls, playerRef, timerControls };
};

// Custom hook for managing modal states
const useModalState = () => {
  console.log("[useModalState] Hook initialized.");
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const closeMetadata = useCallback(() => {
    console.log("[useModalState] Closing metadata modal.");
    setIsMetadataOpen(false);
  }, []);
  const closePreview = useCallback(() => {
    console.log("[useModalState] Closing preview modal.");
    setIsPreviewOpen(false);
  }, []);
  const openMetadata = useCallback(() => {
    console.log("[useModalState] Opening metadata modal.");
    setIsMetadataOpen(true);
  }, []);
  const openPreview = useCallback(() => {
    console.log("[useModalState] Opening preview modal.");
    setIsPreviewOpen(true);
  }, []);

  return {
    isMetadataOpen,
    isPreviewOpen,
    closeMetadata,
    closePreview,
    openMetadata,
    openPreview,
  };
};

// Custom hook for player action handlers
const usePlayerHandlers = (
  lyricsData: any[],
  playerControls: PlayerControls | null,
  actions: any,
  mode: string | null
) => {
  console.log("[usePlayerHandlers] Hook called. Setting up handlers.");

  const handleStop = useCallback(() => {
    console.log("[handleStop] Stop requested.");
    if (!playerControls) {
      console.warn("[handleStop] Aborted: playerControls not available.");
      return;
    }

    console.log("[handleStop] Executing stop actions.");
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
      console.log(`[handleWordClick] Word clicked with index: ${index}.`);
      const word = lyricsData.find((w) => w.index === index);

      if (!word || !playerControls) {
        console.warn(
          "[handleWordClick] Aborted: Word data or playerControls not available.",
          { word, playerControls }
        );
        return;
      }

      console.log("[handleWordClick] Found word data:", word);
      const seekTo = calculateSeekTime(word, lyricsData, mode, index);
      console.log(`[handleWordClick] Calculated seek time: ${seekTo}.`);

      if (seekTo !== null) {
        console.log("[handleWordClick] Seeking player to", seekTo);
        actions.setIsChordPanelAutoScrolling(true);
        actions.stopTiming();
        playerControls.seek(seekTo);

        if (!playerControls.isPlaying()) {
          console.log("[handleWordClick] Player was paused, now playing.");
          playerControls.play();
        }
      } else {
        console.log("[handleWordClick] No valid seek time calculated.");
      }
    },
    [lyricsData, playerControls, actions, mode]
  );

  const handleEditLine = useCallback(
    (lineIndex: number) => {
      console.log(
        `[handleEditLine] Edit line requested for index: ${lineIndex}.`
      );
      if (!playerControls) {
        console.warn("[handleEditLine] Aborted: playerControls not available.");
        return;
      }

      const { success, preRollTime } = actions.startEditLine(lineIndex);
      console.log(
        `[handleEditLine] startEditLine action result: success=${success}, preRollTime=${preRollTime}`
      );
      if (success) {
        console.log(
          "[handleEditLine] Starting edit pre-roll. Seeking to:",
          preRollTime
        );
        actions.setIsPlaying(true);
        playerControls.seek(preRollTime);
        playerControls.play();
      }
    },
    [actions, playerControls]
  );

  return { handleStop, handleWordClick, handleEditLine };
};

// Helper function to calculate seek time
const calculateSeekTime = (
  word: any,
  lyricsData: any[],
  mode: string | null,
  index: number
): number | null => {
  console.log(
    "[calculateSeekTime] Calculating seek time for word index:",
    index,
    "in mode:",
    mode
  );

  if (mode === "midi") {
    console.log(
      "[calculateSeekTime] Mode is 'midi', returning word.start:",
      word.start
    );
    return word.start;
  }

  if (word.start !== null) {
    console.log(
      "[calculateSeekTime] Word has a start time, returning:",
      word.start
    );
    return word.start;
  }

  console.log(
    "[calculateSeekTime] Word has no start time. Finding last timed word."
  );
  const lastTimedWord = lyricsData
    .slice(0, index)
    .filter((w) => w.start !== null)
    .pop();

  const result = lastTimedWord?.start ?? 0;
  console.log(
    "[calculateSeekTime] Found last timed word:",
    lastTimedWord,
    "Returning its start time or 0:",
    result
  );
  return result;
};

// Main Component
const LyrEditerPanel: React.FC = () => {
  console.log("[LyrEditerPanel] Component rendering...");

  // State from Zustand store
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

  console.log("[LyrEditerPanel] State from store:", {
    projectId,
    mode,
    duration,
    isEditModalOpen,
    isChordModalOpen,
  });

  // Local state
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const modalState = useModalState();

  console.log("[LyrEditerPanel] Local state isPlayerReady:", isPlayerReady);

  // Hooks
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

  // Memoized chord handlers
  const chordHandlers = useMemo(() => {
    console.log(
      "[LyrEditerPanel] Re-memoizing chordHandlers. Dependencies changed."
    );
    return {
      handleRulerClick: (
        lineIndex: number,
        percentage: number,
        lineDuration: number
      ) => {
        console.log("[chordHandlers.handleRulerClick] Fired:", {
          lineIndex,
          percentage,
          lineDuration,
        });
        const firstWordOfLine = lyricsData.find(
          (w) => w.lineIndex === lineIndex
        );
        if (firstWordOfLine?.start !== null) {
          const clickedTick =
            (firstWordOfLine?.start ?? 0) + lineDuration * percentage;
          console.log(
            "[chordHandlers.handleRulerClick] Opening chord modal with calculated tick:",
            clickedTick
          );
          actions.openChordModal(undefined, Math.round(clickedTick));
        } else {
          const currentTime = playerControls?.getCurrentTime() ?? 0;
          console.log(
            "[chordHandlers.handleRulerClick] No timed word in line. Opening chord modal at current time:",
            currentTime
          );
          actions.openChordModal(undefined, currentTime);
        }
      },

      handleChordClick: (chord: ChordEvent) => {
        console.log(
          "[chordHandlers.handleChordClick] Fired with chord:",
          chord
        );
        actions.openChordModal(chord);
      },

      handleAddChordClick: (lineIndex: number) => {
        console.log(
          "[chordHandlers.handleAddChordClick] Fired for line index:",
          lineIndex
        );
        // ... (existing logic is complex but side-effect free until the action call)
        // For brevity, logging the final action call
        // The original logic is preserved.
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
        console.log(
          "[chordHandlers.handleAddChordClick] Opening chord modal with suggestedTick:",
          suggestedTick,
          "Range:",
          { minLineTick, maxLineTick }
        );
        actions.openChordModal(
          undefined,
          Math.round(suggestedTick),
          minLineTick,
          maxLineTick
        );
      },

      handleChordBlockClick: (tick: number) => {
        console.log(
          "[chordHandlers.handleChordBlockClick] Fired. Seeking to tick:",
          tick
        );
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
        console.log(
          "[chordHandlers.handleAddChordAtCurrentTime] Fired. Opening modal for tick:",
          tick
        );
        actions.openChordModal(undefined, tick);
      },

      handleDeleteChord: (tick: number) => {
        console.log("[chordHandlers.handleDeleteChord] Fired for tick:", tick);
        if (window.confirm("Are you sure you want to delete this chord?")) {
          console.log(
            "[chordHandlers.handleDeleteChord] User confirmed deletion."
          );
          actions.deleteChord(tick);
        } else {
          console.log(
            "[chordHandlers.handleDeleteChord] User canceled deletion."
          );
        }
      },
    };
  }, [lyricsData, actions, playerControls]);

  // Memoized floating actions
  const floatingActions = useMemo(() => {
    console.log("[LyrEditerPanel] Re-memoizing floatingActions.");
    return FLOATING_ACTIONS_CONFIG.map((config) => ({
      icon: config.icon,
      onClick: () => {
        console.log(
          `[floatingActions.onClick] Action '${config.action}' triggered.`
        );
        if (config.action === "preview") {
          modalState.openPreview();
        } else {
          modalState.openMetadata();
        }
      },
      label: config.label,
      className: config.className,
    }));
  }, [modalState.openPreview, modalState.openMetadata]);

  // Render function for main content area
  const renderMainContent = () => {
    console.log("[renderMainContent] Determining which content to render.");
    if (!projectId) {
      console.log(
        "[renderMainContent] No project ID. Rendering welcome screen."
      );
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
      console.log(
        "[renderMainContent] No mode selected. Rendering mode selection prompt."
      );
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

    console.log(
      "[renderMainContent] Project and mode available. Rendering main editor panel."
    );
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
            onReady={() => {
              console.log("[PlayerHost.onReady] Player is now ready.");
              setIsPlayerReady(true);
            }}
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

  // Main component return
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
                  // Note: Re-rendering PlayerHost here might create a new instance.
                  // For logging purposes, this is acceptable. In a real app,
                  // you might want to share the player instance differently.
                  <PlayerHost
                    key={`${projectId}-preview`} // Use a different key
                    onReady={() =>
                      console.log(
                        "[PlayerHost.onReady] Preview player is ready."
                      )
                    }
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
          console.log("[ChordEditModal.onSave] Saving chord:", chord);
          if (selectedChord) {
            console.log("[ChordEditModal.onSave] Updating existing chord.");
            actions.updateChord(selectedChord.tick, chord);
          } else {
            console.log("[ChordEditModal.onSave] Adding new chord.");
            actions.addChord(chord);
          }
        }}
        onDelete={
          selectedChord
            ? () => {
                console.log(
                  "[ChordEditModal.onDelete] Deleting chord via modal button."
                );
                actions.deleteChord(selectedChord.tick);
              }
            : undefined
        }
      />
    </main>
  );
};

export default LyrEditerPanel;
