"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Editor preferences.
 *
 * These are per-machine, not per-project: latency depends on the sound card and
 * headphones, playback rate on how fast the person stamping can keep up. They
 * persist to localStorage so a reload does not throw the timing feel away.
 */
export interface EditorSettings {
  /** Language used by the editor chrome. */
  uiLocale: "th" | "en";

  /** Font used by the application chrome. */
  uiFontId: "noto-thai" | "system" | `custom:${string}`;

  /** Font used by lyrics Canvas renderers. */
  lyricsFontId: "noto-thai" | "system" | `custom:${string}`;

  /**
   * Output latency in milliseconds.
   *
   * The single most important setting in a timing tool: audio leaves the
   * scheduler before it reaches the ear, so a stamp taken "on the beat" lands
   * late by exactly this much. The timer worker subtracts it, which pulls both
   * the highlight and every recorded timestamp back into line with what is
   * heard. Bluetooth headphones commonly need 150-250ms.
   */
  latencyMs: number;

  /** Seconds of lead-in when starting to time from a line. */
  preRollSeconds: number;

  /** Playback speed. Slowing down makes dense lyrics stampable. */
  playbackRate: number;

  /** Shared Web Audio master gain, 0..1. */
  masterVolume: number;

  /** Audio worklet/script-processor block used by the MIDI renderer. */
  midiBufferSize: number;

  /** Font size of the karaoke preview, in px. */
  previewFontSize: number;

  /** Follow the playing line while the transport runs. */
  autoScroll: boolean;

  set: <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => void;
  reset: () => void;
}

const DEFAULTS = {
  uiLocale: "th",
  uiFontId: "noto-thai",
  lyricsFontId: "noto-thai",
  latencyMs: 0,
  preRollSeconds: 0.3,
  playbackRate: 1,
  masterVolume: 0.3,
  midiBufferSize: 16384,
  previewFontSize: 20,
  autoScroll: true,
} as const;

export const useSettingsStore = create<EditorSettings>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (key, value) => set({ [key]: value } as Partial<EditorSettings>),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: "next-lyr.settings",
      // Only persist the values; the actions are recreated on load.
      partialize: ({ uiLocale, uiFontId, lyricsFontId, latencyMs, preRollSeconds, playbackRate, masterVolume, midiBufferSize, previewFontSize, autoScroll }) => ({
        uiLocale,
        uiFontId,
        lyricsFontId,
        latencyMs,
        preRollSeconds,
        playbackRate,
        masterVolume,
        midiBufferSize,
        previewFontSize,
        autoScroll,
      }),
    }
  )
);

export const SETTINGS_DEFAULTS = DEFAULTS;
