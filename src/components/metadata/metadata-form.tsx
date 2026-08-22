import Form from "../common/data-input/form";
import Card from "../common/card";
import SelectCommon from "../common/data-input/select";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import InputNumberCommon from "../common/data-input/input-number";
import {
  ARTIST_TYPE,
  artistTypeOption,
  KEY,
  keyOption,
  LANGUAGE,
  languageOption,
  SongInfo,
  VOCAL_CHANNEL,
  vocalChannelOption,
} from "@/lib/karaoke/midi/types";
import InputCommon from "../common/data-input/input";

const REQUIRED_METADATA_KEYS = [
  "TITLE",
  "TEMPO",
  "ARTIST",
] as const;

type Props = {
  adding?: boolean;
  card?: boolean;
  requiredFirst?: boolean;
  initMetadata?: SongInfo;
  onFieldChange?: (metadata: Partial<SongInfo>) => void;
  inputSize?: "sm" | "md" | "lg" | undefined;
  className?: string;
  disabled?: boolean;
  autoSave?: boolean;
  formId?: string;
  onSave?: (metadata: Partial<SongInfo>) => void;
  requiredErrors?: Partial<Record<keyof SongInfo, string>>;
  showRequiredErrors?: boolean;
  validateRequiredOnSave?: boolean;
};

