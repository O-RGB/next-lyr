"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import CommonPlayerStyle from "@/components/common/player";
import { useSettingsStore } from "@/features/settings/settings-store";
import { clipPlayer } from "@/lib/karaoke-engine/clip-player";
import { audioEngine } from "@/lib/karaoke-engine/engine";
import { transport } from "@/lib/karaoke-engine/transport";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { useTimerStore } from "@/timer-worker/store";

const timer = useTimerStore.getState;
const AUDIO_ASSET_ID = "legacy-editor-audio";
const AUDIO_TRACK_ID = "legacy-editor-audio-track";
const AUDIO_CLIP_ID = "legacy-editor-audio-clip";

async function readBlobDuration(blob: Blob): Promise<number | null> {
  const url = URL.createObjectURL(blob);
  const audio = document.createElement("audio");
  audio.preload = "metadata";
  audio.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      audio.addEventListener("loadedmetadata", () => resolve(), { once: true });
      audio.addEventListener("error", () => reject(new Error("Invalid audio file")), {
        once: true,
      });
      audio.load();
    });
    return Number.isFinite(audio.duration) ? audio.duration : null;
  } finally {
    URL.revokeObjectURL(url);
    audio.removeAttribute("src");
  }
}

export type AudioPlayerRef = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => Promise<void>;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
};

type Props = {
  src: string | null;
  file?: File | null;
  onReady?: () => void;
};

/** Uses the same sample-clock transport as MIDI, with one decoded clip. */
const AudioPlayer = forwardRef<AudioPlayerRef, Props>(
  ({ src, file, onReady }, ref) => {
    const sourceDuration = useKaraokeStore(
      (state) => state.playerState.duration
    );
    const setGlobalIsPlaying = useKaraokeStore(
      (state) => state.actions.setIsPlaying
    );
    const midiBufferSize = useSettingsStore((state) => state.midiBufferSize);
    const [isPlaying, setIsPlaying] = useState(false);
    const [fileName, setFileName] = useState("");
    const [duration, setDuration] = useState(sourceDuration ?? 0);
    const blobRef = useRef<Blob | null>(null);
    const durationRef = useRef(0);
    const midiBufferSizeRef = useRef(midiBufferSize);
    const onReadyRef = useRef(onReady);

    useEffect(() => {
      onReadyRef.current = onReady;
    }, [onReady]);

    useEffect(() => {
      midiBufferSizeRef.current = midiBufferSize;
      if (!blobRef.current || durationRef.current <= 0) return;
      const track = {
        id: AUDIO_TRACK_ID,
        kind: "audio" as const,
        name: "Audio",
        volume: 1,
        pan: 0,
        muted: false,
        soloed: false,
      };
      const clip = {
        id: AUDIO_CLIP_ID,
        trackId: AUDIO_TRACK_ID,
        assetId: AUDIO_ASSET_ID,
        startSec: 0,
        offsetSec: 0,
        durationSec: durationRef.current,
        gain: 1,
        fadeInSec: 0,
        fadeOutSec: 0,
      };
      transport.setArrangement(
        [track],
        [clip],
        durationRef.current,
        120,
        4,
        midiBufferSize
      );
    }, [midiBufferSize]);

    useEffect(() => {
      timer().initWorker({
        mode: "Time",
        clock: () => audioEngine.exactCurrentTime || performance.now() / 1000,
        position: () => (transport.playing ? transport.position : null),
      });

      const applyTimingCompensation = () => {
        timer().updateLatency(
          audioEngine.hardwareOutputLatencySeconds +
            useSettingsStore.getState().latencyMs / 1000
        );
      };
      applyTimingCompensation();

      const unsubscribe = transport.subscribe((state) => {
        const playing = state === "playing";
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
        clipPlayer.dispose();
        audioEngine.dispose();
      };
    }, [setGlobalIsPlaying]);

    useEffect(() => {
      if (!sourceDuration) return;
      setDuration(sourceDuration);
    }, [sourceDuration]);

    useEffect(() => {
      let cancelled = false;
      const prepare = async () => {
        transport.stop();
        let blob: Blob | null = file ?? null;
        if (!blob && src) {
          const response = await fetch(src);
          if (!response.ok) throw new Error("Unable to read the audio file");
          blob = await response.blob();
        }
        if (!blob || cancelled) return;

        blobRef.current = blob;
        const detectedDuration =
          sourceDuration ?? (await readBlobDuration(blob));
        const clipDuration = Math.max(0.01, detectedDuration ?? 1);
        durationRef.current = clipDuration;
        const track = {
          id: AUDIO_TRACK_ID,
          kind: "audio" as const,
          name: "Audio",
          volume: 1,
          pan: 0,
          muted: false,
          soloed: false,
        };
        const clip = {
          id: AUDIO_CLIP_ID,
          trackId: AUDIO_TRACK_ID,
          assetId: AUDIO_ASSET_ID,
          startSec: 0,
          offsetSec: 0,
          durationSec: clipDuration,
          gain: 1,
          fadeInSec: 0,
          fadeOutSec: 0,
        };

        clipPlayer.setBlobs(new Map([[AUDIO_ASSET_ID, blob]]));
        transport.setArrangement(
          [track],
          [clip],
          clipDuration,
          120,
          4,
          midiBufferSizeRef.current
        );
        setFileName(file?.name ?? "Audio");
        setDuration(clipDuration);
        onReadyRef.current?.();
      };

      void prepare().catch((error: unknown) => {
        if (!cancelled) {
          console.error("Error preparing audio engine:", error);
          alert(error instanceof Error ? error.message : "Could not prepare audio");
        }
      });
      return () => {
        cancelled = true;
      };
    }, [file, sourceDuration, src]);

    useImperativeHandle(ref, () => ({
      play: () => {
        void transport.play().catch((error: unknown) => {
          console.error("Unable to start audio playback:", error);
        });
      },
      pause: () => transport.pause(),
      seek: (time) => {
        const wasPlaying = transport.playing;
        const pending = transport.seek(time);
        if (wasPlaying) {
          return pending.then(() => timer().seekTimerAt(time, transport.audioAnchor));
        }
        timer().seekTimer(time);
        return Promise.resolve();
      },
      getCurrentTime: () => timer().presentationValue,
      isPlaying: () => transport.playing,
      setPlaybackRate: (rate) => transport.setPlaybackRate(rate),
      setVolume: (volume) => audioEngine.setMasterVolume(volume),
    }), []);

    return (
      <CommonPlayerStyle
        fileName={fileName}
        isPlaying={isPlaying}
        onPlayPause={() => {
          if (transport.playing) transport.pause();
          else void transport.play();
        }}
        onStop={() => {
          transport.stop();
          timer().seekTimer(0);
        }}
        onSeek={(time) => {
          const pending = transport.seek(time);
          if (transport.playing) {
            void pending.then(() => timer().seekTimerAt(time, transport.audioAnchor));
          } else {
            timer().seekTimer(time);
          }
        }}
        duration={duration}
      />
    );
  }
);

AudioPlayer.displayName = "AudioPlayer";
export default AudioPlayer;
