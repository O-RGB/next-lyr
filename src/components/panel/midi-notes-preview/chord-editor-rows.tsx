"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChordEvent } from "@/lib/karaoke/midi/types";
import {
  detectMidiChords,
  type SuggestedChord,
} from "@/lib/karaoke/chords/detection";
import { COMMON_CHORD_NAMES } from "@/lib/karaoke/chords/parse";
import {
  midiSynths,
  type MidiPreviewProgram,
} from "@/lib/karaoke-engine/midi-synth";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { useTimerStore } from "@/timer-worker/store";

export interface ChordDetectionSnapshot {
  suggestions: SuggestedChord[];
  detecting: boolean;
  error: string | null;
  confidence: number | null;
  keyLabel: string | null;
  onAcceptSuggestion: (suggestion: SuggestedChord) => void;
  onAcceptAll: () => void;
  onAudition: (name: string) => void;
}

interface UseChordDetectionEditorOptions {
  midiBuffer: ArrayBuffer | null;
  resolveSuggestionTick?: (suggestion: SuggestedChord) => number;
}

export interface ChordDetectionEditorController {
  requested: boolean;
  suggestions: SuggestedChord[];
  availableSuggestions: SuggestedChord[];
  detecting: boolean;
  error: string | null;
  confidence: number | null;
  keyLabel: string | null;
  auditionEnabled: boolean;
  routing: AuditionRouting;
  auditionLoading: boolean;
  auditionError: string | null;
  snapshot: ChordDetectionSnapshot;
  startDetection: () => void;
  acceptAll: () => void;
  audition: (name: string) => void;
  setAuditionEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setRouting: React.Dispatch<React.SetStateAction<AuditionRouting>>;
  openManualChord: () => void;
}

type AuditionRouting = "stereo" | "split";

