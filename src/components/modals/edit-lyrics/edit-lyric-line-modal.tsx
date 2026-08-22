import { Check, Clock3, Save, WandSparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import ButtonCommon from "@/components/common/button";
import InputCommon from "@/components/common/data-input/input";
import ModalCommon from "../../common/modal";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { ThaiKaraoke } from "@/lib/thai-karaoke";
import type { LyricWordData } from "@/types/common.type";

interface EditLyricLineModalProps {
  open?: boolean;
}

interface WordDraft {
  text: string;
  vocal: string;
}

export default function EditLyricLineModal({ open }: EditLyricLineModalProps) {
  const { handleRetiming } = usePlayerHandlersStore();
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);
  const actions = useKaraokeStore((state) => state.actions);

  const [drafts, setDrafts] = useState<Record<number, WordDraft>>({});
  const [savedWordIndex, setSavedWordIndex] = useState<number | null>(null);
  const sessionKeyRef = useRef<string | null>(null);

  const currentLine =
    selectedLineIndex === null ? undefined : lyricsData[selectedLineIndex];

  useEffect(() => {
    if (!open || selectedLineIndex === null || !currentLine) {
      sessionKeyRef.current = null;
      return;
    }

    const sessionKey = String(selectedLineIndex);
    if (sessionKeyRef.current === sessionKey) return;

    sessionKeyRef.current = sessionKey;
    setDrafts(
      Object.fromEntries(
        currentLine.map((word) => [
          word.index,
          { text: word.text, vocal: word.vocal ?? "" },
        ])
      )
    );
    setSavedWordIndex(null);
  }, [open, selectedLineIndex, currentLine]);

  const updateDraft = (
    wordIndex: number,
    field: keyof WordDraft,
    value: string
  ) => {
    setDrafts((previous) => ({
      ...previous,
      [wordIndex]: {
        ...previous[wordIndex],
        [field]: value,
      },
    }));
    if (savedWordIndex === wordIndex) setSavedWordIndex(null);
  };

  const handleSaveWord = (word: LyricWordData) => {
    const draft = drafts[word.index];
    const isDirty =
      draft &&
      (draft.text !== word.text || draft.vocal !== (word.vocal ?? ""));
    if (!draft || !draft.text.trim() || !isDirty) return;

    actions.updateWord(word.index, {
      text: draft.text,
      vocal: draft.vocal,
    });
    setSavedWordIndex(word.index);
  };

  const handleAutoSub = () => {
    if (!currentLine?.length) return;

    const thaiKaraoke = ThaiKaraoke.getInstance();
    setDrafts((previous) => {
      const next = { ...previous };
      currentLine.forEach((word) => {
        const draft = previous[word.index] ?? {
          text: word.text,
          vocal: word.vocal ?? "",
        };
        next[word.index] = {
          ...draft,
          vocal: thaiKaraoke.transliterate(draft.text).toUpperCase(),
        };
      });
      return next;
    });
    setSavedWordIndex(null);
  };

  const handleWordKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    word: LyricWordData
  ) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handleSaveWord(word);
  };

  const handleRetimingLine = () => {
    if (selectedLineIndex === null) return;
    if (!confirm(`ปาดเนื้อร้องบรรทัดที่ ${selectedLineIndex + 1} ใหม่?`)) {
      return;
    }

    actions.closeEditModal();
    handleRetiming(selectedLineIndex, selectedLineIndex);
  };

  return (
    <ModalCommon
      title="แก้ไขคำร้อง"
      description="แก้เฉพาะคำที่ต้องการ เวลาเดิมจะไม่เปลี่ยน"
      onClose={() => actions.closeEditModal()}
      open={(open ?? false) && selectedLineIndex !== null}
      footer={
        <ButtonCommon
          className="w-full sm:ml-auto sm:w-auto"
          color="warning"
          icon={<Clock3 />}
          onClick={handleRetimingLine}
        >
          ปาดใหม่ทั้งบรรทัด
        </ButtonCommon>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>บรรทัดที่ {(selectedLineIndex ?? 0) + 1}</span>
            <span>{currentLine?.length ?? 0} คำ</span>
          </div>
          <ButtonCommon
            aria-label="สร้าง Auto Sub"
            title="สร้าง Auto Sub"
            circle
            size="xs"
            color="success"
            icon={<WandSparkles />}
            onClick={handleAutoSub}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {currentLine?.map((word, index) => {
            const draft = drafts[word.index] ?? {
              text: word.text,
              vocal: word.vocal ?? "",
            };
            const isSaved = savedWordIndex === word.index;

            return (
              <section
                key={word.index}
                className="rounded-xl border border-line bg-panel p-2 shadow-sm"
              >
                <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,0.8fr)_auto] items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-brand-2/15 text-[11px] font-semibold text-brand-2">
                    {index + 1}
                  </span>
                  <InputCommon
                    inputSize="sm"
                    placeholder="คำร้อง"
                    value={draft.text}
                    onChange={(event) =>
                      updateDraft(word.index, "text", event.target.value)
                    }
                    onKeyDown={(event) => handleWordKeyDown(event, word)}
                  />
                  <InputCommon
                    inputSize="sm"
                    placeholder="ซับ"
                    value={draft.vocal}
                    onChange={(event) =>
                      updateDraft(word.index, "vocal", event.target.value)
                    }
                    onKeyDown={(event) => handleWordKeyDown(event, word)}
                  />
                  <ButtonCommon
                    aria-label={`บันทึกคำที่ ${index + 1}`}
                    title={isSaved ? "บันทึกแล้ว" : "บันทึกคำนี้"}
                    circle
                    size="sm"
                    color={isSaved ? "success" : "primary"}
                    icon={isSaved ? <Check /> : <Save />}
                    disabled={
                      !draft.text.trim() ||
                      (draft.text === word.text &&
                        draft.vocal === (word.vocal ?? ""))
                    }
                    onClick={() => handleSaveWord(word)}
                  />
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </ModalCommon>
  );
}
