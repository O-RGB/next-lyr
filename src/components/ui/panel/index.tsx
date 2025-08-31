"use client";
import React from "react";
import EditLyricLineModal from "../../modals/edit-lyrics/edit-lyric-line-modal";
import DonateModal from "../../modals/donate";
import KeyboardRender from "../keybord-render";
import PanelTools from "./panel-tools";
import AddLyricLineModal from "@/components/modals/add-lyrics/add-lyric-line-modal";
import { useKaraokeStore } from "../../../stores/karaoke-store";

export const calculateSeekTime = (
  word: any,
  lyricsData: any[],
  mode: string | null,
  index: number
): number | null => {
  if (mode === "midi") {
    return word.start;
  }

  if (word.start !== null) {
    return word.start;
  }

  const lastTimedWord = lyricsData
    .slice(0, index)
    .filter((w) => w.start !== null)
    .pop();

  const result = lastTimedWord?.start ?? 0;

  return result;
};

const LyrEditerPanel: React.FC = () => {
  const isEditModalOpen = useKaraokeStore((state) => state.isEditModalOpen);
  const isAddModalOpen = useKaraokeStore((state) => state.isAddModalOpen);
  return (
    <>
      <DonateModal />
      <KeyboardRender />
      <main className="flex flex-col h-[calc(100dvh-36px)]">
        <PanelTools></PanelTools>

        <EditLyricLineModal open={isEditModalOpen} />
        <AddLyricLineModal open={isAddModalOpen} />
      </main>
    </>
  );
};

export default LyrEditerPanel;