const DETECTION_LOADING_MS = 900;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function useChordDetectionEditor({
  midiBuffer,
  resolveSuggestionTick,
}: UseChordDetectionEditorOptions): ChordDetectionEditorController {
  const chordsData = useKaraokeStore((state) => state.chordsData);
  const openChordModal = useKaraokeStore(
    (state) => state.actions.openChordModal
  );
  const addChord = useKaraokeStore((state) => state.actions.addChord);
  const addChords = useKaraokeStore((state) => state.actions.addChords);
  const [requested, setRequested] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedChord[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [keyLabel, setKeyLabel] = useState<string | null>(null);
  const [auditionEnabled, setAuditionEnabled] = useState(true);
  const [routing, setRouting] = useState<AuditionRouting>("stereo");
  const [auditionLoading, setAuditionLoading] = useState(false);
  const [auditionError, setAuditionError] = useState<string | null>(null);
  const detectionRunRef = useRef(0);
  const auditionRequestRef = useRef(0);

  useEffect(() => {
    detectionRunRef.current += 1;
    setRequested(false);
    setSuggestions([]);
    setDetectionError(null);
    setConfidence(null);
    setKeyLabel(null);
    setDetecting(false);
  }, [midiBuffer]);

  const startDetection = useCallback(() => {
    if (detecting || !midiBuffer || midiBuffer.byteLength === 0) return;

    const run = ++detectionRunRef.current;
    setRequested(true);
    setDetecting(true);
    setDetectionError(null);
    setSuggestions([]);

    void Promise.all([
      detectMidiChords(midiBuffer.slice(0), {}),
      wait(DETECTION_LOADING_MS),
    ])
      .then(([result]) => {
        if (run !== detectionRunRef.current) return;
        setSuggestions(result.chords);
        setConfidence(result.overallConfidence);
        setKeyLabel(`${result.keyName} ${result.keyMode}`);
      })
      .catch((error: unknown) => {
        if (run !== detectionRunRef.current) return;
        setSuggestions([]);
        setDetectionError(
          error instanceof Error ? error.message : "คำนวณคอร์ดไม่สำเร็จ"
        );
      })
      .finally(() => {
        if (run === detectionRunRef.current) setDetecting(false);
      });
  }, [detecting, midiBuffer]);

  useEffect(() => {
    if (!auditionEnabled) {
      auditionRequestRef.current += 1;
      midiSynths.stopAudition();
    }
    return () => {
      auditionRequestRef.current += 1;
      midiSynths.stopAudition();
    };
  }, [auditionEnabled]);

  const acceptedTicks = useMemo(
    () => new Set(chordsData.map((chord) => chord.tick)),
    [chordsData]
  );
  const availableSuggestions = useMemo(
    () =>
      suggestions.filter(
        (suggestion) =>
          !acceptedTicks.has(
            resolveSuggestionTick?.(suggestion) ?? suggestion.tick
          )
      ),
    [acceptedTicks, resolveSuggestionTick, suggestions]
  );

  const audition = useCallback(
    async (name: string) => {
      if (!auditionEnabled) return;
      const request = ++auditionRequestRef.current;
      setAuditionError(null);
      setAuditionLoading(true);
      try {
        // Even a manual suggestion preview goes through the engine's
        // sequencer queue. A UI callback must never call noteOn directly,
        // otherwise a large MIDI buffer can make the preview land early.
        const played = await midiSynths.auditionChordAtPresentationDelay(
          name,
          0,
          routing
        );
        if (request !== auditionRequestRef.current || !auditionEnabled) {
          midiSynths.stopAudition();
          return;
        }
        if (!played) setAuditionError("ไม่รู้จักรูปแบบคอร์ดนี้");
      } catch (error) {
        console.error("Unable to audition chord:", error);
        setAuditionError(
          error instanceof Error ? error.message : "เปิดเสียงคอร์ดไม่สำเร็จ"
        );
      } finally {
        setAuditionLoading(false);
      }
    },
    [auditionEnabled, routing]
  );

  const acceptSuggestion = useCallback(
    (suggestion: SuggestedChord) => {
      const chord: ChordEvent = {
        chord: suggestion.chord,
        tick: resolveSuggestionTick?.(suggestion) ?? suggestion.tick,
      };
      addChord(chord);
      if (auditionEnabled) void audition(suggestion.chord);
    },
    [addChord, audition, auditionEnabled, resolveSuggestionTick]
  );

  const acceptAll = useCallback(() => {
    addChords(
      availableSuggestions.map<ChordEvent>((suggestion) => ({
        chord: suggestion.chord,
        tick: resolveSuggestionTick?.(suggestion) ?? suggestion.tick,
      }))
    );
  }, [addChords, availableSuggestions, resolveSuggestionTick]);

  const openManualChord = useCallback(() => {
    const tick = Math.max(
      0,
      Math.round(useTimerStore.getState().presentationValue)
    );
    openChordModal(undefined, tick);
  }, [openChordModal]);

  const snapshot = useMemo<ChordDetectionSnapshot>(
    () => ({
      suggestions,
      detecting,
      error: detectionError,
      confidence,
      keyLabel,
      onAcceptSuggestion: acceptSuggestion,
      onAcceptAll: acceptAll,
      onAudition: (name) => void audition(name),
    }),
    [
      acceptAll,
      acceptSuggestion,
      audition,
      confidence,
      detecting,
      detectionError,
      keyLabel,
      suggestions,
    ]
  );

  return {
    requested,
    suggestions,
    availableSuggestions,
    detecting,
    error: detectionError,
    confidence,
    keyLabel,
    auditionEnabled,
    routing,
    auditionLoading,
    auditionError,
    snapshot,
    startDetection,
    acceptAll,
    audition,
    setAuditionEnabled,
    setRouting,
    openManualChord,
  };
}

interface ChordDetectionHeaderProps {
  requested: boolean;
  detecting: boolean;
  error: string | null;
  confidence: number | null;
  keyLabel: string | null;
  listenActive: boolean;
  listenDisabled: boolean;
  onStart: () => void;
  onToggleListen: () => void;
  onCollapse: () => void;
}

export const ChordDetectionHeader: React.FC<ChordDetectionHeaderProps> = ({
  requested,
  detecting,
  error,
  confidence,
  keyLabel,
  listenActive,
  listenDisabled,
  onStart,
  onToggleListen,
  onCollapse,
}) => {
  if (!requested) {
    return (
      <button
        type="button"
        className="h-full w-full px-2 py-2 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/10"
        onClick={onStart}
      >
        ตรวจจับอัตโนมัติ
      </button>
    );
  }

  return (
    <div className="flex min-w-0 items-center justify-between gap-1 px-2 py-1.5">
      <span className="min-w-0 truncate text-left text-[10px] font-semibold">
        {detecting
          ? "AI กำลังตรวจจับคอร์ด…"
          : error
            ? "ตรวจจับคอร์ดไม่สำเร็จ"
            : keyLabel
              ? `Detect · ${keyLabel} · ${Math.round((confidence ?? 0) * 100)}%`
              : "ตรวจจับคอร์ด"}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          className={`inline-flex size-5 items-center justify-center rounded border text-[10px] transition-colors ${
            listenActive
              ? "border-primary/60 bg-primary/15 text-primary"
              : "border-line-soft bg-panel text-muted-foreground hover:bg-panel-2 hover:text-foreground"
          } disabled:cursor-not-allowed disabled:opacity-40`}
          onClick={onToggleListen}
          disabled={listenDisabled}
          aria-label={
            listenActive ? "หยุดฟังเสียง Detect" : "ฟังเสียง Detect"
          }
          aria-pressed={listenActive}
          title={listenActive ? "หยุดฟังเสียง Detect" : "ฟังเสียง Detect"}
        >
          <span aria-hidden="true">{listenActive ? "■" : "▶"}</span>
        </button>
        {detecting ? (
          <span
            className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
            aria-label="กำลังตรวจจับคอร์ด"
          />
        ) : (
          <button
            type="button"
            className="shrink-0 rounded px-1 text-muted-foreground hover:bg-panel hover:text-foreground"
            onClick={onCollapse}
            aria-label="ยุบคอลัมน์ตรวจจับคอร์ด"
            title="ยุบคอลัมน์ตรวจจับคอร์ด"
          >
            −
          </button>
        )}
      </div>
    </div>
  );
};

interface PreviewSoundControlsProps {
  programs: MidiPreviewProgram[];
  selectedBank: number;
  selectedProgram: number;
  volume: number;
  loading: boolean;
  onProgramChange: (bank: number, program: number) => void;
  onVolumeChange: (volume: number) => void;
}

export const PreviewSoundControls: React.FC<PreviewSoundControlsProps> = ({
  programs,
  selectedBank,
  selectedProgram,
  volume,
  loading,
  onProgramChange,
  onVolumeChange,
}) => {
  const selectedValue = `${selectedBank}:${selectedProgram}`;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-line bg-panel-2 px-2 py-1.5 text-[10px] sm:gap-2 sm:px-3">
      <span className="text-muted-foreground">เสียง Preview</span>
      <select
        value={selectedValue}
        disabled={loading || programs.length === 0}
        onChange={(event) => {
          const [bank, program] = event.target.value.split(":").map(Number);
          if (Number.isFinite(bank) && Number.isFinite(program)) {
            onProgramChange(bank, program);
          }
        }}
        className="h-6 min-w-36 max-w-56 rounded-md border border-line bg-panel px-1 text-[10px] text-foreground disabled:opacity-50"
        aria-label="เลือกเสียง Preview จาก SoundFont"
      >
        {loading ? (
          <option value={selectedValue}>กำลังโหลดเสียง…</option>
        ) : programs.length === 0 ? (
          <option value={selectedValue}>ไม่พบเสียงใน SF2</option>
        ) : (
          programs.map((program) => (
            <option
              key={`${program.bank}:${program.program}`}
              value={`${program.bank}:${program.program}`}
            >
              {program.bank ? `${program.bank}:` : ""}
              {program.program + 1} · {program.name}
            </option>
          ))
        )}
      </select>
      <label className="flex items-center gap-1 text-muted-foreground">
        ดัง
        <input
          type="range"
          min={0}
          max={127}
          step={1}
          value={volume}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
          className="h-4 w-24 accent-primary"
          aria-label="ความดังเสียง Preview"
        />
        <span className="w-6 text-right tabular-nums">{volume}</span>
      </label>
    </div>
  );
};

