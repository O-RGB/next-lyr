"use client";

import { WallpaperEditor } from "@/modules/wallpaper/wallpaper-editor";
import AddLyricLineModal from "@/components/modals/add-lyrics/add-lyric-line-modal";
import EditLyricLineModal from "@/components/modals/edit-lyrics/edit-lyric-line-modal";
import DonateModal from "@/components/modals/donate";
import { useKaraokeStore } from "@/stores/karaoke-store";
import ChordEditModal from "@/components/modals/chord";

export function ProjectDialogs() {
  const isEditModalOpen = useKaraokeStore((state) => state.isEditModalOpen);
  const isAddModalOpen = useKaraokeStore((state) => state.isAddModalOpen);

  return (
    <>
      <DonateModal />
      <WallpaperEditor />
      <EditLyricLineModal open={isEditModalOpen} />
      <AddLyricLineModal open={isAddModalOpen} />
      <ChordEditModal />
    </>
  );
}
