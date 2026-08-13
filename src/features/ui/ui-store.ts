"use client";

import { create } from "zustand";

/**
 * Which app-level dialog is on screen.
 *
 * One slot rather than a boolean per dialog: opening a second dialog closes the
 * first by construction, so two can never stack on top of each other.
 */
export type DialogName =
  | "settings"
  | "shortcuts"
  | "history"
  | "projects"
  | "lyrics"
  | "export"
  | null;

interface UiState {
  dialog: DialogName;
  openDialog: (dialog: DialogName) => void;
}

export const useUiStore = create<UiState>((set) => ({
  dialog: null,
  openDialog: (dialog) => set({ dialog }),
}));
