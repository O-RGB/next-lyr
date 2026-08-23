import {
  Captions,
  Plus,
  Save,
  Trash2,
  Undo2,
  Redo2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import ButtonCommon from "@/components/common/button";
import InputCommon from "@/components/common/data-input/input";
import ModalCommon from "../../common/modal";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
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

interface NewWordDraft extends WordDraft {
  id: string;
}

interface DraftSnapshot {
  drafts: Record<number, WordDraft>;
  newWordDrafts: NewWordDraft[];
  deletedWordIndexes: number[];
}

interface DraftHistory {
  past: DraftSnapshot[];
  present: DraftSnapshot;
  future: DraftSnapshot[];
}

const createEmptyDraftHistory = (): DraftHistory => ({
  past: [],
  present: {
    drafts: {},
    newWordDrafts: [],
    deletedWordIndexes: [],
  },
  future: [],
});

export default function EditLyricLineModal({ open }: EditLyricLineModalProps) {
  const { handleRetiming } = usePlayerHandlersStore();
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);
  const actions = useKaraokeStore((state) => state.actions);
  const locale = useSettingsStore((state) => state.uiLocale);

  const [draftHistory, setDraftHistory] = useState<DraftHistory>(() =>
    createEmptyDraftHistory()
  );
  const sessionKeyRef = useRef<string | null>(null);

  const { drafts, newWordDrafts, deletedWordIndexes } = draftHistory.present;

  const currentLine =
    selectedLineIndex === null ? undefined : lyricsData[selectedLineIndex];

  useEffect(() => {
    if (!open) {
      sessionKeyRef.current = null;
      setDraftHistory(createEmptyDraftHistory());
      return;
    }

    if (selectedLineIndex === null || !currentLine) {
      sessionKeyRef.current = null;
      return;
    }

    const sessionKey = String(selectedLineIndex);
    if (sessionKeyRef.current === sessionKey) return;

    sessionKeyRef.current = sessionKey;
    setDraftHistory({
      past: [],
      present: {
        drafts: Object.fromEntries(
          currentLine.map((word) => [
            word.index,
            { text: word.text, vocal: word.vocal ?? "" },
          ])
        ),
        newWordDrafts: [],
        deletedWordIndexes: [],
      },
      future: [],
    });
  }, [open, selectedLineIndex, currentLine]);

  const updateDraftState = (
    update: (previous: DraftSnapshot) => DraftSnapshot
  ) => {
    setDraftHistory((previous) => ({
      past: [...previous.past, previous.present],
      present: update(previous.present),
      future: [],
    }));
  };

  const updateDraft = (
    wordIndex: number,
    field: keyof WordDraft,
    value: string
  ) => {
    updateDraftState((previous) => ({
      ...previous,
      drafts: {
        ...previous.drafts,
        [wordIndex]: {
          ...previous.drafts[wordIndex],
          [field]: value,
        },
      },
    }));
  };

  const handleAddWordDraft = () => {
    updateDraftState((previous) => ({
      ...previous,
      newWordDrafts: [
        ...previous.newWordDrafts,
        {
          id: `new-${Date.now()}-${previous.newWordDrafts.length}`,
          text: "",
          vocal: "",
        },
      ],
    }));
  };

  const updateNewWordDraft = (
    draftId: string,
    field: keyof WordDraft,
    value: string
  ) => {
    updateDraftState((previous) => ({
      ...previous,
      newWordDrafts: previous.newWordDrafts.map((draft) =>
        draft.id === draftId ? { ...draft, [field]: value } : draft
      ),
    }));
  };

  const handleDeleteWord = (word: LyricWordData) => {
    updateDraftState((previous) => ({
      ...previous,
      deletedWordIndexes: previous.deletedWordIndexes.includes(word.index)
        ? previous.deletedWordIndexes
        : [...previous.deletedWordIndexes, word.index],
    }));
  };

  const handleDeleteNewWord = (draftId: string) => {
    updateDraftState((previous) => ({
      ...previous,
      newWordDrafts: previous.newWordDrafts.filter(
        (draft) => draft.id !== draftId
      ),
    }));
  };

  const handleUndo = () => {
    setDraftHistory((previous) => {
      const last = previous.past.at(-1);
      if (!last) return previous;

      return {
        past: previous.past.slice(0, -1),
        present: last,
        future: [previous.present, ...previous.future],
      };
    });
  };

  const handleRedo = () => {
    setDraftHistory((previous) => {
      const next = previous.future[0];
      if (!next) return previous;

      return {
        past: [...previous.past, previous.present],
        present: next,
        future: previous.future.slice(1),
      };
    });
  };

  const handleAutoSub = () => {
    if (!currentLine?.length) return;

    const thaiKaraoke = ThaiKaraoke.getInstance();
    updateDraftState((previous) => {
      const next = { ...previous.drafts };
      currentLine.forEach((word) => {
        const draft = previous.drafts[word.index] ?? {
          text: word.text,
          vocal: word.vocal ?? "",
        };
        next[word.index] = {
          ...draft,
          vocal: thaiKaraoke.transliterate(draft.text).toUpperCase(),
        };
      });
      return { ...previous, drafts: next };
    });
  };

  const visibleWords =
    currentLine?.filter((word) => !deletedWordIndexes.includes(word.index)) ??
    [];
  const hasExistingChanges = visibleWords.some((word) => {
    const draft = drafts[word.index];
    return (
      draft &&
      (draft.text !== word.text || draft.vocal !== (word.vocal ?? ""))
    );
  });
  const hasNewWords = newWordDrafts.length > 0;
  const hasInvalidDraft =
    visibleWords.some((word) => !drafts[word.index]?.text.trim()) ||
    newWordDrafts.some((draft) => !draft.text.trim());
  const hasUnsavedChanges =
    hasExistingChanges || deletedWordIndexes.length > 0 ||
    newWordDrafts.some((draft) => draft.text.trim() || draft.vocal.trim());

  const handleSave = async () => {
    if (
      selectedLineIndex === null ||
      !currentLine ||
      !hasUnsavedChanges ||
      hasInvalidDraft
    ) {
      return;
    }

    const wordsToSave = [
      ...visibleWords.map((word) => {
        const draft = drafts[word.index] ?? {
          text: word.text,
          vocal: word.vocal ?? "",
        };
        return {
          originalIndex: word.index,
          text: draft.text,
          vocal: draft.vocal,
        };
      }),
      ...newWordDrafts.map((draft) => ({
        originalIndex: null,
        text: draft.text,
        vocal: draft.vocal,
      })),
    ];

    await actions.replaceLineWords(selectedLineIndex, wordsToSave);
    actions.closeEditModal();

    if (hasNewWords) {
      handleRetiming(selectedLineIndex, selectedLineIndex);
    }
  };

  return (
    <ModalCommon
      title={text(locale, "แก้ไขคำร้อง", "Edit lyrics")}
      description={text(
        locale,
        "แก้เฉพาะคำที่ต้องการ เวลาเดิมจะไม่เปลี่ยน",
        "Edit only the words you need; existing timing will stay unchanged"
      )}
      modalClassName="flex flex-col"
      onClose={() => actions.closeEditModal()}
      open={(open ?? false) && selectedLineIndex !== null}
      footer={
        <ButtonCommon
          className="w-full sm:ml-auto sm:w-auto"
          color={hasNewWords ? "warning" : "primary"}
          icon={<Save />}
          disabled={!hasUnsavedChanges || hasInvalidDraft}
          onClick={() => void handleSave()}
        >
          {hasNewWords
            ? text(locale, "บันทึกและปาดใหม่", "Save & retime")
            : text(locale, "บันทึก", "Save")}
        </ButtonCommon>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-col rounded-xl border border-line bg-panel p-2 shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-line px-0.5 pb-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>
                {text(locale, "บรรทัดที่", "Line")} {(selectedLineIndex ?? 0) + 1}
              </span>
              <span>
                {currentLine?.length ?? 0} {text(locale, "คำ", "words")}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <ButtonCommon
                aria-label={text(locale, "ย้อนกลับ", "Undo")}
                title={text(locale, "ย้อนกลับ", "Undo")}
                circle
                size="xs"
                className="!size-7"
                color="gray"
                variant="ghost"
                icon={<Undo2 />}
                disabled={draftHistory.past.length === 0}
                onClick={handleUndo}
              />
              <ButtonCommon
                aria-label={text(locale, "ทำซ้ำ", "Redo")}
                title={text(locale, "ทำซ้ำ", "Redo")}
                circle
                size="xs"
                className="!size-7"
                color="gray"
                variant="ghost"
                icon={<Redo2 />}
                disabled={draftHistory.future.length === 0}
                onClick={handleRedo}
              />
              <ButtonCommon
                aria-label={text(locale, "สร้างซับอัตโนมัติ", "Auto-fill subtitles")}
                title={text(locale, "สร้างซับอัตโนมัติ", "Auto-fill subtitles")}
                circle
                size="xs"
                className="!size-7"
                color="success"
                icon={<Captions />}
                onClick={handleAutoSub}
              />
            </div>
          </div>

          <div className="flex flex-col">
            {visibleWords.map((word, index) => {
              const draft = drafts[word.index] ?? {
                text: word.text,
                vocal: word.vocal ?? "",
              };

              return (
                <div
                  key={word.index}
                  className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,0.8fr)_auto] items-center gap-2 border-b border-line/60 py-1 last:border-b-0"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-brand-2/15 text-[11px] font-semibold text-brand-2">
                    {index + 1}
                  </span>
                  <InputCommon
                    inputSize="sm"
                    placeholder={text(locale, "คำร้อง", "Lyrics")}
                    value={draft.text}
                    onChange={(event) =>
                      updateDraft(word.index, "text", event.target.value)
                    }
                  />
                  <InputCommon
                    inputSize="sm"
                    placeholder={text(locale, "ซับ", "Subtitle")}
                    value={draft.vocal}
                    onChange={(event) =>
                      updateDraft(word.index, "vocal", event.target.value)
                    }
                  />
                  <ButtonCommon
                    aria-label={text(
                      locale,
                      `ลบคำที่ ${index + 1}`,
                      `Delete word ${index + 1}`
                    )}
                    title={text(locale, "ลบคำนี้", "Delete word")}
                    circle
                    size="xs"
                    className="!size-7"
                    color="danger"
                    variant="ghost"
                    icon={<Trash2 />}
                    onClick={() => handleDeleteWord(word)}
                  />
                </div>
              );
            })}
            {newWordDrafts.map((draft, index) => (
              <div
                key={draft.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,0.8fr)_auto] items-center gap-2 border-b border-line/60 py-1 last:border-b-0"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-line/60 text-[11px] font-semibold text-muted-foreground">
                  {(currentLine?.length ?? 0) + index + 1}
                </span>
                <InputCommon
                  autoFocus={index === newWordDrafts.length - 1}
                  inputSize="sm"
                  placeholder={text(locale, "คำร้อง", "Lyrics")}
                  value={draft.text}
                  onChange={(event) =>
                    updateNewWordDraft(draft.id, "text", event.target.value)
                  }
                />
                <InputCommon
                  inputSize="sm"
                  placeholder={text(locale, "ซับ", "Subtitle")}
                  value={draft.vocal}
                  onChange={(event) =>
                    updateNewWordDraft(draft.id, "vocal", event.target.value)
                  }
                />
                <ButtonCommon
                  aria-label={text(locale, "ลบแถวคำใหม่", "Delete new word row")}
                  title={text(locale, "ลบแถวคำใหม่", "Delete new word row")}
                  circle
                  size="xs"
                  className="!size-7"
                  color="danger"
                  variant="ghost"
                  icon={<Trash2 />}
                  onClick={() => handleDeleteNewWord(draft.id)}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end border-t border-line pt-2">
            <ButtonCommon
              aria-label={text(locale, "เพิ่มคำ", "Add word")}
              title={text(locale, "เพิ่มคำ", "Add word")}
              circle
              size="xs"
              color="secondary"
              variant="outline"
              icon={<Plus />}
              onClick={handleAddWordDraft}
            />
          </div>
        </div>
      </div>
    </ModalCommon>
  );
}
