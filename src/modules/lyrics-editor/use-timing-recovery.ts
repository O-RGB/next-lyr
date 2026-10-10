"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";

/** Small recoverable drafts; no React render or full audio-file write per stamp. */
export function useTimingRecovery() {
  useEffect(() => {
    let saveFailed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const save = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      const state = useKaraokeStore.getState();
      if (!state.projectId || (!state.isTimingActive && state.editingLineIndex === null)) return;
      void state.actions.saveTimingDraft().then(() => { saveFailed = false; }).catch((error) => {
        if (!saveFailed) toast.error(text(useSettingsStore.getState().uiLocale,
          "บันทึกร่างไม่สำเร็จ งานยังอยู่ในหน้านี้", "Could not save the draft; your work is still on this page"));
        saveFailed = true;
        console.error("Could not save timing draft:", error);
      });
    };
    const unsubscribe = useKaraokeStore.subscribe((state, previous) => {
      if (state.projectId !== previous.projectId && timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (state.timingBuffer !== previous.timingBuffer ||
        state.lyricsData !== previous.lyricsData ||
        (previous.isPlaying && !state.isPlaying)) {
        // Throttle rather than debounce: fast, continuous stamping still saves.
        if (!timer) timer = setTimeout(save, 500);
      }
    });
    const onHidden = () => {
      if (document.visibilityState !== "hidden") return;
      const state = useKaraokeStore.getState();
      if (state.isTimingActive || state.editingLineIndex !== null) {
        usePlayerHandlersStore.getState().handlePauseTiming();
        save();
      }
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", save);
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", save);
      if (timer) clearTimeout(timer);
    };
  }, []);
}
