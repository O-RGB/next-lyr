"use client";

import {
  Gauge,
  Loader2,
  Moon,
  Music2,
  Plus,
  RotateCcw,
  Sun,
  Timer,
  Trash2,
  Type,
} from "lucide-react";
import { useTheme } from "next-themes";
import React, { useRef, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { useUiStore } from "@/features/ui/ui-store";
import { audioEngine } from "@/lib/karaoke-engine/engine";
import {
  MIDI_BUFFER_SIZE_OPTIONS,
  midiBufferDurationSeconds,
  normalizeMidiBufferSize,
} from "@/lib/karaoke-engine/midi-synth";
import {
  DEFAULT_SOUNDFONT_ID,
  formatSoundfontBytes,
} from "@/lib/soundfonts";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { useSettingsStore } from "./settings-store";
import { text } from "./locale";
import {
  BUILT_IN_FONTS,
  type FontSelection,
  useFontStore,
} from "./font-store";

export function SettingsDialog() {
  const dialog = useUiStore((state) => state.dialog);
  const openDialog = useUiStore((state) => state.openDialog);
  const { resolvedTheme, setTheme } = useTheme();

  const masterVolume = useSettingsStore((state) => state.masterVolume);
  const midiBufferSize = useSettingsStore((state) => state.midiBufferSize);
  const uiLocale = useSettingsStore((state) => state.uiLocale);
  const uiFontId = useSettingsStore((state) => state.uiFontId);
  const lyricsFontId = useSettingsStore((state) => state.lyricsFontId);
  const update = useSettingsStore((state) => state.set);
  const reset = useSettingsStore((state) => state.reset);
  const sampleRate = audioSampleRate();
  const midiBufferOptionIndex = Math.max(
    0,
    MIDI_BUFFER_SIZE_OPTIONS.indexOf(normalizeMidiBufferSize(midiBufferSize) as (typeof MIDI_BUFFER_SIZE_OPTIONS)[number])
  );
  const projectId = useKaraokeStore((state) => state.projectId);
  const requestConfirm = useUiStore((state) => state.requestConfirm);
  const soundfonts = useKaraokeStore((state) => state.soundfonts);
  const activeSoundfontId = useKaraokeStore(
    (state) => state.activeSoundfontId
  );
  const importSoundfont = useKaraokeStore(
    (state) => state.actions.importSoundfont
  );
  const selectSoundfont = useKaraokeStore(
    (state) => state.actions.selectSoundfont
  );
  const removeSoundfont = useKaraokeStore(
    (state) => state.actions.removeSoundfont
  );
  const soundfontInputRef = useRef<HTMLInputElement>(null);
  const [replaceSoundfontId, setReplaceSoundfontId] = useState<string | null>(
    null
  );
  const [soundfontBusy, setSoundfontBusy] = useState(false);
  const [fontBusy, setFontBusy] = useState(false);
  const editorFontInputRef = useRef<HTMLInputElement>(null);
  const customFonts = useFontStore((state) => state.customFonts);
  const importFont = useFontStore((state) => state.importFont);
  const removeFont = useFontStore((state) => state.removeFont);

  const openSoundfontPicker = (replaceId?: string) => {
    setReplaceSoundfontId(replaceId ?? null);
    soundfontInputRef.current?.click();
  };

  const handleSoundfontFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setSoundfontBusy(true);
    try {
      await importSoundfont(file, replaceSoundfontId ?? undefined);
      toast.success(
        replaceSoundfontId
          ? text(uiLocale, "เปลี่ยน SoundFont แล้ว", "SoundFont replaced")
          : text(uiLocale, "เพิ่ม SoundFont แล้ว", "SoundFont added")
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setReplaceSoundfontId(null);
      setSoundfontBusy(false);
    }
  };

  const handleRemoveSoundfont = async (soundfontId: string) => {
    const confirmed = await requestConfirm({
      title: text(uiLocale, "ลบ SoundFont หรือไม่?", "Delete SoundFont?"),
      description: text(uiLocale, "SoundFont นี้จะถูกนำออกจากโปรเจกต์", "This SoundFont will be removed from the project"),
      tone: "danger",
      confirmLabel: text(uiLocale, "ลบ SoundFont", "Delete SoundFont"),
    });
    if (!confirmed) return;
    setSoundfontBusy(true);
    try {
      await removeSoundfont(soundfontId);
      toast.success(text(uiLocale, "ลบ SoundFont แล้ว", "SoundFont deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSoundfontBusy(false);
    }
  };

  const handleEditorFontFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setFontBusy(true);
    try {
      const option = await importFont(file);
      update("uiFontId", `custom:${option.id}`);
      update("lyricsFontId", `custom:${option.id}`);
      toast.success(text(uiLocale, "เพิ่มฟอนต์แล้ว และใช้กับทั้งเว็บ", "Font added and applied across the app"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setFontBusy(false);
    }
  };

  const handleRemoveEditorFont = async (fontId: string) => {
    const confirmed = await requestConfirm({
      title: text(uiLocale, "ลบฟอนต์หรือไม่?", "Delete font?"),
      description: text(uiLocale, "ฟอนต์นี้จะถูกนำออกจากเครื่อง", "This font will be removed from this device"),
      tone: "danger",
      confirmLabel: text(uiLocale, "ลบฟอนต์", "Delete font"),
    });
    if (!confirmed) return;
    setFontBusy(true);
    try {
      await removeFont(fontId);
      if (uiFontId === `custom:${fontId}`) update("uiFontId", "noto-thai");
      if (lyricsFontId === `custom:${fontId}`) update("lyricsFontId", "noto-thai");
      toast.success(text(uiLocale, "ลบฟอนต์แล้ว", "Font deleted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setFontBusy(false);
    }
  };

  return (
    <Dialog
      open={dialog === "settings"}
      onOpenChange={(next) => openDialog(next ? "settings" : null)}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{text(uiLocale, "ตั้งค่า", "Settings")}</DialogTitle>
          <DialogDescription>
            {text(uiLocale, "ค่าการเล่นเก็บไว้ในเครื่องนี้ ส่วน SoundFont จะผูกกับโปรเจกต์", "Playback settings are stored on this device; SoundFonts belong to the project")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Section icon={<Gauge className="size-4 text-primary" />} title={text(uiLocale, "เสียง", "Audio")}>
            <SettingSlider
              label={text(uiLocale, "ระดับเสียง", "Master volume")}
              value={masterVolume}
              min={0}
              max={1}
              step={0.01}
              format={(value) => `${Math.round(value * 100)}%`}
              onChange={(value) => update("masterVolume", value)}
            />

            <Separator className="my-4" />

            <SettingSlider
              label={text(uiLocale, "บัฟเฟอร์ MIDI", "MIDI buffer")}
              hint={text(
                uiLocale,
                `ค่าต่ำตอบสนองไวขึ้น แต่ใช้ CPU มากขึ้น ค่าสูงเบากว่า • ระบบชดเชยอัตโนมัติ ${Math.round(midiBufferDurationSeconds(normalizeMidiBufferSize(midiBufferSize), sampleRate) * 1000)} ms ที่ ${Math.round(sampleRate)} Hz`,
                `Lower values respond faster but use more CPU; higher values are lighter • automatic compensation ${Math.round(midiBufferDurationSeconds(normalizeMidiBufferSize(midiBufferSize), sampleRate) * 1000)} ms at ${Math.round(sampleRate)} Hz`
              )}
              value={midiBufferOptionIndex}
              min={0}
              max={MIDI_BUFFER_SIZE_OPTIONS.length - 1}
              step={1}
              format={(value) => `${MIDI_BUFFER_SIZE_OPTIONS[Math.round(value)]} samples`}
              onChange={(value) =>
                update(
                  "midiBufferSize",
                  MIDI_BUFFER_SIZE_OPTIONS[Math.round(value)]
                )
              }
            />
          </Section>

          <Section icon={<Music2 className="size-4 text-primary" />} title={text(uiLocale, "SoundFont MIDI", "SoundFont MIDI")}>
            <input
              ref={soundfontInputRef}
              type="file"
              accept=".sf2,audio/sf2,audio/x-soundfont"
              className="hidden"
              onChange={handleSoundfontFile}
            />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1">{text(uiLocale, "ตัวที่ใช้งานอยู่", "Active SoundFont")}</span>
                <select
                  value={activeSoundfontId}
                  disabled={!projectId || soundfontBusy}
                  onChange={(event) => {
                    void selectSoundfont(event.currentTarget.value).catch(
                      (error: unknown) =>
                        toast.error(
                          error instanceof Error ? error.message : String(error)
                        )
                    );
                  }}
                  className="h-8 min-w-0 max-w-[62%] rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label={text(uiLocale, "SoundFont ที่ใช้งานอยู่", "Active SoundFont")}
                >
                  {soundfonts.map((soundfont) => (
                    <option key={soundfont.id} value={soundfont.id}>
                      {soundfont.fileName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="divide-y divide-line border border-line bg-base">
                {soundfonts.map((soundfont) => (
                  <div
                    key={soundfont.id}
                    className="flex items-center gap-2 px-2.5 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {soundfont.fileName}
                        {soundfont.id === activeSoundfontId ? (
                          <span className="ml-2 text-xs text-primary">{text(uiLocale, "ใช้งานอยู่", "Active")}</span>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {soundfont.id === DEFAULT_SOUNDFONT_ID
                          ? text(uiLocale, "ติดตั้งมากับโปรแกรม", "Built in")
                          : formatSoundfontBytes(soundfont.bytes)}
                      </div>
                    </div>

                    {soundfont.id !== DEFAULT_SOUNDFONT_ID ? (
                      <>
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={!projectId || soundfontBusy}
                          onClick={() => openSoundfontPicker(soundfont.id)}
                          title={text(uiLocale, "เปลี่ยนไฟล์ SoundFont", "Replace SoundFont file")}
                        >
                          {text(uiLocale, "เปลี่ยน", "Replace")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          disabled={!projectId || soundfontBusy}
                          onClick={() => void handleRemoveSoundfont(soundfont.id)}
                          title={text(uiLocale, "ลบ SoundFont", "Delete SoundFont")}
                          aria-label={text(uiLocale, `ลบ ${soundfont.fileName}`, `Delete ${soundfont.fileName}`)}
                        >
                          <Trash2 />
                        </Button>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!projectId || soundfontBusy}
                  onClick={() => openSoundfontPicker()}
                >
                  {soundfontBusy ? <Loader2 className="animate-spin" /> : <Plus />}
                  {text(uiLocale, "เพิ่มไฟล์ .sf2", "Add .sf2 file")}
                </Button>
                <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                  {text(uiLocale, "รองรับไฟล์ขนาดไม่เกิน 500 MB และจะถูกเก็บแยกตามโปรเจกต์", "Files up to 500 MB are supported and stored per project")}
                </p>
              </div>
            </div>
          </Section>

          <Section icon={<Type className="size-4 text-primary" />} title={text(uiLocale, "การแสดงผล", "Display")}>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="min-w-0 flex-1">{text(uiLocale, "ภาษาหน้าโปรแกรม", "Interface language")}</span>
                <select
                  value={uiLocale}
                  onChange={(event) =>
                    update("uiLocale", event.currentTarget.value as "th" | "en")
                  }
                  className="h-8 min-w-36 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="th">{text(uiLocale, "ไทย", "Thai")}</option>
                  <option value="en">English</option>
                </select>
              </div>

              <FontSelect
                label={text(uiLocale, "ฟอนต์หน้าโปรแกรม", "Interface font")}
                value={uiFontId}
                customFonts={customFonts}
                onChange={(value) => update("uiFontId", value)}
              />
              <FontSelect
                label={text(uiLocale, "ฟอนต์เนื้อร้อง / Canvas", "Lyrics / Canvas font")}
                value={lyricsFontId}
                customFonts={customFonts}
                onChange={(value) => update("lyricsFontId", value)}
              />

              <input
                ref={editorFontInputRef}
                type="file"
                accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
                className="hidden"
                onChange={handleEditorFontFile}
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={fontBusy}
                  onClick={() => editorFontInputRef.current?.click()}
                >
                  {fontBusy ? <Loader2 className="animate-spin" /> : <Plus />}
                  {text(uiLocale, "เพิ่มฟอนต์ของฉัน", "Add my font")}
                </Button>
                <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                  {text(uiLocale, "ใช้ฟอนต์นี้กับภาษา/อักษรที่เครื่องไม่มีได้", "Use this font for scripts your system does not have")}
                </p>
              </div>

              {customFonts.length > 0 ? (
                <div className="divide-y divide-line border border-line bg-base">
                  {customFonts.map((font) => (
                    <div key={font.id} className="flex items-center gap-2 px-2.5 py-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{font.name}</span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={fontBusy}
                        onClick={() => void handleRemoveEditorFont(font.id)}
                        title={text(uiLocale, "ลบฟอนต์", "Delete font")}
                        aria-label={text(uiLocale, `ลบ ${font.name}`, `Delete ${font.name}`)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <Separator className="my-4" />

            <div className="flex items-center gap-3 text-sm">
              <span className="min-w-0 flex-1">{text(uiLocale, "ธีม", "Theme")}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              >
                {resolvedTheme === "dark" ? <Sun /> : <Moon />}
                {resolvedTheme === "dark"
                  ? text(uiLocale, "สว่าง", "Light")
                  : text(uiLocale, "มืด", "Dark")}
              </Button>
            </div>
          </Section>

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw />
              {text(uiLocale, "คืนค่าเริ่มต้น", "Reset to defaults")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-line bg-base p-3">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function FontSelect({
  label,
  value,
  customFonts,
  onChange,
}: {
  label: string;
  value: FontSelection;
  customFonts: { id: string; name: string }[];
  onChange: (value: FontSelection) => void;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="min-w-0 flex-1">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as FontSelection)}
        className="h-8 min-w-0 max-w-[62%] rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {BUILT_IN_FONTS.map((font) => (
          <option key={font.id} value={font.id}>
            {font.name}
          </option>
        ))}
        {customFonts.map((font) => (
          <option key={font.id} value={`custom:${font.id}`}>
            {font.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function SettingSlider({
  label,
  hint,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm">
        <span className="min-w-0 flex-1">{label}</span>
        <span className="tabnum text-dim">{format(value)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
        aria-label={label}
      />
      {hint ? <p className="pt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function audioSampleRate(): number {
  return audioEngine.ctx?.sampleRate ?? 48000;
}

/** Keyboard reference — a timing tool lives on these. */
const SHORTCUTS: { keys: string; thai: string; english: string }[] = [
  { keys: "Space", thai: "เล่น / หยุด", english: "Play / pause" },
  { keys: "→", thai: "ปาดคำถัดไป", english: "Time next word" },
  { keys: "←", thai: "ถอยกลับหนึ่งคำ", english: "Go back one word" },
  { keys: "↑ ↓", thai: "เลือกบรรทัด", english: "Select line" },
  { keys: "Enter", thai: "แก้ไขบรรทัดที่เลือก", english: "Edit selected line" },
  { keys: "Ctrl+Enter", thai: "ปาดบรรทัดนี้ใหม่", english: "Retime this line" },
  { keys: "Ctrl+Z", thai: "ย้อนกลับ", english: "Undo" },
  { keys: "Ctrl+Y", thai: "ทำซ้ำ", english: "Redo" },
];

export function ShortcutsDialog() {
  const dialog = useUiStore((state) => state.dialog);
  const openDialog = useUiStore((state) => state.openDialog);
  const locale = useSettingsStore((state) => state.uiLocale);

  return (
    <Dialog
      open={dialog === "shortcuts"}
      onOpenChange={(next) => openDialog(next ? "shortcuts" : null)}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{text(locale, "ปุ่มลัด", "Keyboard shortcuts")}</DialogTitle>
          <DialogDescription>
            <Timer className="mr-1 inline size-3.5" />
            {text(locale, "ใช้ขณะโฟกัสอยู่นอกช่องพิมพ์", "Use when focus is outside a text field")}
          </DialogDescription>
        </DialogHeader>

        <ul className="divide-y divide-line border border-line bg-base">
          {SHORTCUTS.map((shortcut) => (
            <li
              key={shortcut.keys}
              className="flex items-center gap-3 px-3 py-2 text-sm"
            >
              <kbd className="chip tabnum shrink-0">{shortcut.keys}</kbd>
              <span className="min-w-0 flex-1 text-muted-foreground">
                {text(locale, shortcut.thai, shortcut.english)}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
