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
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useKaraokeStore } from "@/stores/karaoke-store";
import InputNumberCommon from "../common/data-input/input-number";

type Props = {
  metadata: SongInfo | null;
  onMetadataChange: (metadata: Partial<SongInfo>) => void;
};

export default function MetadataForm({ metadata, onMetadataChange }: Props) {
  const midiInfo = useKaraokeStore((state) => state.midiInfo);
  const rawFile = useKaraokeStore((state) => state.rawFile);

  // ใช้ ref เพื่อเก็บ callback ล่าสุด
  const onMetadataChangeRef = useRef(onMetadataChange);

  // อัปเดต ref เมื่อ prop เปลี่ยน
  useEffect(() => {
    onMetadataChangeRef.current = onMetadataChange;
  }, [onMetadataChange]);

  const initName = Form.useForm({
    defaultValues: {
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

  // ใช้ throttle/debounce เพื่อลดการเรียก callback
  const handleFormChange = useCallback((values: Partial<SongInfo>) => {
    console.log(values);
    // เรียกใช้ callback จาก ref
    if (onMetadataChangeRef.current) {
      onMetadataChangeRef.current(values);
    }
  }, []); // ไม่มี dependency เพราะใช้ ref

  useLayoutEffect(() => {
    if (metadata) {
      const keys = Object.keys(metadata);
      for (let index = 0; index < keys.length; index++) {
        const data: any = keys[index];
        initName.setValue(data, (metadata as any)[data]);
      }
    }
  }, [metadata, initName]);

  return (
    <Card className="bg-white/50 p-4 rounded-lg">
      <Form
        form={initName}
        onFinish={() => {}}
        onFormChange={handleFormChange}
        className="flex flex-col gap-0.5"
      >
        <Form.Item<SongInfo> required name="TITLE" className="w-full">
          {(field) => (
            <InputCommon
              {...field}
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
                disabled={!midiInfo && !rawFile}
                label="Year :"
                inputSize="sm"
              />
            )}
          </Form.Item>
          <Form.Item<SongInfo> required name="VOCAL_CHANNEL" className="w-full">
            {(field) => (
              <SelectCommon
                {...field}
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
  );
}
