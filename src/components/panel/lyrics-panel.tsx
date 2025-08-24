import LyricsGrid from "../lyrics/lyrics-grid";
import TimeStampe from "./timestamp";
import ChordsBlock from "./chords-block";
import Card from "../common/card";

type Props = {};

export default function LyricsPanel({}: Props) {
  return (
    <Card className="flex flex-col p-2 lg:p-4 h-full bg-gray-50 space-y-2">
      <div className="flex justify-between">
        <div className="text-lg font-semibold mb-2 ">Lyric</div>
        <div>
          <TimeStampe />
        </div>
      </div>

      <div className="flex flex-col-reverse md:flex-row w-full gap-2 h-full overflow-hidden">
        <div className="flex-grow min-h-0 md:min-w-0">
          <LyricsGrid />
        </div>
        <div className="h-[100px] md:h-full md:w-[150px] flex-shrink-0">
          <ChordsBlock />
        </div>
      </div>
    </Card>
  );
}
