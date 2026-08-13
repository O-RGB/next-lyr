import { CircleArrowLeft, Eraser, Sparkles, SquarePen, WandSparkles } from "lucide-react";
import ModalCommon from "../../common/modal";
import ButtonCommon from "@/components/common/button";
import Form from "@/components/common/data-input/form";
import { useState, useEffect, useRef } from "react";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { tokenizeThai } from "@/lib/wordcut/utils";
import { ThaiKaraoke } from "@/lib/thai-karaoke";
import InputCommon from "@/components/common/data-input/input";

interface EditLyricLineModalProps {
  open?: boolean;
}

export default function EditLyricLineModal({ open }: EditLyricLineModalProps) {
  const { handleRetiming } = usePlayerHandlersStore();

  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const selectedLineIndex = useKaraokeStore((state) => state.selectedLineIndex);
  const actions = useKaraokeStore((state) => state.actions);

  const [initialInputText, setInitialInputText] = useState<string>("");
  const [inputText, setInputText] = useState<string>("");
  const [vocal, setVocal] = useState<string[]>([]);
  const [textSplited, setTextSplited] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  const initName = Form.useForm<any>({
    defaultValues: {},
  });

  useEffect(() => {
    if (open && selectedLineIndex !== null && lyricsData[selectedLineIndex]) {
      initName.reset();
      const lineWord = lyricsData[selectedLineIndex]
        .map((w) => w.text)
        .join("|");
      const vocalList = lyricsData[selectedLineIndex].map((w) => w.vocal ?? "");
      setInitialInputText(lineWord);
      onTextChange(lineWord);

      setVocal(vocalList);

      vocalList.map((vacal, index) =>
        initName.setValue(`comment-${index}`, vacal)
      );

      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [open, selectedLineIndex, lyricsData]);

  const handleSave = () => {
    if (inputText && inputText.trim() && selectedLineIndex !== null) {
      const values = initName.getValues();
      let vocals: string[] = [];
      Object.keys(values).map((key) => {
        vocals.push(values[key] || "");
      });
      actions.updateLine(selectedLineIndex, inputText, vocals);
      actions.closeEditModal();
      handleRetiming(selectedLineIndex, selectedLineIndex);
    }
  };

  const handleClose = () => {
    actions.closeEditModal();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  const cutText = async () => {
    initName.reset();
    const processedText = await tokenizeThai(inputText);
    onTextChange(processedText);
  };

  const autoThaiToKaraoke = () => {
    const thaiKaraoke = ThaiKaraoke.getInstance();

    let subs: string[] = [];
    textSplited.map((sub, index) => {
      const auto = thaiKaraoke.transliterate(sub).toUpperCase();
      subs.push(auto);
      initName.setValue(`comment-${index}`, auto);
    });

    setVocal(subs);
  };

  const onTextChange = (value: string) => {
    setInputText(value);

    const splited = value.split("|");
    setTextSplited(splited);

    if (splited.length > 0 && vocal.length > 0) {
      setVocal(splited);
      initName.reset();
    }
  };

  const onVocalChange = (values: any) => {
    let vocalTemp: string[] = [];

    Object.keys(values).map((key) => {
      const ele = values[key];
      vocalTemp.push(ele ?? "");
    });

    setVocal(vocalTemp);
  };

  const onClear = () => {
    setVocal([]);
    initName.reset();
  };

  useEffect(() => {
    onTextChange(initialInputText);
  }, [initialInputText]);

  return (
    <ModalCommon
      title="Edit Lyric Line"
      onClose={() => {
        onTextChange(initialInputText);
        handleClose();
      }}
      open={(open ?? false) && selectedLineIndex !== null}
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
            onClick={handleSave}
            color="primary"
            size="sm"
            icon={<SquarePen></SquarePen>}
          >
            Edit
          </ButtonCommon>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="edit-line-input"
            className="text-sm font-medium text-foreground mb-1 block"
          >
            Edit (use | to separate words):
          </label>
          <div className="flex gap-2">
            <InputCommon
              id="edit-line-input"
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => onTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <ButtonCommon
              size="sm"
              disabled={inputText.length <= 0}
              icon={<Sparkles />}
              color="success"
              className="text-nowrap"
              onClick={cutText}
            >
              ตัดคำ
            </ButtonCommon>
          </div>
        </div>
        <div className="p-4 border rounded-md">
          <div
            className={`flex justify-between items-center ${
              vocal.length > 0 ? "mb-4" : ""
            }`}
          >
            <div className="flex gap-2">
              <ButtonCommon
                onClick={autoThaiToKaraoke}
                color="primary"
                size="sm"
                icon={<WandSparkles></WandSparkles>}
              >
                ออโต้ซับ
              </ButtonCommon>
              <ButtonCommon
                onClick={onClear}
                disabled={vocal.length == 0}
                color="secondary"
                size="sm"
                icon={<Eraser></Eraser>}
              >
                ล้าง
              </ButtonCommon>
            </div>
          </div>
          <Form
            form={initName}
            onFinish={(values) => {
              console.log(values);
            }}
            onFormChange={onVocalChange}
          >
            <div className="grid grid-cols-3 lg:grid-cols-4 w-fit gap-2">
              {vocal.map((label, index) => {
                return (
                  <div
                    key={`vocal-list-${index}`}
                    className="p-1 border bg-raised rounded-lg"
                  >
                    <Form.Item
                      className="w-fit"
                      label={textSplited[index] + " :"}
                      name={`comment-${index}`}
                    >
                      {(field) => (
                        <InputCommon
                          placeholder={`Eng Sub ${index + 1}`}
                          {...field}
                        />
                      )}
                    </Form.Item>
                  </div>
                );
              })}
            </div>
          </Form>
        </div>
      </div>
    </ModalCommon>
  );
}
