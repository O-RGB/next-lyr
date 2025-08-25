"use client";
import React, { useMemo } from "react";
import MetadataForm from "../../metadata/metadata-form";
import EditLyricLineModal from "../../modals/edit-lyrics/edit-lyric-line-modal";
import LyricsPlayer from "../../lyrics/karaoke-lyrics";
import DonateModal from "../../modals/donate";
import ModalCommon from "../../common/modal";
import PlayerHost from "../player-host";
import KeyboardRender from "../keybord-render";
import PanelTools from "./panel-tools";
import { useKaraokeStore } from "../../../stores/karaoke-store";
import { FaMusic, FaListAlt } from "react-icons/fa";
import { FloatingButtonGroup } from "../../common/floating-button";
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

const FLOATING_ACTIONS_CONFIG = [
  {
    icon: <FaMusic size={24} />,
    label: "Lyrics Preview",
    className: "bg-purple-600",
    action: "preview" as const,
  },
  {
    icon: <FaListAlt size={24} />,
    label: "Metadata",
    className: "bg-indigo-600",
    action: "metadata" as const,
  },
];

const LyrEditerPanel: React.FC = () => {
  const isEditModalOpen = useKaraokeStore((state) => state.isEditModalOpen);
  const isMetadataOpen = useModalStore((state) => state.isMetadataOpen);
  const isPreviewOpen = useModalStore((state) => state.isPreviewOpen);
  const openMetadata = useModalStore((state) => state.openMetadata);
  const closeMetadata = useModalStore((state) => state.closeMetadata);
  const openPreview = useModalStore((state) => state.openPreview);
  const closePreview = useModalStore((state) => state.closePreview);

  const floatingActions = useMemo(() => {
    return FLOATING_ACTIONS_CONFIG.map((config) => ({
      icon: config.icon,
      onClick: () => {
        if (config.action === "preview") {
          openPreview();
        } else {
          openMetadata();
        }
      },
      label: config.label,
      className: config.className,
    }));
  }, [openPreview, openMetadata]);

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
