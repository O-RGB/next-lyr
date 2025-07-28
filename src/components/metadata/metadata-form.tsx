import ButtonCommon from "../common/button";
import { FaSave } from "react-icons/fa";
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
} from "@/modules/midi-klyr-parser/lib/processor";
import { useEffect } from "react";
import { useKaraokeStore } from "@/stores/karaoke-store";
import InputNumberCommon from "../common/data-input/input-number";

type Props = {
  metadata: SongInfo | null;
  onMetadataChange: (metadata: Partial<SongInfo>) => void;
};

export default function MetadataForm({ metadata, onMetadataChange }: Props) {
  const midiInfo = useKaraokeStore((state) => state.midiInfo);
  const initName = Form.useForm({
    defaultValues: metadata || {
      TITLE: "",
      KEY: "C",
      TEMPO: "",
      ARTIST_TYPE: "M",
      ALBUM: "",
      ARTIST: "",
      AUTHOR: "",
      GENRE: "",
      CREATOR: "",
      COMPANY: "",
      LANGUAGE: "THAI",
      YEAR: "",
      VOCAL_CHANNEL: "9",
    },
  });

  useEffect(() => {
    if (metadata) {
      const keys = Object.keys(metadata);
      for (let index = 0; index < keys.length; index++) {
        const data: any = keys[index];
        initName.setValue(data, (metadata as any)[data]);
      }
    }
  }, [metadata]);
  return (
    <Card className="bg-white/50 p-4 rounded-lg">
      <Form
        form={initName}
        onFinish={onMetadataChange}
        className="flex flex-col gap-0.5"
      >
        <Form.Item<SongInfo> required name="TITLE" className="w-full">
          {(field) => (
            <InputCommon
              {...field}
              disabled={!midiInfo}
              label="Song Title :"
              inputSize="sm"
            ></InputCommon>
          )}
        </Form.Item>
        <div className="flex gap-2">
          <Form.Item<SongInfo> required name="KEY" className="w-full">
            {(field) => (
              <SelectCommon
                {...field}
                disabled={!midiInfo}
                options={keyOption}
                label="Key :"
                inputSize="sm"
              ></SelectCommon>
            )}
          </Form.Item>
          <Form.Item<SongInfo> required name="TEMPO" className="w-full">
            {(field) => (
              <InputNumberCommon
                {...field}
                disabled={!midiInfo}
                label="Tempo :"
                inputSize="sm"
              ></InputNumberCommon>
            )}
          </Form.Item>
          <Form.Item<SongInfo> required name="ARTIST_TYPE" className="w-full">
            {(field) => (
              <SelectCommon
                {...field}
                disabled={!midiInfo}
                options={artistTypeOption}
                label="Gender :"
                inputSize="sm"
              ></SelectCommon>
            )}
          </Form.Item>
        </div>
        <Form.Item<SongInfo> required name="ALBUM" className="w-full">
          {(field) => (
            <InputCommon
              {...field}
              disabled={!midiInfo}
              label="Album :"
              inputSize="sm"
            ></InputCommon>
          )}
        </Form.Item>
        <Form.Item<SongInfo> required name="ARTIST" className="w-full">
          {(field) => (
            <InputCommon
              {...field}
              disabled={!midiInfo}
              label="Artist :"
              inputSize="sm"
            ></InputCommon>
          )}
        </Form.Item>
        <Form.Item<SongInfo> required name="AUTHOR" className="w-full">
          {(field) => (
            <InputCommon
              {...field}
              disabled={!midiInfo}
              label="Composer :"
              inputSize="sm"
            ></InputCommon>
          )}
        </Form.Item>
        <Form.Item<SongInfo> required name="GENRE" className="w-full">
          {(field) => (
            <InputCommon
              {...field}
              disabled={!midiInfo}
              label="Rhythm/Genre :"
              inputSize="sm"
            ></InputCommon>
          )}
        </Form.Item>
        <Form.Item<SongInfo> required name="CREATOR" className="w-full">
          {(field) => (
            <InputCommon
              {...field}
              disabled={!midiInfo}
              label="Creator :"
              inputSize="sm"
            ></InputCommon>
          )}
        </Form.Item>
        <Form.Item<SongInfo> required name="COMPANY" className="w-full">
          {(field) => (
            <InputCommon
              {...field}
              disabled={!midiInfo}
              label="Music Label :"
              inputSize="sm"
            ></InputCommon>
          )}
        </Form.Item>
        <Form.Item<SongInfo> required name="LANGUAGE" className="w-full">
          {(field) => (
            <SelectCommon
              {...field}
              disabled={!midiInfo}
              options={languageOption}
              label="Language :"
              inputSize="sm"
            ></SelectCommon>
          )}
        </Form.Item>
        <div className="flex gap-2">
          <Form.Item<SongInfo> required name="YEAR" className="w-full">
            {(field) => (
              <InputNumberCommon
                {...field}
                disabled={!midiInfo}
                label="Year :"
                inputSize="sm"
              ></InputNumberCommon>
            )}
          </Form.Item>
          <Form.Item<SongInfo> required name="VOCAL_CHANNEL" className="w-full">
            {(field) => (
              <SelectCommon
                {...field}
                disabled={!midiInfo}
                options={vocalChannelOption}
                label="Vocal Channel :"
                inputSize="sm"
              ></SelectCommon>
            )}
          </Form.Item>
        </div>
        <div className="w-full">
          <ButtonCommon className="w-full" type="submit" icon={<FaSave />}>
            ตกลง
          </ButtonCommon>
        </div>
      </Form>
    </Card>
  );
}