function MetadataForm({
  adding = false,
  card = true,
  requiredFirst = false,
  onFieldChange,
  initMetadata,
  inputSize = "sm",
  className = "flex flex-col gap-2 lg:p-4",
  disabled = false,
  autoSave = true,
  formId,
  onSave,
  requiredErrors,
  showRequiredErrors = false,
  validateRequiredOnSave = false,
}: Props) {
  const mode = useKaraokeStore((s) => s.mode);
  const midiData = useKaraokeStore((s) => s.playerState.midi);
  const storeMetadata = useKaraokeStore((s) => s.metadata);
  const setMetadata = useKaraokeStore((state) => state.actions.setMetadata);
  const locale = useSettingsStore((state) => state.uiLocale);
  const [localRequiredErrors, setLocalRequiredErrors] = useState<
    Partial<Record<keyof SongInfo, string>>
  >({});

  const getRequiredErrors = (value: Partial<SongInfo> | null | undefined) => {
    const errors: Partial<Record<keyof SongInfo, string>> = {};
    for (const key of REQUIRED_METADATA_KEYS) {
      if (!String(value?.[key] ?? "").trim()) {
        errors[key] = text(locale, "จำเป็นต้องกรอก", "Required");
      }
    }
    return errors;
  };

  const visibleRequiredErrors = {
    ...(showRequiredErrors ? getRequiredErrors(storeMetadata) : {}),
    ...localRequiredErrors,
    ...requiredErrors,
  };
  const fieldError = (key: keyof SongInfo) => visibleRequiredErrors[key];

  const midiInfo = mode === "midi" ? midiData : true;
  const midi = mode === "midi" ? midiData : true;

  const initName = Form.useForm({
    defaultValues: {
      ...useKaraokeStore.getState().metadata,
    },
  });

  const saveMetadata = () => {
    const currentValues = initName.getValues();
    const typedValues: Partial<SongInfo> = {
      ...currentValues,
      KEY: currentValues.KEY as KEY,
      ARTIST_TYPE: currentValues.ARTIST_TYPE as ARTIST_TYPE,
      LANGUAGE: currentValues.LANGUAGE as LANGUAGE,
      VOCAL_CHANNEL: currentValues.VOCAL_CHANNEL as VOCAL_CHANNEL,
    };

    if (validateRequiredOnSave) {
      const validationErrors = getRequiredErrors(typedValues);
      if (Object.keys(validationErrors).length > 0) {
        setLocalRequiredErrors(validationErrors);
        return;
      }
      setLocalRequiredErrors({});
    }

    // Moving focus between fields must not be treated as an edit. In
    // particular, setMetadata also rebuilds the lyrics document and history,
    // which makes unrelated parts of the editor (including its header) react
    // to a plain input click.
    const previousMetadata = useKaraokeStore.getState().metadata;
    const changed = (Object.keys(typedValues) as (keyof SongInfo)[]).some(
      (key) => previousMetadata?.[key] !== typedValues[key]
    );
    if (changed) {
      setMetadata(typedValues);
    }
    onFieldChange?.(typedValues);
    onSave?.(typedValues);
  };

  const handleBlurUpdate = () => {
    if (!autoSave) return;
    saveMetadata();
  };

  // useEffect(() => {
  //   if (initMetadata) {
  //     initName.reset(initMetadata);
  //   }
  // }, [initMetadata, initName]);

  useLayoutEffect(() => {
    if (initName.getValues("TEMPO") === "") {
      const ranges = midiData?.tempos.ranges;
      if (ranges && (ranges?.length ?? 0) > 0) {
        let bpm = ranges[0].value.value.bpm;
        if (bpm === undefined) {
          bpm = 0;
        }
        initName.setValue("TEMPO", `${bpm}`);
      }
    }
  }, [midiData?.tempos]);

  useEffect(() => {
    // Keep external project loads in sync without subscribing the whole form
    // to metadata changes. A blur save updates metadata, but must not rebuild
    // every field in this form.
    return useKaraokeStore.subscribe((next, previous) => {
      if (next.metadata !== previous.metadata && next.metadata) {
        initName.reset(next.metadata);
      }
    });
  }, [initName]);

  useEffect(() => {
    if (initMetadata) {
      initName.reset(initMetadata);
    }
  }, [initMetadata]);

  const form = (
    <Form
      form={initName}
      id={formId}
      onFinish={saveMetadata}
      className={className}
    >
        <Form.Item<SongInfo>
          required={requiredFirst}
          name="TITLE"
          className={`w-full h-full ${requiredFirst ? "order-1" : ""}`}
        >
            {(field) => (
              <InputCommon
                {...field}
                error={fieldError("TITLE")}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={(!midiInfo && !midi && adding === false) || disabled}
                label={text(locale, "ชื่อเพลง :", "Song Title :")}
                inputSize={inputSize}
              />
            )}
          </Form.Item>
          <div className={requiredFirst ? "contents" : "grid grid-cols-3 gap-2"}>
            <Form.Item<SongInfo>
              name="KEY"
              className={`w-full h-full ${requiredFirst ? "order-11" : ""}`}
            >
              {(field) => (
                <SelectCommon
                  {...field}
                  error={fieldError("KEY")}
                  onBlur={(e) => {
                    field.onBlur();
                    handleBlurUpdate();
                  }}
                  disabled={
                    (!midiInfo && !midi && adding === false) || disabled
                  }
                  options={keyOption}
                label={text(locale, "คีย์เพลง :", "Key :")}
                  inputSize={inputSize}
                />
              )}
            </Form.Item>
            <Form.Item<SongInfo>
              required={requiredFirst}
              name="TEMPO"
              className={`w-full h-full ${requiredFirst ? "order-2" : ""}`}
            >
              {(field) => (
                <InputNumberCommon
                  {...field}
                  error={fieldError("TEMPO")}
                  onBlur={(e) => {
                    field.onBlur();
                    handleBlurUpdate();
                  }}
                  disabled={
                    (!midiInfo && !midi && adding === false) || disabled
                  }
                label={text(locale, "ความเร็ว :", "Tempo :")}
                  inputSize={inputSize}
                />
              )}
            </Form.Item>
            <Form.Item<SongInfo>
              name="ARTIST_TYPE"
              className={`w-full h-full ${requiredFirst ? "order-12" : ""}`}
            >
              {(field) => (
                <SelectCommon
                  {...field}
                  error={fieldError("ARTIST_TYPE")}
                  onBlur={(e) => {
                    field.onBlur();
                    handleBlurUpdate();
                  }}
                  disabled={
                    (!midiInfo && !midi && adding === false) || disabled
                  }
                  options={artistTypeOption}
                label={text(locale, "ประเภทเสียงร้อง :", "Gender :")}
                  inputSize={inputSize}
                />
              )}
            </Form.Item>
          </div>
          {requiredFirst && (
            <div className="order-10 border-t border-line pt-3 text-xs font-semibold text-muted-foreground">
              {text(locale, "ข้อมูลเพิ่มเติม", "Additional information")}
            </div>
          )}
          <Form.Item
            name="ALBUM"
            className={`w-full h-full ${requiredFirst ? "order-15" : ""}`}
          >
            {(field) => (
              <InputCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={(!midiInfo && !midi && adding === false) || disabled}
                label={text(locale, "อัลบั้ม :", "Album :")}
                inputSize={inputSize}
              />
            )}
          </Form.Item>
          <Form.Item<SongInfo>
            required={requiredFirst}
            name="ARTIST"
            className={`w-full h-full ${requiredFirst ? "order-3" : ""}`}
          >
            {(field) => (
              <InputCommon
                {...field}
                error={fieldError("ARTIST")}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={(!midiInfo && !midi && adding === false) || disabled}
                label={text(locale, "นักร้อง :", "Artist :")}
                inputSize={inputSize}
              />
            )}
          </Form.Item>
          <Form.Item
            name="AUTHOR"
            className={`w-full h-full ${requiredFirst ? "order-16" : ""}`}
          >
            {(field) => (
              <InputCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={(!midiInfo && !midi && adding === false) || disabled}
                label={text(locale, "ผู้แต่ง :", "Composer :")}
                inputSize={inputSize}
              />
            )}
          </Form.Item>
          <Form.Item
            name="GENRE"
            className={`w-full h-full ${requiredFirst ? "order-17" : ""}`}
          >
            {(field) => (
              <InputCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={(!midiInfo && !midi && adding === false) || disabled}
                label={text(locale, "จังหวะ/แนวเพลง :", "Rhythm/Genre :")}
                inputSize={inputSize}
              />
            )}
          </Form.Item>
          <Form.Item<SongInfo>
            name="CREATOR"
            className={`w-full h-full ${requiredFirst ? "order-18" : ""}`}
          >
            {(field) => (
              <InputCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={(!midiInfo && !midi && adding === false) || disabled}
                label={text(locale, "ผู้สร้าง :", "Creator :")}
                inputSize={inputSize}
              />
            )}
          </Form.Item>
          <Form.Item<SongInfo>
            name="COMPANY"
            className={`w-full h-full ${requiredFirst ? "order-19" : ""}`}
          >
            {(field) => (
              <InputCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={(!midiInfo && !midi && adding === false) || disabled}
                label={text(locale, "ค่ายเพลง :", "Music Label :")}
                inputSize={inputSize}
              />
            )}
          </Form.Item>
          <Form.Item<SongInfo>
            name="LANGUAGE"
            className={`w-full h-full ${requiredFirst ? "order-13" : ""}`}
          >
            {(field) => (
              <SelectCommon
                {...field}
                error={fieldError("LANGUAGE")}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={(!midiInfo && !midi && adding === false) || disabled}
                options={languageOption}
                label={text(locale, "ภาษา :", "Language :")}
                inputSize={inputSize}
              />
            )}
          </Form.Item>
          <div className={requiredFirst ? "contents" : "flex gap-2"}>
            <Form.Item
              name="YEAR"
              className={`w-full h-full ${requiredFirst ? "order-20" : ""}`}
            >
              {(field) => (
                <InputNumberCommon
                  {...field}
                  onBlur={(e) => {
                    field.onBlur();
                    handleBlurUpdate();
                  }}
                  disabled={
                    (!midiInfo && !midi && adding === false) || disabled
                  }
                  label={text(locale, "ปี :", "Year :")}
                  inputSize={inputSize}
                />
              )}
            </Form.Item>
            <Form.Item<SongInfo>
              name="VOCAL_CHANNEL"
              className={`w-full h-full ${requiredFirst ? "order-14" : ""}`}
            >
              {(field) => (
                <SelectCommon
                  {...field}
                  error={fieldError("VOCAL_CHANNEL")}
                  onBlur={(e) => {
                    field.onBlur();
                    handleBlurUpdate();
                  }}
                  disabled={
                    (!midiInfo && !midi && adding === false) || disabled
                  }
                  options={vocalChannelOption}
                  label={text(locale, "ช่องเสียงร้อง :", "Vocal Channel :")}
                  inputSize={inputSize}
                />
              )}
            </Form.Item>
          </div>
    </Form>
  );

  return <div>{card ? <Card className="rounded-lg bg-panel/50">{form}</Card> : form}</div>;
}

export default React.memo(MetadataForm);
