import Form from "../common/data-input/form";
import Card from "../common/card";
import SelectCommon from "../common/data-input/select";
import InputCommon from "../common/data-input/input";
import {
  artistTypeOption,
  keyOption,
  languageOption,
  SongInfo,
  vocalChannelOption,
  KEY,
  ARTIST_TYPE,
  LANGUAGE,
  VOCAL_CHANNEL,
} from "@/modules/midi-klyr-parser/lib/processor";
import { useLayoutEffect } from "react";
import { useKaraokeStore } from "@/stores/karaoke-store";
import InputNumberCommon from "../common/data-input/input-number";

type Props = {};

export default function MetadataForm({}: Props) {
  const metadata = useKaraokeStore((state) => state.metadata);
  const actions = useKaraokeStore((state) => state.actions);
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
    actions.setMetadata(typedValues);
  };

  useLayoutEffect(() => {
    if (metadata) {
      initName.reset(metadata);
    }
  }, [metadata, initName]);

  return (
    <div>
      <Card className="bg-white/50 p-4 rounded-lg">
        <Form
          form={initName}
          onFinish={() => {}}
          className="flex flex-col gap-0.5"
        >
          <Form.Item<SongInfo> required name="TITLE" className="w-full">
            {(field) => (
              <InputCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={!midiInfo && !rawFile}
                label="Song Title :"
                inputSize="sm"
              />
            )}
          </Form.Item>
          <div className="flex gap-2">
            <Form.Item<SongInfo> required name="KEY" className="w-full">
              {(field) => (
                <SelectCommon
                  {...field}
                  onBlur={(e) => {
                    field.onBlur();
                    handleBlurUpdate();
                  }}
                  disabled={!midiInfo && !rawFile}
                  options={keyOption}
                  label="Key :"
                  inputSize="sm"
                />
              )}
            </Form.Item>
            <Form.Item<SongInfo> required name="TEMPO" className="w-full">
              {(field) => (
                <InputNumberCommon
                  {...field}
                  onBlur={(e) => {
                    field.onBlur();
                    handleBlurUpdate();
                  }}
                  disabled={!midiInfo && !rawFile}
                  label="Tempo :"
                  inputSize="sm"
                />
              )}
            </Form.Item>
            <Form.Item<SongInfo> required name="ARTIST_TYPE" className="w-full">
              {(field) => (
                <SelectCommon
                  {...field}
                  onBlur={(e) => {
                    field.onBlur();
                    handleBlurUpdate();
                  }}
                  disabled={!midiInfo && !rawFile}
                  options={artistTypeOption}
                  label="Gender :"
                  inputSize="sm"
                />
              )}
            </Form.Item>
          </div>
          <Form.Item<SongInfo> required name="ALBUM" className="w-full">
            {(field) => (
              <InputCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={!midiInfo && !rawFile}
                label="Album :"
                inputSize="sm"
              />
            )}
          </Form.Item>
          <Form.Item<SongInfo> required name="ARTIST" className="w-full">
            {(field) => (
              <InputCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={!midiInfo && !rawFile}
                label="Artist :"
                inputSize="sm"
              />
            )}
          </Form.Item>
          <Form.Item<SongInfo> required name="AUTHOR" className="w-full">
            {(field) => (
              <InputCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={!midiInfo && !rawFile}
                label="Composer :"
                inputSize="sm"
              />
            )}
          </Form.Item>
          <Form.Item<SongInfo> required name="GENRE" className="w-full">
            {(field) => (
              <InputCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={!midiInfo && !rawFile}
                label="Rhythm/Genre :"
                inputSize="sm"
              />
            )}
          </Form.Item>
          <Form.Item<SongInfo> required name="CREATOR" className="w-full">
            {(field) => (
              <InputCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={!midiInfo && !rawFile}
                label="Creator :"
                inputSize="sm"
              />
            )}
          </Form.Item>
          <Form.Item<SongInfo> required name="COMPANY" className="w-full">
            {(field) => (
              <InputCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={!midiInfo && !rawFile}
                label="Music Label :"
                inputSize="sm"
              />
            )}
          </Form.Item>
          <Form.Item<SongInfo> required name="LANGUAGE" className="w-full">
            {(field) => (
              <SelectCommon
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  handleBlurUpdate();
                }}
                disabled={!midiInfo && !rawFile}
                options={languageOption}
                label="Language :"
                inputSize="sm"
              />
            )}
          </Form.Item>
          <div className="flex gap-2">
            <Form.Item<SongInfo> required name="YEAR" className="w-full">
              {(field) => (
                <InputNumberCommon
                  {...field}
                  onBlur={(e) => {
                    field.onBlur();
                    handleBlurUpdate();
                  }}
                  disabled={!midiInfo && !rawFile}
                  label="Year :"
                  inputSize="sm"
                />
              )}
            </Form.Item>
            <Form.Item<SongInfo>
              required
              name="VOCAL_CHANNEL"
              className="w-full"
            >
              {(field) => (
                <SelectCommon
                  {...field}
                  onBlur={(e) => {
                    field.onBlur();
                    handleBlurUpdate();
                  }}
                  disabled={!midiInfo && !rawFile}
                  options={vocalChannelOption}
                  label="Vocal Channel :"
                  inputSize="sm"
                />
              )}
            </Form.Item>
          </div>
        </Form>
      </Card>
    </div>
  );
}
