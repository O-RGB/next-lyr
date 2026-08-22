"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import CommonPlayerStyle from "@/components/common/player";
import { midiDurationSeconds, midiTickToSeconds } from "@/lib/karaoke-engine/midi-clock";
import { audioEngine } from "@/lib/karaoke-engine/engine";
import { midiSynths } from "@/lib/karaoke-engine/midi-synth";
import { transport } from "@/lib/karaoke-engine/transport";
import type { Track } from "@/lib/karaoke-engine/types";
import {
  DEFAULT_SOUNDFONT_ID,
  readSoundfontBlob,
} from "@/lib/soundfonts";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { useSettingsStore } from "@/features/settings/settings-store";
import { useUiStore } from "@/features/ui/ui-store";
import { useTimerStore } from "@/timer-worker/store";
import type { IMidiParseResult } from "@/lib/karaoke/midi/types";

const timer = useTimerStore.getState;

function tracksForMidi(midi: IMidiParseResult): Track[] {
  const channels = new Set<number>();
  for (const track of midi.tracks) {
    for (const event of track) {
      if (event.type !== "channel") continue;
      const channel = event.status & 0x0f;
      if ((event.status >> 4) >= 8 && (event.status >> 4) <= 0xe) {
        channels.add(channel);
      }
    }
  }
  if (channels.size === 0) channels.add(0);

  return [...channels].sort((left, right) => left - right).map((channel) => ({
    id: `midi-channel-${channel}`,
    kind: "midi" as const,
    name: `MIDI ${channel + 1}`,
    volume: 1,
    pan: 0,
    muted: false,
    soloed: false,
    midiChannel: channel,
  }));
}

export type MidiPlayerRef = {
  play: () => void;
  pause: () => void;
  seek: (tick: number) => Promise<void>;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
};

interface MidiPlayerProps {
  file?: File | null;
  onReady?: () => void;
}

/**
 * Compatibility shell for the lyrics editor.
 * The old SMF player is gone; this component only translates the editor's
 * tick-based API to the shared sample-clock transport.
 */
