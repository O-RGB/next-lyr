import Form from "../common/data-input/form";
import Card from "../common/card";
import SelectCommon from "../common/data-input/select";
import React, { useEffect, useLayoutEffect } from "react";
import { useKaraokeStore } from "@/stores/karaoke-store";
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

type Props = {
  adding?: boolean;
  card?: boolean;
  requiredFirst?: boolean;
  initMetadata?: SongInfo;
  onFieldChange?: (metadata: Partial<SongInfo>) => void;
  inputSize?: "sm" | "md" | "lg" | undefined;
  className?: string;
  disabled?: boolean;
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
}: Props) {
  const mode = useKaraokeStore((s) => s.mode);
  const midiData = useKaraokeStore((s) => s.playerState.midi);
  const setMetadata = useKaraokeStore((state) => state.actions.setMetadata);

  const midiInfo = mode === "midi" ? midiData : true;
  const midi = mode === "midi" ? midiData : true;

  const initName = Form.useForm({
    defaultValues: {
      ...useKaraokeStore.getState().metadata,
    },
  });

  const handleBlurUpdate = () => {
    const currentValues = initName.getValues();
    const typedValues: Partial<SongInfo> = {
      ...currentValues,
      KEY: currentValues.KEY as KEY,
      ARTIST_TYPE: currentValues.ARTIST_TYPE as ARTIST_TYPE,
      LANGUAGE: currentValues.LANGUAGE as LANGUAGE,
      VOCAL_CHANNEL: currentValues.VOCAL_CHANNEL as VOCAL_CHANNEL,
    };

    // Moving focus between fields must not be treated as an edit. In
    // particular, setMetadata also rebuilds the lyrics document and history,
    // which makes unrelated parts of the editor (including its header) react
    // to a plain input click.
    const previousMetadata = useKaraokeStore.getState().metadata;
    const changed = (Object.keys(typedValues) as (keyof SongInfo)[]).some(
      (key) => previousMetadata?.[key] !== typedValues[key]
    );
    if (!changed) return;

    setMetadata(typedValues);
    onFieldChange?.(typedValues);
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
    <Form form={initName} onFinish={() => {}} className={className}>
        <Form.Item<SongInfo>
          required
          name="TITLE"
          className={`w-full h-full ${requiredFirst ? "order-1" : ""}`}
        >
            {(field) => (
              <InputCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={(!midiInfo && !midi && adding === false) || disabled}
                label="Song Title :"
                inputSize={inputSize}
              />
            )}
          </Form.Item>
          <div
            className={`grid grid-cols-3 gap-2 ${
              requiredFirst ? "order-3" : ""
            }`}
          >
            <Form.Item<SongInfo> required name="KEY" className="w-full h-full">
              {(field) => (
                <SelectCommon
                  {...field}
                  onBlur={(e) => {
                    field.onBlur();
                    handleBlurUpdate();
                  }}
                  disabled={
                    (!midiInfo && !midi && adding === false) || disabled
                  }
                  options={keyOption}
                  label="Key :"
                  inputSize={inputSize}
                />
              )}
            </Form.Item>
            <Form.Item<SongInfo>
              required
              name="TEMPO"
              className="w-full h-full"
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
                  label="Tempo :"
                  inputSize={inputSize}
                />
              )}
            </Form.Item>
            <Form.Item<SongInfo>
              required
              name="ARTIST_TYPE"
              className="w-full h-full"
            >
              {(field) => (
                <SelectCommon
                  {...field}
                  onBlur={(e) => {
                    field.onBlur();
                    handleBlurUpdate();
                  }}
                  disabled={
                    (!midiInfo && !midi && adding === false) || disabled
                  }
                  options={artistTypeOption}
                  label="Gender :"
                  inputSize={inputSize}
                />
              )}
            </Form.Item>
          </div>
          {requiredFirst && (
            <div className="order-10 border-t border-line pt-3 text-xs font-semibold text-muted-foreground">
              ข้อมูลเพิ่มเติม
            </div>
          )}
          <Form.Item
            required={!requiredFirst}
            name="ALBUM"
            className={`w-full h-full ${requiredFirst ? "order-11" : ""}`}
          >
            {(field) => (
              <InputCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={(!midiInfo && !midi && adding === false) || disabled}
                label="Album :"
                inputSize={inputSize}
              />
            )}
          </Form.Item>
          <Form.Item<SongInfo>
            required
            name="ARTIST"
            className={`w-full h-full ${requiredFirst ? "order-2" : ""}`}
          >
            {(field) => (
              <InputCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={(!midiInfo && !midi && adding === false) || disabled}
                label="Artist :"
                inputSize={inputSize}
              />
            )}
          </Form.Item>
          <Form.Item
            required={!requiredFirst}
            name="AUTHOR"
            className={`w-full h-full ${requiredFirst ? "order-12" : ""}`}
          >
            {(field) => (
              <InputCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={(!midiInfo && !midi && adding === false) || disabled}
                label="Composer :"
                inputSize={inputSize}
              />
            )}
          </Form.Item>
          <Form.Item
            required={!requiredFirst}
            name="GENRE"
            className={`w-full h-full ${requiredFirst ? "order-13" : ""}`}
          >
            {(field) => (
              <InputCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={(!midiInfo && !midi && adding === false) || disabled}
                label="Rhythm/Genre :"
                inputSize={inputSize}
              />
            )}
          </Form.Item>
          <Form.Item<SongInfo>
            required={!requiredFirst}
            name="CREATOR"
            className={`w-full h-full ${requiredFirst ? "order-14" : ""}`}
          >
            {(field) => (
              <InputCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={(!midiInfo && !midi && adding === false) || disabled}
                label="Creator :"
                inputSize={inputSize}
              />
            )}
          </Form.Item>
          <Form.Item<SongInfo>
            required={!requiredFirst}
            name="COMPANY"
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
                label="Music Label :"
                inputSize={inputSize}
              />
            )}
          </Form.Item>
          <Form.Item<SongInfo>
            required
            name="LANGUAGE"
            className={`w-full h-full ${requiredFirst ? "order-4" : ""}`}
          >
            {(field) => (
              <SelectCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={(!midiInfo && !midi && adding === false) || disabled}
                options={languageOption}
                label="Language :"
                inputSize={inputSize}
              />
            )}
          </Form.Item>
          <div className={requiredFirst ? "contents" : "flex gap-2"}>
            <Form.Item
              required={!requiredFirst}
              name="YEAR"
              className={`w-full h-full ${requiredFirst ? "order-16" : ""}`}
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
                  label="Year :"
                  inputSize={inputSize}
                />
              )}
            </Form.Item>
            <Form.Item<SongInfo>
              name="VOCAL_CHANNEL"
              required
              className={`w-full h-full ${requiredFirst ? "order-5" : ""}`}
            >
              {(field) => (
                <SelectCommon
                  {...field}
                  onBlur={(e) => {
                    field.onBlur();
                    handleBlurUpdate();
                  }}
                  disabled={
                    (!midiInfo && !midi && adding === false) || disabled
                  }
                  options={vocalChannelOption}
                  label="Vocal Channel :"
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
