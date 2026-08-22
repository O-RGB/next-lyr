import { Captions, CircleArrowLeft, Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import ButtonCommon from "@/components/common/button";
import InputCommon from "@/components/common/data-input/input";
import { useUiStore } from "@/features/ui/ui-store";
import { ThaiKaraoke } from "@/lib/thai-karaoke";
import { tokenizeThai } from "@/lib/wordcut/utils";
import { useKaraokeStore } from "@/stores/karaoke-store";
import ModalCommon from "../../common/modal";

interface AddLyricLineModalProps {
  open?: boolean;
}

interface WordDraft {
  id: string;
  text: string;
  vocal: string;
}

export default function AddLyricLineModal({ open }: AddLyricLineModalProps) {
  const lineIndexToInsertAfter = useKaraokeStore(
    (state) => state.lineIndexToInsertAfter
  );
  const actions = useKaraokeStore((state) => state.actions);
  const requestConfirm = useUiStore((state) => state.requestConfirm);
  const [freeText, setFreeText] = useState("");
  const [wordDrafts, setWordDrafts] = useState<WordDraft[]>([]);
  const draftIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const resetTimer = window.setTimeout(() => {
      setFreeText("");
      setWordDrafts([]);
    }, 0);
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(focusTimer);
    };
  }, [open]);

  const createWordDraft = (text: string, vocal = ""): WordDraft => ({
    id: `new-word-${draftIdRef.current++}`,
    text,
    vocal,
  });

  const buildWordDrafts = (
    value: string,
    previous: WordDraft[]
  ): WordDraft[] => {
    if (!value) return [];

    return value.split("|").map((text, index) => {
      const previousDraft = previous[index];
      return {
        id: previousDraft?.id ?? createWordDraft(text).id,
        text,
        vocal: previousDraft?.vocal ?? "",
      };
    });
  };

  const handleFreeTextChange = (value: string) => {
    setFreeText(value);
    setWordDrafts((previous) => buildWordDrafts(value, previous));
  };

  const updateWordDraft = (
    index: number,
    field: "text" | "vocal",
    value: string
  ) => {
    const next = wordDrafts.map((draft, draftIndex) =>
      draftIndex === index ? { ...draft, [field]: value } : draft
    );
    setWordDrafts(next);

    if (field === "text") {
      setFreeText(next.map((draft) => draft.text).join("|"));
    }
  };

  const handleDeleteWord = async (draft: WordDraft) => {
    const confirmed = await requestConfirm({
      title: "ลบคำนี้หรือไม่?",
      description: `คำว่า "${draft.text || "ว่าง"}" จะถูกลบออกจากบรรทัดใหม่`,
      tone: "danger",
      confirmLabel: "ลบคำ",
    });
    if (!confirmed) return;

    const next = wordDrafts.filter((item) => item.id !== draft.id);
    setWordDrafts(next);
    setFreeText(next.map((item) => item.text).join("|"));
  };

  const handleAutoSub = () => {
    const thaiKaraoke = ThaiKaraoke.getInstance();
    setWordDrafts((previous) =>
      previous.map((draft) => ({
        ...draft,
        vocal: draft.text.trim()
          ? thaiKaraoke.transliterate(draft.text).toUpperCase()
          : "",
      }))
    );
  };

  const lineText = wordDrafts.map((draft) => draft.text).join("|");
  const hasEmptyWord = wordDrafts.some((draft) => !draft.text.trim());
  const canAdd = wordDrafts.length > 0 && Boolean(lineText.trim()) && !hasEmptyWord;

  const handleSave = () => {
    if (!canAdd || lineIndexToInsertAfter === null) return;

    actions.insertLineAfter(
      lineIndexToInsertAfter,
      lineText,
      wordDrafts.map((draft) => draft.vocal)
    );
    actions.closeAddModal();
  };

  const handleClose = () => {
    actions.closeAddModal();
  };

  const cutText = async () => {
    if (!freeText.trim()) return;
    const processedText = await tokenizeThai(freeText);
    handleFreeTextChange(processedText);
  };

  return (
    <ModalCommon
      title={
        lineIndexToInsertAfter === -1
          ? "Add Lyrics"
          : `Add Lyric Line After Line ${
              lineIndexToInsertAfter !== null
                ? lineIndexToInsertAfter + 1
                : ""
            }`
      }
      onClose={handleClose}
      open={open || lineIndexToInsertAfter !== null}
      footer={
        <div className="flex items-center justify-end gap-3">
          <ButtonCommon
            size="sm"
            color="gray"
            icon={<CircleArrowLeft />}
            onClick={handleClose}
          >
            Close
          </ButtonCommon>
          <ButtonCommon
            size="sm"
            disabled={!freeText.trim()}
            icon={<Sparkles />}
            color="success"
            className="text-nowrap"
            onClick={() => void cutText()}
          >
            ตัดคำ
          </ButtonCommon>
          <ButtonCommon
            color="primary"
            size="sm"
            icon={<Plus />}
            disabled={!canAdd || lineIndexToInsertAfter === null}
            onClick={handleSave}
          >
            Add
          </ButtonCommon>
        </div>
      }
    >
      <div className="space-y-2">
        <div className="rounded-xl border border-line bg-panel p-2 shadow-sm">
          <label htmlFor="add-line-free-text" className="sr-only">
            New line lyrics
          </label>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <InputCommon
                id="add-line-free-text"
                ref={inputRef}
                type="text"
                value={freeText}
                onChange={(event) => handleFreeTextChange(event.target.value)}
                placeholder="พิมพ์เนื้อร้อง แล้วใช้ | แบ่งคำ"
              />
            </div>
          </div>

          <div className="mt-2 max-h-64 overflow-y-auto border-t border-line/60 pt-1">
            {wordDrafts.length > 0 ? (
              wordDrafts.map((draft, index) => (
                <div
                  key={draft.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,0.8fr)_auto] items-center gap-2 border-b border-line/60 py-1 last:border-b-0"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-brand-2/15 text-[11px] font-semibold text-brand-2">
                    {index + 1}
                  </span>
                  <InputCommon
                    inputSize="sm"
                    placeholder="คำร้อง"
                    value={draft.text}
                    onChange={(event) =>
                      updateWordDraft(index, "text", event.target.value)
                    }
                  />
                  <InputCommon
                    inputSize="sm"
                    placeholder="ซับ"
                    value={draft.vocal}
                    onChange={(event) =>
                      updateWordDraft(index, "vocal", event.target.value)
                    }
                  />
                  <ButtonCommon
                    aria-label={`ลบคำที่ ${index + 1}`}
                    title="ลบคำนี้"
                    circle
                    size="xs"
                    className="!size-7"
                    color="danger"
                    variant="ghost"
                    icon={<Trash2 />}
                    onClick={() => void handleDeleteWord(draft)}
                  />
                </div>
              ))
            ) : (
              <p className="px-1 py-2 text-xs text-muted-foreground">
                พิมพ์เนื้อร้องด้านบน รายการคำจะแสดงตามเครื่องหมาย |
              </p>
            )}
          </div>

          <div className="flex justify-end border-t border-line/60 pt-2">
            <ButtonCommon
              aria-label="เติมซับอัตโนมัติ"
              title="เติมซับอัตโนมัติ"
              size="sm"
              color="success"
              icon={<Captions />}
              className="text-nowrap"
              disabled={!wordDrafts.some((draft) => draft.text.trim())}
              onClick={handleAutoSub}
            >
              เติมซับอัตโนมัติ
            </ButtonCommon>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          แก้ไขช่องด้านบนหรือช่องคำได้ตลอด ระบบจะเพิ่มและลบแถวตาม <code>|</code> ทันที
        </p>
      </div>
    </ModalCommon>
  );
}
