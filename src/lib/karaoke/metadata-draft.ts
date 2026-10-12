import { DEFAULT_SONG_INFO, type SongInfo } from "./midi/types";

export const METADATA_FIELD_KEYS = ["TITLE", "KEY", "TEMPO", "ARTIST_TYPE", "ALBUM", "ARTIST", "AUTHOR", "GENRE",
  "CREATOR", "COMPANY", "LANGUAGE", "YEAR", "VOCAL_CHANNEL"] as const;
export type MetadataFieldKey = typeof METADATA_FIELD_KEYS[number];
export interface MetadataDraft { base: SongInfo; value: SongInfo }

/** Metadata fields are strings, including numeric labels and genuinely empty values. */
export function normalizeSongMetadata(source: Partial<SongInfo> | null | undefined): SongInfo {
  const result: Record<string, string | undefined> = { ...DEFAULT_SONG_INFO, ...source };
  for (const key of METADATA_FIELD_KEYS) {
    result[key] = String(source ? source[key] ?? "" : DEFAULT_SONG_INFO[key] ?? "");
  }
  return result as unknown as SongInfo;
}

export function metadataEqual(first: SongInfo, second: SongInfo) {
  return (Object.keys({ ...first, ...second }) as (keyof SongInfo)[]).every(key => first[key] === second[key]);
}

export function createMetadataDraft(source: Partial<SongInfo> | null | undefined): MetadataDraft {
  const value = normalizeSongMetadata(source);
  return { base: value, value };
}

/** External saves refresh untouched fields while an open dialog retains its edits. */
export function reconcileMetadataDraft(current: MetadataDraft, incoming: SongInfo, reset: boolean): MetadataDraft {
  if (!reset && metadataEqual(incoming, current.value)) return current;
  if (reset) return { base: incoming, value: incoming };
  const value = { ...incoming } as Record<string, string | undefined>;
  for (const key of METADATA_FIELD_KEYS) {
    if (current.value[key] !== current.base[key]) value[key] = current.value[key];
  }
  return { base: incoming, value: value as unknown as SongInfo };
}

/** A plain focus/blur never materializes missing optional fields or an undo step. */
export function changedMetadataFields(previous: Partial<SongInfo> | null | undefined, next: SongInfo): Partial<SongInfo> {
  const normalized = normalizeSongMetadata(previous);
  const changes: Record<string, string | undefined> = {};
  for (const key of METADATA_FIELD_KEYS) if (normalized[key] !== next[key]) changes[key] = next[key];
  return changes as Partial<SongInfo>;
}

export function importedMidiMetadata(info: SongInfo, firstBpm?: number): SongInfo {
  const value = normalizeSongMetadata(info);
  if (value.TEMPO?.trim() || typeof firstBpm !== "number" || !Number.isFinite(firstBpm) || firstBpm <= 0) return value;
  return { ...value, TEMPO: String(firstBpm) };
}
