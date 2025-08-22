import { create } from "zustand";

interface ModalState {
  isMetadataOpen: boolean;
  isPreviewOpen: boolean;
  openMetadata: () => void;
  closeMetadata: () => void;
  openPreview: () => void;
  closePreview: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isMetadataOpen: false,
  isPreviewOpen: false,
  openMetadata: () => set({ isMetadataOpen: true }),
  closeMetadata: () => set({ isMetadataOpen: false }),
  openPreview: () => set({ isPreviewOpen: true }),
  closePreview: () => set({ isPreviewOpen: false }),
}));
