"use client";

import AddLyricLineModal from "@/components/modals/add-lyrics/add-lyric-line-modal";
import EditLyricLineModal from "@/components/modals/edit-lyrics/edit-lyric-line-modal";
import DonateModal from "@/components/modals/donate";
import { useKaraokeStore } from "@/stores/karaoke-store";

export function EditorDialogs() {
  const isEditModalOpen = useKaraokeStore((state) => state.isEditModalOpen);
  const isAddModalOpen = useKaraokeStore((state) => state.isAddModalOpen);

  return (
    <>
      <DonateModal />
      <EditLyricLineModal open={isEditModalOpen} />
      <AddLyricLineModal open={isAddModalOpen} />
    </>
  );
}
