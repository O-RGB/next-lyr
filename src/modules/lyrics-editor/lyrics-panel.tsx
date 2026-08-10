"use client";

import { useState } from "react";
import Card from "@/components/common/card";
import useIsMobile from "@/hooks/useIsMobile";
import MobileActionButton from "@/components/panel/actions";
import { LyricsMobileControls } from "./mobile-controls";
import LyricsGrid from "./lyrics-grid";
import LyricsPreview from "./lyrics-preview";
import ChordsPanel from "./chords-panel";
import Timestamp from "./timestamp";

type LyricsPanelProps = {
  onPreviewChange?: (visible: boolean) => void;
};

export function LyricsEditorPanel({ onPreviewChange }: LyricsPanelProps) {
  const isMobile = useIsMobile();
  const [preview, setPreview] = useState(false);

  const setPreviewVisible = (visible: boolean) => {
    setPreview(visible);
    onPreviewChange?.(visible);
  };

  return (
    <Card className="flex h-full min-h-0 flex-col gap-2 bg-gray-50 p-2 lg:p-4">
      <header className="flex shrink-0 items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">Lyrics</h1>
        <Timestamp />
      </header>

      {isMobile ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          {preview && (
            <div className="flex h-[115px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-r from-violet-100 to-pink-200 p-2">
              <LyricsPreview textStyle={{ fontSize: 20 }} />
            </div>
          )}

          <div className="z-10 flex h-[100px] shrink-0 gap-2">
            <div className="min-w-0 flex-1"><ChordsPanel /></div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto"><LyricsGrid /></div>

          <div className="flex shrink-0 justify-end gap-1.5">
            <MobileActionButton
              preview={preview}
              setPreview={setPreviewVisible}
            />
          </div>
          <LyricsMobileControls />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-2 overflow-hidden">
          <div className="min-w-0 flex-1 overflow-auto"><LyricsGrid /></div>
          <div className="h-full w-[150px] shrink-0"><ChordsPanel /></div>
        </div>
      )}
    </Card>
  );
}

export default LyricsEditorPanel;
