"use client";
import React from "react";
import MetadataForm from "../../metadata/metadata-form";
import EditLyricLineModal from "../../modals/edit-lyrics/edit-lyric-line-modal";
import LyricsPlayer from "../../lyrics/karaoke-lyrics";
import DonateModal from "../../modals/donate";
import ModalCommon from "../../common/modal";
import PlayerHost from "../player-host";
import KeyboardRender from "../keybord-render";
import PanelTools from "./panel-tools";
import { useKaraokeStore } from "../../../stores/karaoke-store";
import { useModalStore } from "@/hooks/useModalState";

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
  const isMetadataOpen = useModalStore((state) => state.isMetadataOpen);
  const isPreviewOpen = useModalStore((state) => state.isPreviewOpen);
  const closeMetadata = useModalStore((state) => state.closeMetadata);
  const closePreview = useModalStore((state) => state.closePreview);

  return (
    <>
      <DonateModal />
      <KeyboardRender />
      <main className="flex flex-col h-[calc(100dvh-36px)]">
        <PanelTools></PanelTools>

        <ModalCommon
          open={isMetadataOpen}
          onClose={closeMetadata}
          title="Metadata"
          footer={null}
        >
          <MetadataForm />
        </ModalCommon>

        <ModalCommon
          open={isPreviewOpen}
          onClose={closePreview}
          title="Lyrics Preview"
          footer={null}
          classNames={{ modal: "!bg-gray-700" }}
        >
          <div className="flex flex-col gap-4">
            <div className="h-48 flex items-center justify-center">
              <LyricsPlayer playerControls={<PlayerHost />} />
            </div>
          </div>
        </ModalCommon>

        <EditLyricLineModal open={isEditModalOpen} />
      </main>
    </>
  );
};

export default LyrEditerPanel;
