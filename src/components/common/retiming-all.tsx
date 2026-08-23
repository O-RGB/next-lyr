"use client";

import { ListRestart } from "lucide-react";

import ButtonCommon from "@/components/common/button";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { usePlayerSetupStore } from "@/hooks/usePlayerSetup";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import { hasCompleteLyricTiming } from "@/lib/karaoke/utils";

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
  const locale = useSettingsStore((state) => state.uiLocale);

  const hasTiming = lyricsData.some((line) =>
    line.some((word) => word.at !== null)
  );
  const hasCompleteTiming = hasCompleteLyricTiming(lyricsData);
  // Keep the whole-song action available until the first complete timing pass
  // finishes. This prevents a partial pass from hiding the only recovery path.
  if (lyricsData.length === 0 || hasCompleteTiming || timingMode) return null;

  const label = text(
    locale,
    hasTiming ? "ปาดใหม่ทั้งเพลง" : "เริ่มปาดทั้งเพลง",
    hasTiming ? "Retiming the whole song" : "Time the whole song"
  );
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
      className={
        isDisabled || hasTiming ? undefined : "retiming-onboarding-pulse"
      }
    >
      {label}
    </ButtonCommon>
  );
}