interface ChordDetectionFooterProps {
  controller: ChordDetectionEditorController;
}

export const ChordDetectionFooter: React.FC<ChordDetectionFooterProps> = ({
  controller,
}) => {
  const {
    availableSuggestions,
    detecting,
    auditionEnabled,
    routing,
    auditionLoading,
    auditionError,
    acceptAll,
    audition,
    openManualChord,
    setAuditionEnabled,
    setRouting,
  } = controller;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-line bg-panel px-2 py-1.5 text-[10px] sm:gap-2 sm:px-3">
      <span className="mr-auto text-muted-foreground">
        {detecting
          ? "กำลังวิเคราะห์ MIDI…"
          : auditionError
            ? auditionError
            : `${availableSuggestions.length} คอร์ดแนะนำ`}
      </span>
      <button
        type="button"
        className="rounded-md bg-primary px-2 py-1 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
        onClick={acceptAll}
        disabled={availableSuggestions.length === 0 || detecting}
        title="รับคอร์ดแนะนำทั้งหมด"
      >
        รับทั้งหมด
      </button>
      <button
        type="button"
        className="hidden rounded-md border border-primary/50 px-2 py-1 font-semibold text-primary hover:bg-primary/10 sm:inline-flex"
        onClick={openManualChord}
        title="เพิ่มคอร์ดเองที่ tick ปัจจุบัน"
      >
        + เพิ่มเอง
      </button>
      <button
        type="button"
        className={`rounded-md px-2 py-1 font-semibold ${
          auditionEnabled
            ? "bg-primary/10 text-primary"
            : "bg-panel text-muted-foreground ring-1 ring-line-soft"
        }`}
        onClick={() => setAuditionEnabled((enabled) => !enabled)}
        aria-pressed={auditionEnabled}
        title={auditionEnabled ? "ปิดเสียง audition" : "เปิดเสียง audition"}
      >
        {auditionEnabled ? "เสียง" : "ปิดเสียง"}
      </button>
      <select
        value={routing}
        onChange={(event) => setRouting(event.target.value as AuditionRouting)}
        className="h-6 rounded-md border border-line bg-panel px-1 text-[10px] text-foreground"
        aria-label="การกระจายเสียงคอร์ด"
      >
        <option value="stereo">LR</option>
        <option value="split">L/R</option>
      </select>
      {auditionLoading && (
        <button
          type="button"
          className="max-w-32 truncate text-muted-foreground"
          onClick={() => void audition(COMMON_CHORD_NAMES[0])}
          title="กำลังเตรียม engine"
        >
          กำลังเตรียมเสียง…
        </button>
      )}
    </div>
  );
};
