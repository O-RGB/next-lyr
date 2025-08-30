import LyricsGrid from "../lyrics/lyrics-grid";
import TimeStampe from "./timestamp";
import ChordsBlock from "./chords-block";
import Card from "../common/card";
import useIsMobile from "@/hooks/useIsMobile";
import { MobileControls } from "../ui/panel/panel-tools";
import LyricsPlayer from "../lyrics/karaoke-lyrics";
import { useState } from "react";
import ButtonCommon from "../common/button";
import { MdOutlineLyrics, MdOutlineStickyNote2 } from "react-icons/md";
import { FaNotEqual } from "react-icons/fa";

type Props = {};

export default function LyricsPanel({}: Props) {
  const isMobile = useIsMobile();

  const [preview, setPreview] = useState<boolean>(false);

  return (
    <Card className="flex flex-col p-2 lg:p-4 h-full bg-gray-50 gap-2">
      <div className="flex justify-between">
        <div className="text-lg font-semibold">Lyric</div>
        <div>
          <TimeStampe />
        </div>
      </div>

      {isMobile ? (
        <div className="flex flex-col gap-2 w-full h-full overflow-hidden">
          <div className="h-[100px] flex-shrink-0">
            <ChordsBlock />
          </div>
          <div className="flex-grow min-h-0 overflow-auto ">
            <LyricsGrid />
          </div>
          {preview && (
            <div className="bg-violet-500 rounded-md">
              <LyricsPlayer
                textStyle={{
                  fontSize: 20,
                }}
              />
            </div>
          )}

          <div className="flex justify-end gap-1.5 -mb-1.5">
            <ButtonCommon
              onClick={() => {
                setPreview((v) => !v);
              }}
              color={preview ? "warning" : "white"}
              size="xs"
              icon={<MdOutlineLyrics></MdOutlineLyrics>}
            >
              Preview
            </ButtonCommon>
            <ButtonCommon
              color="white"
              size="xs"
              icon={<MdOutlineStickyNote2></MdOutlineStickyNote2>}
            >
              Metadata
            </ButtonCommon>
          </div>

          <div className="flex-shrink-0">
            <MobileControls />
          </div>
        </div>
      ) : (
        <div className="flex flex-row w-full gap-2 h-full overflow-hidden">
          <div className="flex-grow min-w-0 overflow-auto">
            <LyricsGrid />
          </div>
          <div className="h-full w-[150px] flex-shrink-0">
            <ChordsBlock />
          </div>
        </div>
      )}
    </Card>
  );
}
