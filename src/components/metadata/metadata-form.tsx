"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Album, AudioLines, Building2, CalendarDays, FileMusic, Guitar, Languages, Metronome, MicVocal,
  Music2, Signature, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import Card from "../common/card";
import SelectCommon from "../common/data-input/select";
import InputCommon from "../common/data-input/input";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import { artistTypeOption, keyOption, languageOption, vocalChannelOption, type SongInfo } from "@/lib/karaoke/midi/types";
import { getMissingRequiredSongInfo, REQUIRED_SONG_INFO_KEYS } from "@/lib/karaoke/metadata-validation";
import { changedMetadataFields, createMetadataDraft, METADATA_FIELD_KEYS, metadataEqual, normalizeSongMetadata, reconcileMetadataDraft,
  type MetadataDraft, type MetadataFieldKey } from "@/lib/karaoke/metadata-draft";

type Props = {
  adding?: boolean; card?: boolean; requiredFirst?: boolean; initMetadata?: SongInfo;
  onFieldChange?: (metadata: Partial<SongInfo>) => void; inputSize?: "sm" | "md" | "lg";
  className?: string; disabled?: boolean; autoSave?: boolean; formId?: string;
  onSave?: (metadata: Partial<SongInfo>) => void; onDirtyChange?: (dirty: boolean) => void;
  requiredErrors?: Partial<Record<keyof SongInfo, string>>; showRequiredErrors?: boolean; validateRequiredOnSave?: boolean;
};
type FieldConfig = { label: [string, string]; icon: LucideIcon; order: string;
  inputMode?: "decimal" | "numeric"; options?: { label: string; value: string }[] };
const fields: Record<MetadataFieldKey, FieldConfig> = {
  TITLE: { label: ["ชื่อเพลง :", "Song Title :"], icon: FileMusic, order: "order-1" },
  KEY: { label: ["คีย์เพลง :", "Key :"], icon: Music2, order: "order-11", options: keyOption },
  TEMPO: { label: ["ความเร็ว :", "Tempo :"], icon: Metronome, order: "order-2", inputMode: "decimal" },
  ARTIST_TYPE: { label: ["ประเภทเสียงร้อง :", "Gender :"], icon: UsersRound, order: "order-12", options: artistTypeOption },
  ALBUM: { label: ["อัลบั้ม :", "Album :"], icon: Album, order: "order-15" },
  ARTIST: { label: ["นักร้อง :", "Artist :"], icon: MicVocal, order: "order-3" },
  AUTHOR: { label: ["ผู้แต่ง :", "Composer :"], icon: Signature, order: "order-16" },
  GENRE: { label: ["จังหวะ/แนวเพลง :", "Rhythm/Genre :"], icon: Guitar, order: "order-17" },
  CREATOR: { label: ["ผู้สร้าง :", "Creator :"], icon: UserRound, order: "order-18" },
  COMPANY: { label: ["ค่ายเพลง :", "Music Label :"], icon: Building2, order: "order-19" },
  LANGUAGE: { label: ["ภาษา :", "Language :"], icon: Languages, order: "order-13", options: languageOption },
  YEAR: { label: ["ปี :", "Year :"], icon: CalendarDays, order: "order-20", inputMode: "numeric" },
  VOCAL_CHANNEL: { label: ["ช่องเสียงร้อง :", "Vocal Channel :"], icon: AudioLines, order: "order-14", options: vocalChannelOption },
};

