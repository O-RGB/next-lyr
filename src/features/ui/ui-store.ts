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

export type ConfirmTone = "info" | "danger";
export type ConfirmKind = "alert" | "confirm";

export interface ConfirmOptions {
  title: string;
  description: string;
  tone?: ConfirmTone;
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface AlertOptions {
  title: string;
  description: string;
  tone?: ConfirmTone;
  confirmLabel?: string;
}

interface ConfirmRequest extends ConfirmOptions {
  kind: ConfirmKind;
  resolve: (confirmed: boolean) => void;
}

interface UiState {
  dialog: DialogName;
  openDialog: (dialog: DialogName) => void;
  confirmRequest: ConfirmRequest | null;
  requestConfirm: (options: ConfirmOptions) => Promise<boolean>;
  requestAlert: (options: AlertOptions) => Promise<void>;
  resolveConfirm: (confirmed: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  dialog: null,
  openDialog: (dialog) => set({ dialog }),
  confirmRequest: null,
  requestConfirm: (options) =>
    new Promise((resolve) => {
      set((state) => {
        state.confirmRequest?.resolve(false);
        return { confirmRequest: { ...options, kind: "confirm", resolve } };
      });
    }),
  requestAlert: (options) =>
    new Promise((resolve) => {
      set((state) => {
        state.confirmRequest?.resolve(false);
        return {
          confirmRequest: {
            ...options,
            kind: "alert",
            resolve: () => resolve(),
          },
        };
      });
    }),
  resolveConfirm: (confirmed) =>
    set((state) => {
      state.confirmRequest?.resolve(confirmed);
      return { confirmRequest: null };
    }),
}));
