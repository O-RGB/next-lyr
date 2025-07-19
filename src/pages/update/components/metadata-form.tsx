import type { Dispatch, SetStateAction } from "react";
import { Card } from "./common/card";
import Input from "./common/input";

type Props = {
  metadata: { title: string; artist: string };
  onMetadataChange: Dispatch<SetStateAction<{ title: string; artist: string }>>;
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
              onMetadataChange((prev) => ({ ...prev, title: e.target.value }))
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
              onMetadataChange((prev) => ({ ...prev, artist: e.target.value }))
            }
            placeholder="Artist Name"
          />
        </div>
      </div>
    </Card>
  );
}

// Ensure Input component has basic styling if not already present
// update/components/common/input.tsx
// const Input: React.FC<InputProps> = ({ className, ...props }) => {
//   return (
//     <input {...props} type="text" className={`w-full ${className}`} />
//   );
// };