function MetadataForm({ adding = false, card = true, requiredFirst = false, onFieldChange, initMetadata, inputSize = "sm",
  className = "flex flex-col gap-2 lg:p-4", disabled = false, autoSave = true, formId, onSave, onDirtyChange,
  requiredErrors, showRequiredErrors = false, validateRequiredOnSave = false }: Props) {
  const mode = useKaraokeStore(state => state.mode);
  const midi = useKaraokeStore(state => state.playerState.midi);
  const metadata = useKaraokeStore(state => state.metadata);
  const projectId = useKaraokeStore(state => state.projectId);
  const setMetadata = useKaraokeStore(state => state.actions.setMetadata);
  const locale = useSettingsStore(state => state.uiLocale);
  const generatedId = useId();
  const [draft, setDraft] = useState(() => createMetadataDraft(initMetadata ?? metadata));
  const draftRef = useRef(draft);
  const projectRef = useRef(projectId);
  const [validationRequested, setValidationRequested] = useState(false);
  const missing = getMissingRequiredSongInfo(draft.value);
  const isDirty = METADATA_FIELD_KEYS.some(key => draft.value[key] !== draft.base[key]);
  const setCurrentDraft = (next: MetadataDraft) => { draftRef.current = next; setDraft(next); };

  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const changedProject = projectRef.current !== projectId;
    projectRef.current = projectId;
    const incoming = normalizeSongMetadata(initMetadata ?? metadata);
    const next = reconcileMetadataDraft(draftRef.current, incoming, !!initMetadata || changedProject);
    // Parent callbacks can echo a new-project draft back through initMetadata.
    if (initMetadata && !changedProject && metadataEqual(incoming, draftRef.current.value)) return;
    if (next !== draftRef.current) { draftRef.current = next; setDraft(next); }
    if (changedProject) setValidationRequested(false);
  }, [initMetadata, metadata, projectId]);

  const changeField = (name: MetadataFieldKey, value: string) => {
    const next = { ...draftRef.current, value: { ...draftRef.current.value, [name]: value } };
    setCurrentDraft(next);
    onFieldChange?.(next.value);
  };

  const saveMetadata = async () => {
    const value = draftRef.current.value;
    if (validateRequiredOnSave && getMissingRequiredSongInfo(value).length) { setValidationRequested(true); return; }
    // A new project's draft belongs to its caller, never to the current song.
    if (!adding) {
      const changes = changedMetadataFields(useKaraokeStore.getState().metadata, value);
      if (Object.keys(changes).length) await setMetadata(changes);
    }
    setValidationRequested(false);
    setCurrentDraft({ base: value, value });
    onSave?.(value);
  };
  const handleBlur = () => { if (autoSave) void saveMetadata(); };
  const isDisabled = disabled || (!adding && mode === "midi" && !midi);

  const field = (name: MetadataFieldKey) => {
    const config = fields[name], Icon = config.icon, value = draft.value[name] ?? "";
    const error = missing.includes(name as typeof REQUIRED_SONG_INFO_KEYS[number]) &&
      (showRequiredErrors || validationRequested || requiredErrors?.[name]) ? text(locale, "จำเป็นต้องกรอก", "Required") : undefined;
    const common = { id: `${formId ?? generatedId}-${name}`, name, value, disabled: isDisabled, inputSize,
      label: text(locale, ...config.label), error, prefixIcon: <Icon className="size-4" />,
      "aria-required": requiredFirst && (REQUIRED_SONG_INFO_KEYS as readonly string[]).includes(name) || undefined,
      onBlur: handleBlur, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => changeField(name, event.target.value) };
    const options = config.options && value && !config.options.some(option => option.value === value)
      ? [{ label: value, value }, ...config.options] : config.options;
    return <div key={name} className={`w-full h-full ${requiredFirst ? config.order : ""}`}>
      {options ? <SelectCommon {...common} options={options} /> : <InputCommon {...common} inputMode={config.inputMode} />}
    </div>;
  };

  const form = <form id={formId} className={className} noValidate onSubmit={event => { event.preventDefault(); void saveMetadata(); }}>
    {field("TITLE")}
    <div className={requiredFirst ? "contents" : "grid grid-cols-3 gap-2"}>{field("KEY")}{field("TEMPO")}{field("ARTIST_TYPE")}</div>
    {requiredFirst && <div className="order-10 border-t border-line pt-3 text-xs font-semibold text-muted-foreground">
      {text(locale, "ข้อมูลเพิ่มเติม", "Additional information")}
    </div>}
    {(["ALBUM", "ARTIST", "AUTHOR", "GENRE", "CREATOR", "COMPANY", "LANGUAGE"] as const).map(field)}
    <div className={requiredFirst ? "contents" : "flex gap-2"}>{field("YEAR")}{field("VOCAL_CHANNEL")}</div>
  </form>;
  return <div>{card ? <Card className="rounded-lg bg-panel/50">{form}</Card> : form}</div>;
}

export default React.memo(MetadataForm);
