"use client";

import { useEffect } from "react";

import { usePlayerSetupStore } from "@/hooks/usePlayerSetup";
import { audioEngine } from "@/lib/karaoke-engine/engine";
import { midiSynths } from "@/lib/karaoke-engine/midi-synth";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { useTimerStore } from "@/timer-worker/store";
import { useSettingsStore } from "./settings-store";

/**
 * Pushes editor preferences into the pieces that act on them.
 *
 * Kept apart from the settings dialog so the values apply whether they were
 * changed in the dialog, restored from localStorage on boot, or set from
 * anywhere else later.
 */
export function useSettingsBridge(): void {
  const latencyMs = useSettingsStore((state) => state.latencyMs);
  const playbackRate = useSettingsStore((state) => state.playbackRate);
  const masterVolume = useSettingsStore((state) => state.masterVolume);
  const playerControls = usePlayerSetupStore((state) => state.playerControls);
  const mode = useKaraokeStore((state) => state.mode);

  // Match karaoke-web-online's single presentation-latency value. MIDI adds
  // its ScriptProcessor block; decoded audio and MIDI both add the browser's
  // output latency. Video/YouTube do not share this AudioContext, so only the
  // user calibration applies there.
  useEffect(() => {
    midiSynths.setUserLatencyOffset(latencyMs);
    const automaticLatency =
      mode === "midi"
        ? midiSynths.uiTimerLatencySeconds
        : mode === "mp3"
          ? audioEngine.hardwareOutputLatencySeconds + latencyMs / 1000
          : latencyMs / 1000;
    useTimerStore.getState().updateLatency(automaticLatency);
  }, [latencyMs, mode, playerControls]);

  useEffect(() => {
    // The transport changes the scheduled audio, while the timer maps the
    // AudioContext clock back to song time. Both sides need the same rate.
    useTimerStore.getState().updatePlaybackRate(playbackRate);
    playerControls?.setPlaybackRate?.(playbackRate);
  }, [playbackRate, playerControls]);

  useEffect(() => {
    playerControls?.setVolume?.(masterVolume);
  }, [masterVolume, playerControls]);
}
