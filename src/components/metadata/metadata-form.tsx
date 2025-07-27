import ButtonCommon from "../common/button";
import { FaSave } from "react-icons/fa";
import Form from "../common/form";
import InputCommon from "../input/input";
import Card from "../common/card";

type Props = {
  metadata: { title: string; artist: string };
  // Type นี้ถูกต้องแล้ว คือรับ object ไม่ใช่ function
  onMetadataChange: (metadata: { title: string; artist: string }) => void;
};

export default function MetadataForm({ metadata, onMetadataChange }: Props) {
  const initName = Form.useForm({
    defaultValues: {
      nickname: undefined,
    },
  });
  return (
    <Card className="bg-white/50 p-4 rounded-lg">
      <Form
        form={initName}
        onFinish={(values) => {
          console.log("values", values, values.nickname);
          // peerInitialize(values.nickname);
        }}
        className="flex flex-col gap-2"
      >
        <Form.Item required name="nickname" className="w-full">
          {(field) => (
            <InputCommon
              {...field}
              placeholder="Title :"
              autoFocus
              inputSize="sm"
            ></InputCommon>
          )}
        </Form.Item>
        <div className="flex gap-2">
          <Form.Item required name="nickname" className="w-full">
            {(field) => (
              <InputCommon
                {...field}
                placeholder="Key :"
                autoFocus
                inputSize="sm"
              ></InputCommon>
            )}
          </Form.Item>
          <Form.Item required name="nickname" className="w-full">
            {(field) => (
              <InputCommon
                {...field}
                placeholder="Tempo :"
                autoFocus
                inputSize="sm"
              ></InputCommon>
            )}
          </Form.Item>
          <Form.Item required name="nickname" className="w-full">
            {(field) => (
              <InputCommon
                {...field}
                placeholder="M/W :"
                autoFocus
                inputSize="sm"
              ></InputCommon>
            )}
          </Form.Item>
        </div>
        <Form.Item required name="nickname" className="w-full">
          {(field) => (
            <InputCommon
              {...field}
              placeholder="Title :"
              autoFocus
              inputSize="sm"
            ></InputCommon>
          )}
        </Form.Item>
        <Form.Item required name="nickname" className="w-full">
          {(field) => (
            <InputCommon
              {...field}
              placeholder="Title :"
              autoFocus
              inputSize="sm"
            ></InputCommon>
          )}
        </Form.Item>
        <Form.Item required name="nickname" className="w-full">
          {(field) => (
            <InputCommon
              {...field}
              placeholder="Title :"
              autoFocus
              inputSize="sm"
            ></InputCommon>
          )}
        </Form.Item>
        <Form.Item required name="nickname" className="w-full">
          {(field) => (
            <InputCommon
              {...field}
              placeholder="Title :"
              autoFocus
              inputSize="sm"
            ></InputCommon>
          )}
        </Form.Item>
        <Form.Item required name="nickname" className="w-full">
          {(field) => (
            <InputCommon
              {...field}
              placeholder="Title :"
              autoFocus
              inputSize="sm"
            ></InputCommon>
          )}
        </Form.Item>
        <Form.Item required name="nickname" className="w-full">
          {(field) => (
            <InputCommon
              {...field}
              placeholder="Title :"
              autoFocus
              inputSize="sm"
            ></InputCommon>
          )}
        </Form.Item>
        <Form.Item required name="nickname" className="w-full">
          {(field) => (
            <InputCommon
              {...field}
              placeholder="Title :"
              autoFocus
              inputSize="sm"
            ></InputCommon>
          )}
        </Form.Item>
        <div className="flex gap-2">
          <Form.Item required name="nickname" className="w-full">
            {(field) => (
              <InputCommon
                {...field}
                placeholder="Key :"
                autoFocus
                inputSize="sm"
              ></InputCommon>
            )}
          </Form.Item>
          <Form.Item required name="nickname" className="w-full">
            {(field) => (
              <InputCommon
                {...field}
                placeholder="Tempo :"
                autoFocus
                inputSize="sm"
              ></InputCommon>
            )}
          </Form.Item>
        </div>
        <div className="w-full">
          <ButtonCommon className="w-full" type="submit" icon={<FaSave />}>
            ตกลง
          </ButtonCommon>
        </div>
      </Form>
      {/* <div className="space-y-3">
        <div className="grid grid-cols-4 items-center gap-4">
          <label
            htmlFor="song-title"
            className="text-right text-sm font-medium"
          >
            Title
          </label>
          <Input
            id="song-title"
            className="col-span-3 p-2 border rounded-md"
            value={metadata.title}
            onChange={(e) =>
              onMetadataChange({ ...metadata, title: e.target.value })
            }
            placeholder="Song Title"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <label
            htmlFor="song-artist"
            className="text-right text-sm font-medium"
          >
            Artist
          </label>
          <Input
            id="song-artist"
            className="col-span-3 p-2 border rounded-md"
            value={metadata.artist}
            onChange={(e) =>
              onMetadataChange({ ...metadata, artist: e.target.value })
            }
            placeholder="Artist Name"
          />
        </div>
      </div> */}
    </Card>
  );
}
