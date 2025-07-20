import { Card } from "../common/card";
import Input from "../common/input";

type Props = {
  metadata: { title: string; artist: string };
  // Type นี้ถูกต้องแล้ว คือรับ object ไม่ใช่ function
  onMetadataChange: (metadata: { title: string; artist: string }) => void;
};

export default function MetadataForm({ metadata, onMetadataChange }: Props) {
  return (
    <Card className="bg-white/50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-3">Song Information</h3>
      <div className="space-y-3">
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
              // ✅ แก้ไข: ส่ง object ใหม่กลับไป โดยใช้ค่าเดิมจาก prop `metadata`
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
              // ✅ แก้ไข: ส่ง object ใหม่กลับไปเช่นกัน
              onMetadataChange({ ...metadata, artist: e.target.value })
            }
            placeholder="Artist Name"
          />
        </div>
      </div>
    </Card>
  );
}
