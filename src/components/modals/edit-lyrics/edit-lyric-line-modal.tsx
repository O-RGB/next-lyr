import {
  Captions,
  Check,
  Clock3,
  Plus,
  Redo2,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import ButtonCommon from "@/components/common/button";
import InputCommon from "@/components/common/data-input/input";
import ModalCommon from "../../common/modal";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { useUiStore } from "@/features/ui/ui-store";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { canRedo, canUndo } from "@/stores/karaoke-store/history";
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

export default function EditLyricLineModal({ open }: EditLyricLineModalProps) {
  const { handleRetiming } = usePlayerHandlersStore();
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);
  const history = useKaraokeStore((state) => state.history);
  const actions = useKaraokeStore((state) => state.actions);
  const requestConfirm = useUiStore((state) => state.requestConfirm);
  const locale = useSettingsStore((state) => state.uiLocale);

  const [drafts, setDrafts] = useState<Record<number, WordDraft>>({});
  const [newWordDrafts, setNewWordDrafts] = useState<NewWordDraft[]>([]);
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
    setNewWordDrafts([]);
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

  const handleAddWordDraft = () => {
    setNewWordDrafts((previous) => [
      ...previous,
      {
        id: `new-${Date.now()}-${previous.length}`,
        text: "",
        vocal: "",
      },
    ]);
  };

  const updateNewWordDraft = (
    draftId: string,
    field: keyof WordDraft,
    value: string
  ) => {
    setNewWordDrafts((previous) =>
      previous.map((draft) =>
        draft.id === draftId ? { ...draft, [field]: value } : draft
      )
    );
  };

  const handleSaveNewWord = (draft: NewWordDraft) => {
    if (selectedLineIndex === null || !draft.text.trim()) return;

    actions.addWord(selectedLineIndex, draft.text, draft.vocal);
    setNewWordDrafts((previous) =>
      previous.filter((item) => item.id !== draft.id)
    );
  };

  const handleDeleteWord = async (word: LyricWordData) => {
    const confirmed = await requestConfirm({
      title: text(locale, "ลบคำนี้หรือไม่?", "Delete this word?"),
      description: text(
        locale,
        `คำว่า "${word.text}" จะถูกลบออกจากบรรทัดนี้`,
        `"${word.text}" will be removed from this line`
      ),
      tone: "danger",
      confirmLabel: text(locale, "ลบคำ", "Delete word"),
    });
    if (!confirmed) return;

    actions.deleteWord(word.index);

    const nextLine =
      selectedLineIndex === null
        ? []
        : useKaraokeStore.getState().lyricsData[selectedLineIndex] ?? [];
    setDrafts(
      Object.fromEntries(
        nextLine.map((nextWord) => [
          nextWord.index,
          { text: nextWord.text, vocal: nextWord.vocal ?? "" },
        ])
      )
    );
    setSavedWordIndex(null);
  };

  const handleDeleteNewWord = async (draftId: string) => {
    const confirmed = await requestConfirm({
      title: text(locale, "ลบแถวคำใหม่นี้หรือไม่?", "Delete this new word row?"),
      description: text(
        locale,
        "ข้อมูลที่กรอกไว้ในแถวนี้จะหายไป",
        "The text entered in this row will be lost"
      ),
      tone: "danger",
      confirmLabel: text(locale, "ลบแถว", "Delete row"),
    });
    if (!confirmed) return;

    setNewWordDrafts((previous) =>
      previous.filter((draft) => draft.id !== draftId)
    );
  };

  const syncDraftsFromStore = () => {
    const nextLine =
      selectedLineIndex === null
        ? []
        : useKaraokeStore.getState().lyricsData[selectedLineIndex] ?? [];
    setDrafts(
      Object.fromEntries(
        nextLine.map((word) => [
          word.index,
          { text: word.text, vocal: word.vocal ?? "" },
        ])
      )
    );
    setNewWordDrafts([]);
    setSavedWordIndex(null);
  };

  const handleUndo = () => {
    actions.undo();
    syncDraftsFromStore();
  };

  const handleRedo = () => {
    actions.redo();
    syncDraftsFromStore();
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

  const handleNewWordKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    draft: NewWordDraft
  ) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handleSaveNewWord(draft);
  };

  const handleRetimingLine = async () => {
    if (selectedLineIndex === null) return;
    const confirmed = await requestConfirm({
      title: text(locale, "ปาดเนื้อร้องใหม่หรือไม่?", "Retiming this line?"),
      description: text(
        locale,
        `เวลาและการแบ่งคำของบรรทัดที่ ${selectedLineIndex + 1} จะถูกสร้างใหม่`,
        `Timing and word splits for line ${selectedLineIndex + 1} will be rebuilt`
      ),
      tone: "danger",
      confirmLabel: text(locale, "ปาดใหม่", "Retiming"),
    });
    if (!confirmed) return;

    actions.closeEditModal();
    handleRetiming(selectedLineIndex, selectedLineIndex);
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
          color="warning"
          icon={<Clock3 />}
          onClick={handleRetimingLine}
        >
          {text(locale, "ปาดใหม่ทั้งบรรทัด", "Retiming whole line")}
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
                disabled={!canUndo(history)}
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
                disabled={!canRedo(history)}
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
            {currentLine?.map((word, index) => {
              const draft = drafts[word.index] ?? {
                text: word.text,
                vocal: word.vocal ?? "",
              };
              const isSaved = savedWordIndex === word.index;

              return (
                <div
                  key={word.index}
                  className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,0.8fr)_auto_auto] items-center gap-2 border-b border-line/60 py-1 last:border-b-0"
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
                    onKeyDown={(event) => handleWordKeyDown(event, word)}
                  />
                  <InputCommon
                    inputSize="sm"
                    placeholder={text(locale, "ซับ", "Subtitle")}
                    value={draft.vocal}
                    onChange={(event) =>
                      updateDraft(word.index, "vocal", event.target.value)
                    }
                    onKeyDown={(event) => handleWordKeyDown(event, word)}
                  />
                  <ButtonCommon
                    aria-label={text(
                      locale,
                      `บันทึกคำที่ ${index + 1}`,
                      `Save word ${index + 1}`
                    )}
                    title={isSaved ? text(locale, "บันทึกแล้ว", "Saved") : text(locale, "บันทึกคำนี้", "Save word")}
                    circle
                    size="xs"
                    className="!size-7"
                    color={isSaved ? "success" : "primary"}
                    icon={isSaved ? <Check /> : <Save />}
                    disabled={
                      !draft.text.trim() ||
                      (draft.text === word.text &&
                        draft.vocal === (word.vocal ?? ""))
                    }
                    onClick={() => handleSaveWord(word)}
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
                    onClick={() => void handleDeleteWord(word)}
                  />
                </div>
              );
            })}
            {newWordDrafts.map((draft, index) => (
              <div
                key={draft.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,0.8fr)_auto_auto] items-center gap-2 border-b border-line/60 py-1 last:border-b-0"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-brand-2/15 text-[11px] font-semibold text-brand-2">
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
                  onKeyDown={(event) => handleNewWordKeyDown(event, draft)}
                />
                <InputCommon
                  inputSize="sm"
                  placeholder={text(locale, "ซับ", "Subtitle")}
                  value={draft.vocal}
                  onChange={(event) =>
                    updateNewWordDraft(draft.id, "vocal", event.target.value)
                  }
                  onKeyDown={(event) => handleNewWordKeyDown(event, draft)}
                />
                <ButtonCommon
                  aria-label={text(locale, "บันทึกคำใหม่", "Save new word")}
                  title={text(locale, "บันทึกคำใหม่", "Save new word")}
                  circle
                  size="xs"
                  className="!size-7"
                  color="primary"
                  icon={<Save />}
                  disabled={!draft.text.trim()}
                  onClick={() => handleSaveNewWord(draft)}
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
                  onClick={() => void handleDeleteNewWord(draft.id)}
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
