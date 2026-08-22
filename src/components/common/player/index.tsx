// src/components/common/player/index.tsx
import { Loader2, Pause, Play, Square } from "lucide-react";
import React from "react";
import { TimerRange } from "./render-time";
import RetimingCancelButton from "@/components/common/retiming-cancel";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";

interface CommonPlayerStyleProps {
  fileName: string;
  isPlaying: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
  onPlayPause: () => void;
  onStop: () => void;
  onSeek: (value: number) => void;
  duration: number;
}

interface PlayerButtonsProps {
  fileName: string;
  isPlaying: boolean;
  isLoading: boolean;
  onPlayPause: () => void;
  onStop: () => void;
}

const PlayerButtons = React.memo<PlayerButtonsProps>(
  ({ fileName, isPlaying, isLoading, onPlayPause, onStop }) => {
    const locale = useSettingsStore((state) => state.uiLocale);

    return (
      <div className="flex justify-center items-center gap-2">
      <button
        onClick={onPlayPause}
        disabled={!fileName || isLoading}
        className="p-3 bg-panel rounded-full shadow-md disabled:opacity-50 transition-transform transform active:scale-90"
        aria-label={
          isLoading
            ? text(locale, "กำลังโหลดระบบเสียง", "Loading audio engine")
            : isPlaying
              ? text(locale, "หยุดชั่วคราว", "Pause")
              : text(locale, "เล่น", "Play")
        }
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-foreground" />
        ) : isPlaying ? (
          <Pause className="h-5 w-5 text-foreground" />
        ) : (
          <Play className="h-5 w-5 text-foreground" />
        )}
      </button>
      <button
        onClick={onStop}
        disabled={!fileName}
        className="p-3 bg-panel rounded-full shadow-md disabled:opacity-50 transition-transform transform active:scale-90"
      >
        <Square className="h-5 w-5 text-foreground" />
      </button>
      </div>
    );
  }
);

PlayerButtons.displayName = "PlayerButtons";

const CommonPlayerStyle: React.FC<CommonPlayerStyleProps> = ({
  fileName,
  isPlaying,
  isLoading = false,
  loadingLabel,
  onPlayPause,
  onStop,
  onSeek,
  duration,
}) => {
  const locale = useSettingsStore((state) => state.uiLocale);

  return (
    <div className="bg-panel/50 p-4 rounded-lg flex items-center justify-center gap-4 w-full">
      <PlayerButtons
        fileName={fileName}
        isPlaying={isPlaying}
        isLoading={isLoading}
        onPlayPause={onPlayPause}
        onStop={onStop}
      />
      <RetimingCancelButton className="hidden lg:inline-flex" />
      {isLoading && (
        <span
          className="whitespace-nowrap text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {loadingLabel ??
            text(
              locale,
              "กำลังโหลดระบบเสียง...",
              "Loading audio engine..."
            )}
        </span>
      )}
      <TimerRange
        duration={duration || 100}
        onSeek={onSeek}
        filename={fileName}
        disabled={isLoading}
      ></TimerRange>
    </div>
  );
};

export default React.memo(CommonPlayerStyle);
