import { useKaraokeStore } from "@/stores/karaoke-store";
import { useTimerStore } from "@/timer-worker/store";
import ButtonCommon from "@/components/common/button";
import { FileText, Music2 } from "lucide-react";
import React, { useEffect, useRef } from "react";
import BeatIndicator from "./beat-indicator";

type EditorView = "lyrics" | "chords";

interface TimestampProps {
  editorView?: EditorView;
  onEditorViewChange?: (view: EditorView) => void;
}

const TimeStampe: React.FC<TimestampProps> = ({
  editorView = "lyrics",
  onEditorViewChange,
}) => {
  const mode = useKaraokeStore((state) => state.mode);
  const timeRef = useRef<HTMLSpanElement>(null);
  const tempoRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const update = (value: number, bpm: number) => {
      if (timeRef.current) {
        timeRef.current.textContent =
          mode === "midi" ? String(Math.round(value)) : value.toFixed(2);
      }
      if (tempoRef.current) tempoRef.current.textContent = String(bpm);
    };

    const initial = useTimerStore.getState();
    update(initial.displayValue, initial.displayBpm);

    return useTimerStore.subscribe((next, previous) => {
      if (
        next.displayValue !== previous.displayValue ||
        next.displayBpm !== previous.displayBpm
      ) {
        update(next.displayValue, next.displayBpm);
      }
    });
  }, [mode]);

  return (
    <div className="flex gap-2 items-center">
      <div className="tabnum flex min-h-8 min-w-[76px] items-center justify-center gap-4 border border-line-soft bg-lane px-3 py-1 text-sm text-foreground">
        {mode === "midi" ? (
          <BeatIndicator />
        ) : (
          <div className="flex items-center">
            <span className="label-xs mr-1">Time:</span>
            <span ref={timeRef} />
          </div>
        )}
      </div>
      <div className="tabnum flex items-center gap-1 border border-line-soft bg-lane px-3 py-1 text-sm text-foreground">
        <span className="label-xs">BPM:</span>
        <span ref={tempoRef} />
      </div>
      {onEditorViewChange && (
        <ButtonCommon
          type="button"
          size="xs"
          color={editorView === "chords" ? "warning" : "white"}
          icon={editorView === "chords" ? <Music2 /> : <FileText />}
          onClick={() =>
            onEditorViewChange(editorView === "chords" ? "lyrics" : "chords")
          }
          aria-pressed={editorView === "chords"}
          title={editorView === "chords" ? "กลับไปหน้า Lyrics" : "เปิดหน้า Chords"}
        >
          {editorView === "chords" ? "Chords" : "Lyrics"}
        </ButtonCommon>
      )}
    </div>
  );
};

export default React.memo(TimeStampe);
