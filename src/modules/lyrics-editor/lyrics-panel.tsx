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

type LyricsPanelProps = {
  onPreviewChange?: (visible: boolean) => void;
};

export function LyricsEditorPanel({ onPreviewChange }: LyricsPanelProps) {
  const isMobile = useIsMobile();
  const locale = useSettingsStore((state) => state.uiLocale);
  const setPlayFromScrolledPosition = useKaraokeStore(
    (state) => state.actions.setPlayFromScrolledPosition
  );
  const [preview, setPreview] = useState(false);
  const [chordPreview, setChordPreview] = useState(false);

  const setPreviewVisible = (visible: boolean) => {
    setPreview(visible);
    onPreviewChange?.(visible);
  };

  const closeChordPreview = () => {
    setPlayFromScrolledPosition(false);
    setChordPreview(false);
  };

  const handleEditorViewChange = (view: "lyrics" | "chords") => {
    if (view === "chords") {
      setChordPreview(true);
      return;
    }
    closeChordPreview();
  };

  return (
    <Card className="relative flex h-full min-h-0 flex-col gap-2 border-0 bg-panel pt-2 lg:pt-4 pr-2 lg:pr-4 pb-2 lg:pb-4 pl-2 lg:pl-4">
      <header className="flex shrink-0 items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          {chordPreview
            ? text(locale, "คอร์ด", "Chords")
            : text(locale, "เนื้อเพลง", "Lyrics")}
        </h1>
        <Timestamp
          editorView={chordPreview ? "chords" : "lyrics"}
          onEditorViewChange={handleEditorViewChange}
          showEditorViewToggle={false}
        />
      </header>

      {isMobile ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          {preview && (
            <div className="flex h-[115px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-lane ring-1 ring-line-soft p-2">
              <LyricsPreview textStyle={{ fontSize: 20 }} />
            </div>
          )}

          <div className="z-10 flex h-[120px] shrink-0 gap-2">
            {chordPreview ? (
              <div className="min-w-0 flex-1">
                <ChordOverviewPreview compact />
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <ChordsPanel compact />
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden overscroll-none">
            {chordPreview ? (
              <MidiNotesPreview onClose={closeChordPreview} />
            ) : (
              <LyricsGrid />
            )}
          </div>

          <div className="flex shrink-0 justify-end gap-1.5">
            <MobileActionButton
              preview={preview}
              setPreview={setPreviewVisible}
            />
          </div>
          <LyricsMobileControls />
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 gap-2 overflow-hidden">
            <div className="min-w-0 flex-1 overflow-hidden overscroll-none">
              {chordPreview ? (
                <MidiNotesPreview onClose={closeChordPreview} />
              ) : (
                <LyricsGrid />
              )}
            </div>
            {chordPreview ? (
              <div className="h-full w-[150px] shrink-0">
                <ChordOverviewPreview compact />
              </div>
            ) : (
              <div className="h-full w-[150px] shrink-0">
                <ChordsPanel compact />
              </div>
            )}
          </div>
          <div className="flex shrink-0 justify-end gap-1.5">
            <MobileActionButton
              preview={preview}
              setPreview={setPreviewVisible}
              showLineSelection={false}
            />
          </div>
          {!chordPreview && (
            <div className="hidden shrink-0 justify-start lg:flex">
              <LineSelectionToolbar />
            </div>
          )}
        </>
      )}

    </Card>
  );
}

export default React.memo(LyricsEditorPanel);
