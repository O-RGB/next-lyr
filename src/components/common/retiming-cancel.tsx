"use client";

import { X } from "lucide-react";

import ButtonCommon from "@/components/common/button";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";

interface RetimingCancelButtonProps {
  compact?: boolean;
  className?: string;
}

/** Session-level cancel action for an in-progress lyric timing pass. */
export default function RetimingCancelButton({
  compact = false,
  className,
}: RetimingCancelButtonProps) {
  const timingMode = useKaraokeStore(
    (state) => state.isTimingActive || state.editingLineIndex !== null
  );
  const handleCancelRetiming = usePlayerHandlersStore(
    (state) => state.handleCancelRetiming
  );
  const locale = useSettingsStore((state) => state.uiLocale);

  if (!timingMode) return null;

  return (
    <ButtonCommon
      type="button"
      color="danger"
      variant="outline"
      size={compact ? "xs" : "sm"}
      circle={compact}
      icon={<X />}
      className={className}
      onClick={() => void handleCancelRetiming()}
      title={text(locale, "ยกเลิกการปาด และไม่บันทึก", "Cancel timing without saving")}
      aria-label={text(locale, "ยกเลิกการปาด และไม่บันทึก", "Cancel timing without saving")}
    >
      {!compact ? text(locale, "ยกเลิกปาด", "Cancel timing") : null}
    </ButtonCommon>
  );
}
