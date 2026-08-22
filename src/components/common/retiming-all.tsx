"use client";

import { ListRestart } from "lucide-react";

import ButtonCommon from "@/components/common/button";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { usePlayerSetupStore } from "@/hooks/usePlayerSetup";
import { useKaraokeStore } from "@/stores/karaoke-store";

/** Explicit session-level action for timing every lyric line in the song. */
export default function RetimingAllButton() {
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const timingMode = useKaraokeStore(
    (state) => state.isTimingActive || state.editingLineIndex !== null
  );
  const playerControls = usePlayerSetupStore((state) => state.playerControls);
  const handleRetimingAll = usePlayerHandlersStore(
    (state) => state.handleRetimingAll
  );

  const hasTiming = lyricsData.some((line) =>
    line.some((word) => word.at !== null)
  );
  // This is an onboarding action for a freshly imported lyric document. Once
  // timing exists, line-level retiming is the normal editing workflow.
  if (lyricsData.length === 0 || hasTiming || timingMode) return null;

  const label = "เริ่มปาดทั้งเพลง";
  const isDisabled = !playerControls;

  const handleClick = () => {
    if (isDisabled) return;

    void handleRetimingAll();
  };

  return (
    <ButtonCommon
      type="button"
      color="secondary"
      variant="outline"
      size="xs"
      icon={<ListRestart />}
      disabled={isDisabled}
      onClick={handleClick}
      title={label}
      aria-label={label}
    >
      {label}
    </ButtonCommon>
  );
}
