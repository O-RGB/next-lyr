"use client";

import React, { useState } from "react";

import { useSettingsStore } from "@/features/settings/settings-store";
import { text } from "@/features/settings/locale";
import Card from "@/components/common/card";
import useIsMobile from "@/hooks/useIsMobile";
import MobileActionButton from "@/components/panel/actions";
import { LyricsMobileControls } from "./mobile-controls";
import LyricsGrid from "./lyrics-grid";
import LyricsPreview from "./lyrics-preview";
import Timestamp from "./timestamp";
import LineSelectionToolbar from "@/components/lyrics/line-selection-toolbar";
import MidiNotesPreview from "@/components/panel/midi-notes-preview";
import ChordOverviewPreview from "@/components/panel/chord-overview-preview";
import { useKaraokeStore } from "@/stores/karaoke-store";
import ChordsPanel from "./chords-panel";
import RetimingCancelButton from "@/components/common/retiming-cancel";
import RetimingAllButton from "@/components/common/retiming-all";
import LyricsEditorMenu from "./editor-menu";
import { hasCompleteLyricTiming } from "@/lib/karaoke/utils";

type LyricsPanelProps = {
  onPreviewChange?: (visible: boolean) => void;
};

export function LyricsEditorPanel({ onPreviewChange }: LyricsPanelProps) {
  const isMobile = useIsMobile();
  const mode = useKaraokeStore((state) => state.mode);
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const isTimingActive = useKaraokeStore(
    (state) => state.isTimingActive || state.editingLineIndex !== null
  );
  const lineSelectionMode = useKaraokeStore(
    (state) => state.lineSelectionMode
  );
  const locale = useSettingsStore((state) => state.uiLocale);
  const setPlayFromScrolledPosition = useKaraokeStore(
    (state) => state.actions.setPlayFromScrolledPosition
  );
  // Keep the desktop preview visible by default while starting mobile compact.
  // `useIsMobile` resolves after the first render, so derive the default until
  // the user explicitly changes it instead of initializing from a stale value.
  const [previewPreference, setPreviewPreference] = useState<boolean | null>(
    null
  );
  const [chordPreview, setChordPreview] = useState(false);
  const [chordPanelVisible, setChordPanelVisible] = useState(false);
  const preview = previewPreference ?? !isMobile;
  const showingChords = mode === "midi" && chordPreview;
  const showingChordPanel = mode === "midi" && chordPanelVisible;
  const showActionToolbar =
    !showingChords && (isTimingActive || lineSelectionMode);
  const showRetimingAll =
    !showingChords &&
    lyricsData.length > 0 &&
    !hasCompleteLyricTiming(lyricsData) &&
    !isTimingActive;

  const setPreviewVisible = (visible: boolean) => {
    setPreviewPreference(visible);
    onPreviewChange?.(visible);
  };

  const closeChordPreview = () => {
    setPlayFromScrolledPosition(false);
    setChordPreview(false);
  };

  const handleEditorViewChange = (view: "lyrics" | "chords") => {
    if (view === "chords" && mode === "midi") {
      setChordPreview(true);
      return;
    }
    closeChordPreview();
  };

  return (
    <Card
      className="relative flex h-full min-h-0 flex-col gap-2 overscroll-none border-0 bg-panel p-2 pb-0 lg:p-0"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 lg:px-4 lg:pt-4">
        <h1 className="text-lg font-semibold text-foreground">
          {showingChords
            ? text(locale, "คอร์ด", "Chords")
            : text(locale, "เนื้อเพลง", "Lyrics")}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <Timestamp
            editorView={showingChords ? "chords" : "lyrics"}
            onEditorViewChange={handleEditorViewChange}
            showEditorViewToggle={false}
          />
        </div>
      </header>

      {isMobile ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {preview && (
            <div className="mb-2 flex h-[115px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-lane ring-1 ring-line-soft p-2">
              <LyricsPreview textStyle={{ fontSize: 20 }} />
            </div>
          )}

          {showingChordPanel ? (
            <div className="z-10 mb-2 flex h-[120px] shrink-0 gap-2">
              {showingChords ? (
                <div className="min-w-0 flex-1">
                  <ChordOverviewPreview compact />
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <ChordsPanel compact />
                </div>
              )}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-hidden overscroll-none">
            {showingChords ? (
              <MidiNotesPreview onClose={closeChordPreview} />
            ) : (
              <LyricsGrid />
            )}
          </div>

          {showActionToolbar ? (
            <div className="mt-2 flex shrink-0 items-center gap-1.5">
              <MobileActionButton showPreview={false} />
            </div>
          ) : null}
          {showRetimingAll ? (
            <div className="mt-2 flex shrink-0 justify-end gap-1.5">
              <RetimingAllButton />
            </div>
          ) : null}
          <div className={showActionToolbar || showRetimingAll ? "mt-2" : undefined}>
            <LyricsMobileControls
              tools={
                <LyricsEditorMenu
                  preview={preview}
                  onPreviewChange={setPreviewVisible}
                  chordPanelVisible={chordPanelVisible}
                  onChordPanelVisibilityChange={setChordPanelVisible}
                />
              }
            />
          </div>
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 gap-2 overflow-hidden">
            <div className="min-w-0 flex-1 overflow-hidden overscroll-none">
              {showingChords ? (
                <MidiNotesPreview onClose={closeChordPreview} />
              ) : (
                <LyricsGrid />
              )}
            </div>
            {showingChordPanel ? (
              showingChords ? (
                <div className="h-full w-[150px] shrink-0 pr-2">
                  <ChordOverviewPreview compact />
                </div>
              ) : (
                <div className="h-full w-[150px] shrink-0 pr-2">
                  <ChordsPanel compact />
                </div>
              )
            ) : null}
          </div>
          {showActionToolbar ? (
            <div className="flex shrink-0 items-center gap-1.5 lg:pl-2 lg:pr-2">
              <RetimingCancelButton />
              <LineSelectionToolbar />
            </div>
          ) : null}
          <div className="flex shrink-0 items-center gap-1.5 lg:pl-2 lg:pr-2 lg:pb-2">
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <RetimingAllButton />
              <LyricsEditorMenu
                preview={preview}
                onPreviewChange={setPreviewVisible}
                chordPanelVisible={chordPanelVisible}
                onChordPanelVisibilityChange={setChordPanelVisible}
              />
            </div>
          </div>
        </>
      )}

    </Card>
  );
}

export default React.memo(LyricsEditorPanel);
