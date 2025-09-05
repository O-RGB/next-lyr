import Form from "../common/data-input/form";
import Card from "../common/card";
import SelectCommon from "../common/data-input/select";
import InputCommon from "../common/data-input/input";
import { useEffect } from "react";
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
};

export default function MetadataForm({
  adding = false,
  onFieldChange,
  initMetadata,
  inputSize = "sm",
  className = "flex flex-col gap-2 lg:p-4",
}: Props) {
  const metadata = useKaraokeStore((s) => s.metadata);
  const setMetadata = useKaraokeStore((state) => state.actions.setMetadata);

  const midiInfo = useKaraokeStore((state) => state.playerState.midiInfo);
  const rawFile = useKaraokeStore((state) => state.playerState.rawFile);

  const initName = Form.useForm({
    defaultValues: {
      TITLE: "",
      KEY: "C" as KEY,
      TEMPO: "",
      ARTIST_TYPE: "M" as ARTIST_TYPE,
      ALBUM: "",
      ARTIST: "",
      AUTHOR: "",
      GENRE: "",
      CREATOR: "",
      COMPANY: "",
      LANGUAGE: "THAI" as LANGUAGE,
      YEAR: "",
      VOCAL_CHANNEL: "9" as VOCAL_CHANNEL,
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
    setMetadata(typedValues);
    onFieldChange?.(typedValues);
  };

  useEffect(() => {
    if (metadata) {
      initName.reset(metadata);
    }

    if (initMetadata) {
      initName.reset(initMetadata);
    }
  }, [initMetadata, initName]);

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
                disabled={!midiInfo && !rawFile && adding === false}
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
                  disabled={!midiInfo && !rawFile && adding === false}
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
                  disabled={!midiInfo && !rawFile && adding === false}
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
                  disabled={!midiInfo && !rawFile && adding === false}
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
                disabled={!midiInfo && !rawFile && adding === false}
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
                disabled={!midiInfo && !rawFile && adding === false}
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
                disabled={!midiInfo && !rawFile && adding === false}
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
                disabled={!midiInfo && !rawFile && adding === false}
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
                disabled={!midiInfo && !rawFile && adding === false}
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
                disabled={!midiInfo && !rawFile && adding === false}
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
                disabled={!midiInfo && !rawFile && adding === false}
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
                  disabled={!midiInfo && !rawFile && adding === false}
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
                  disabled={!midiInfo && !rawFile && adding === false}
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
