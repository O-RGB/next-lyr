"use client";

import { Loader2, Play, Volume2 } from "lucide-react";
import React, { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import { audioEngine } from "@/lib/karaoke-engine/engine";

interface AllowSoundProps {
  children?: React.ReactNode;
}

const STARTUP_AUDIO_SOURCE = "/sound/startup.mp3";

/**
 * Audio unlock gate.
 *
 * Browsers require a user gesture before starting Web Audio. The gate uses a
 * short startup sound to confirm that the shared audio engine is ready before
 * handing control back to the editor.
 */
const AllowSound: React.FC<AllowSoundProps> = ({ children }) => {
  const locale = useSettingsStore((state) => state.uiLocale);
  const [ended, setEnded] = useState(false);
  const [keepAlive, setKeepAlive] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(false);
  const startupAudioRef = useRef<HTMLAudioElement | null>(null);

  const enable = useCallback(async () => {
    setStarting(true);
    setError(false);

    try {
      await audioEngine.resume({
        keepAlive,
        startupAudio: startupAudioRef.current,
      });
      if (!audioEngine.isReady) throw new Error("AudioContext is not running");

      await waitForAudioEnd(startupAudioRef.current);
      setEnded(true);
    } catch (unlockError) {
      console.error("Unable to unlock audio:", unlockError);
      setError(true);
    } finally {
      setStarting(false);
    }
  }, [keepAlive]);

  return (
    <>
      {ended ? (
        children
      ) : (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-base/95 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-xl border border-line bg-panel p-5 shadow-2xl">
            <div className="mb-3.5 flex items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <Volume2 className="size-4.5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[13px] font-semibold leading-tight text-foreground">
                  {text(locale, "เปิดใช้งานเสียง", "Enable sound")}
                </h2>
                <p className="label-xs mt-0.5">NextLyricsEditor</p>
              </div>
            </div>

            <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
              {text(
                locale,
                "เบราว์เซอร์จะปิดเสียงไว้จนกว่าจะกดอนุญาต ขั้นตอนนี้ทำเพียงครั้งเดียวเพื่อให้เสียง MIDI ไฟล์เสียง และเมโทรนอมทำงานผ่านระบบเสียงเดียวกัน",
                "Your browser blocks audio until you allow it. This one-time step enables MIDI, audio files, and the metronome through the same audio engine."
              )}
            </p>

            {starting ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-3 text-[11px] font-medium text-primary">
                <Loader2 className="size-3.5 animate-spin" />
                {text(locale, "กำลังเปิดระบบเสียง...", "Starting audio...")}
              </div>
            ) : (
              <div className="space-y-2.5">
                {error ? (
                  <p className="rounded-lg border border-warn/50 bg-warn/10 px-3 py-2 text-[10px] leading-relaxed text-warn">
                    {text(
                      locale,
                      "เปิดใช้งานเสียงไม่สำเร็จ กรุณาลองอีกครั้ง",
                      "Could not enable audio. Please try again."
                    )}
                  </p>
                ) : null}

                <Button
                  className="h-10 w-full gap-2 text-[12px]"
                  onClick={() => void enable()}
                >
                  <Play className="size-3.5" />
                  {text(locale, "อนุญาตให้เล่นเสียง", "Allow sound")}
                </Button>

                <div className="rounded-lg border border-line bg-base px-2.5 py-2">
                  <p className="label-xs mb-1.5">
                    {text(locale, "ตั้งค่าเสียง", "Audio settings")}
                  </p>
                  <label className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-[11px] font-medium text-foreground">
                        {text(
                          locale,
                          "ให้ระบบเสียงทำงานต่อในเบื้องหลัง",
                          "Keep audio ready in the background"
                        )}
                      </span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-dim">
                        {text(
                          locale,
                          "ช่วยให้เสียงพร้อมทันทีเมื่อเริ่มเล่น",
                          "Keeps audio ready between plays"
                        )}
                      </span>
                    </span>
                    <Switch
                      checked={keepAlive}
                      onCheckedChange={setKeepAlive}
                      className="mt-0.5 shrink-0"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <audio
        ref={startupAudioRef}
        src={STARTUP_AUDIO_SOURCE}
        preload="auto"
        playsInline
        aria-hidden="true"
        className="hidden"
      />
    </>
  );
};

function waitForAudioEnd(audio: HTMLAudioElement | null): Promise<void> {
  if (!audio || audio.ended) return Promise.resolve();

  return new Promise((resolve) => {
    let timeout = 0;
    const finish = () => {
      audio.removeEventListener("ended", finish);
      window.clearTimeout(timeout);
      resolve();
    };

    audio.addEventListener("ended", finish, { once: true });
    const durationMs =
      Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration * 1000 + 500
        : 2000;
    timeout = window.setTimeout(finish, Math.min(5000, durationMs));
  });
}

export default AllowSound;
