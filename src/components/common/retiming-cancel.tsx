"use client";

import { X } from "lucide-react";

import ButtonCommon from "@/components/common/button";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { useKaraokeStore } from "@/stores/karaoke-store";

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

  if (!timingMode) return null;

  return (
    <ButtonCommon
      type="button"
      color="danger"
      variant="outline"
      size={compact ? "sm" : "xs"}
      circle={compact}
      icon={<X />}
      className={className}
      onClick={() => void handleCancelRetiming()}
      title="ยกเลิกการปาด และไม่บันทึก"
      aria-label="ยกเลิกการปาด และไม่บันทึก"
    >
      {!compact ? "ยกเลิกปาด" : null}
    </ButtonCommon>
  );
}
