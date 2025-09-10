import Form from "../common/data-input/form";
import Card from "../common/card";
import SelectCommon from "../common/data-input/select";
import InputCommon from "../common/data-input/input";
import { useEffect, useLayoutEffect } from "react";
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

type Props = {
  adding?: boolean;
  initMetadata?: SongInfo;
  onFieldChange?: (metadata: Partial<SongInfo>) => void;
  inputSize?: "sm" | "md" | "lg" | undefined;
  className?: string;
  disabled?: boolean;
};

export default function MetadataForm({
  adding = false,
  onFieldChange,
  initMetadata,
  inputSize = "sm",
  className = "flex flex-col gap-2 lg:p-4",
  disabled = false,
}: Props) {
  const mode = useKaraokeStore((s) => s.mode);
  const metadata = useKaraokeStore((s) => s.metadata);
  const midiData = useKaraokeStore((s) => s.playerState.midi);
  const setMetadata = useKaraokeStore((state) => state.actions.setMetadata);

  const midiInfo =
    mode === "midi" ? useKaraokeStore((state) => state.playerState.midi) : true;
  const midi =
    mode === "midi" ? useKaraokeStore((state) => state.playerState.midi) : true;

  const initName = Form.useForm({
    defaultValues: {
      ...metadata,
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
    console.log("update metadata");
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
    if (metadata) {
      initName.reset(metadata);
    }
  }, [metadata]);

  useEffect(() => {
    if (initMetadata) {
      initName.reset(initMetadata);
    }
  }, [initMetadata]);

  return (
    <div>
      <Card className="bg-white/50 rounded-lg">
        <Form form={initName} onFinish={() => {}} className={className}>
          <Form.Item<SongInfo> required name="TITLE" className="w-full h-full">
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
          <div className="flex gap-2">
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
          <Form.Item<SongInfo> required name="ALBUM" className="w-full h-full">
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
          <Form.Item<SongInfo> required name="ARTIST" className="w-full h-full">
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
          <Form.Item<SongInfo> required name="AUTHOR" className="w-full h-full">
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
          <Form.Item<SongInfo> required name="GENRE" className="w-full h-full">
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
            required
            name="CREATOR"
            className="w-full h-full"
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
            required
            name="COMPANY"
            className="w-full h-full"
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
            className="w-full h-full"
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
          <div className="flex gap-2">
            <Form.Item<SongInfo> required name="YEAR" className="w-full h-full">
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
              required
              name="VOCAL_CHANNEL"
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
                  options={vocalChannelOption}
                  label="Vocal Channel :"
                  inputSize={inputSize}
                />
              )}
            </Form.Item>
          </div>
        </Form>
      </Card>
    </div>
  );
}