const MidiPlayer = forwardRef<MidiPlayerRef, MidiPlayerProps>(
  ({ file, onReady }, ref) => {
    const midiInfo = useKaraokeStore((state) => state.playerState.midi);
    const projectId = useKaraokeStore((state) => state.projectId);
    const activeSoundfontId = useKaraokeStore(
      (state) => state.activeSoundfontId
    );
    const requestAlert = useUiStore((state) => state.requestAlert);
    const soundfontLibraryKey = useKaraokeStore((state) =>
      state.soundfonts
        .map((entry) => `${entry.id}:${entry.fileName}:${entry.revision ?? ""}`)
        .join("|")
    );
    const setGlobalIsPlaying = useKaraokeStore(
      (state) => state.actions.setIsPlaying
    );
    const midiBufferSize = useSettingsStore((state) => state.midiBufferSize);
    const latencyMs = useSettingsStore((state) => state.latencyMs);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState("");
    const [duration, setDuration] = useState(0);
    const arrangementRef = useRef<Track[]>([]);
    const midiInfoRef = useRef<IMidiParseResult | null>(null);
    const durationSecondsRef = useRef(0);
    const midiBufferSizeRef = useRef(midiBufferSize);
    const onReadyRef = useRef(onReady);

    const applyTimingCompensation = useCallback(() => {
      const userLatencyMs = useSettingsStore.getState().latencyMs;
      midiSynths.setUserLatencyOffset(userLatencyMs);
      timer().updateLatency(midiSynths.uiTimerLatencySeconds);
    }, []);

    useEffect(() => {
      onReadyRef.current = onReady;
    }, [onReady]);

    useEffect(() => {
      timer().initWorker({
        mode: "Tick",
        clock: () => audioEngine.exactCurrentTime || performance.now() / 1000,
      });
      applyTimingCompensation();

      const unsubscribe = transport.subscribe((state) => {
        const playing = state === "playing";
        setIsLoading(state === "loading");
        setIsPlaying(playing);
        setGlobalIsPlaying(playing);
        if (playing) {
          applyTimingCompensation();
          timer().scheduleStartAt(
            transport.audioAnchor,
            transport.audioAnchorPosition
          );
        }
        else if (state === "stopped") timer().stopTimer();
      });

      return () => {
        unsubscribe();
        timer().terminateWorker();
        transport.dispose();
        midiSynths.dispose();
        audioEngine.dispose();
      };
    }, [applyTimingCompensation, setGlobalIsPlaying]);

    useEffect(() => {
      applyTimingCompensation();
    }, [applyTimingCompensation, latencyMs]);

    useEffect(() => {
      if (!file || !midiInfo) return;
      let cancelled = false;
      transport.stop();
      const tracks = tracksForMidi(midiInfo);
      const ppq = midiInfo.ticksPerBeat;
      const durationSec = midiDurationSeconds(
        midiInfo.duration,
        ppq,
        midiInfo.tempos
      );
      const firstTempo = midiInfo.tempos?.ranges[0]?.value.value.bpm ?? 120;
      const beatsPerBar = midiInfo.timeSignatures[0]?.numerator ?? 4;

      midiInfoRef.current = midiInfo;
      arrangementRef.current = tracks;
      durationSecondsRef.current = durationSec;
      transport.setArrangement(
        tracks,
        [],
        durationSec,
        firstTempo,
        beatsPerBar,
        midiBufferSizeRef.current
      );
      timer().updatePpq(ppq);
      timer().updateTempoMap(midiInfo.tempos);
      timer().updateTimeSignatures(midiInfo.timeSignatures);
      timer().updateFirstNote(midiInfo.firstNote);
      timer().updateDuration(midiInfo.duration, "ticks");
      timer().resetTimer();
      setFileName(file.name);
      setDuration(midiInfo.duration);

      void (async () => {
        const soundfontProjectId = projectId ?? "session";
        const soundfont =
          (await readSoundfontBlob(soundfontProjectId, activeSoundfontId)) ??
          (await readSoundfontBlob(soundfontProjectId, DEFAULT_SOUNDFONT_ID));
        if (!soundfont) {
          throw new Error("ไม่พบไฟล์ SoundFont ที่เลือก");
        }
        await midiSynths.setFiles(file, soundfont);
        applyTimingCompensation();
      })()
        .then(() => {
          if (!cancelled) onReadyRef.current?.();
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            console.error("Error preparing MIDI engine:", error);
            void requestAlert({
              title: "เตรียมเสียง MIDI ไม่สำเร็จ",
              description:
                error instanceof Error ? error.message : "Could not prepare MIDI",
              tone: "danger",
            });
          }
        });

      return () => {
        cancelled = true;
      };
    }, [activeSoundfontId, applyTimingCompensation, file, midiInfo, projectId, requestAlert, soundfontLibraryKey]);

    useEffect(() => {
      midiBufferSizeRef.current = midiBufferSize;
      const midi = midiInfoRef.current;
      if (!midi || arrangementRef.current.length === 0) return;
      transport.setArrangement(
        arrangementRef.current,
        [],
        durationSecondsRef.current,
        midi.tempos?.ranges[0]?.value.value.bpm ?? 120,
        midi.timeSignatures[0]?.numerator ?? 4,
        midiBufferSize
      );
      applyTimingCompensation();
    }, [applyTimingCompensation, midiBufferSize]);

    const seek = useCallback((tick: number): Promise<void> => {
      const midi = midiInfoRef.current;
      if (!midi) return Promise.resolve();
      const seconds = midiTickToSeconds(tick, midi.ticksPerBeat, midi.tempos);
      const wasPlaying = transport.playing;
      // Freeze the UI clock at the requested tick immediately. The transport
      // now silences its old schedule and prepares a future audio boundary;
      // the timer must not continue through the previous line while waiting.
      if (wasPlaying) timer().stopTimer();
      timer().seekTicks(tick);
      const pending = transport.seek(seconds);
      return pending;
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        play: () => {
          void transport.play().catch((error: unknown) => {
            console.error("Unable to start MIDI playback:", error);
          });
        },
        pause: () => transport.pause(),
        seek,
        // The editor store is intentionally mirrored at 1Hz for React UI.
        // Imperative controls still need the exact compensated playhead.
        getCurrentTime: () => timer().presentationValue,
        isPlaying: () => transport.playing,
        setPlaybackRate: (rate) => transport.setPlaybackRate(rate),
        setVolume: (volume) => {
          audioEngine.setMasterVolume(volume);
          midiSynths.setMidiVolume(volume);
        },
      }),
      [seek]
    );

    const handlePlayPause = () => {
      if (transport.playing) transport.pause();
      else void transport.play();
    };

    const handleStop = () => {
      transport.stop();
      timer().seekTicks(0);
    };

    return (
      <CommonPlayerStyle
        fileName={fileName}
        isPlaying={isPlaying}
        isLoading={isLoading}
        loadingLabel="กำลังเตรียม MIDI engine..."
        onPlayPause={handlePlayPause}
        onStop={handleStop}
        onSeek={seek}
        duration={duration}
      />
    );
  }
);

MidiPlayer.displayName = "MidiPlayer";
export default MidiPlayer;
