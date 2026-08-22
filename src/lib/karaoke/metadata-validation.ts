import type { SongInfo } from "./midi/types";

/** Metadata that must be present before a project can be created or exported. */
export const REQUIRED_SONG_INFO_KEYS = [
  "TITLE",
  "TEMPO",
  "ARTIST",
] as const;

export type RequiredSongInfoKey = (typeof REQUIRED_SONG_INFO_KEYS)[number];

export function getMissingRequiredSongInfo(
  value: Partial<SongInfo> | null | undefined
): RequiredSongInfoKey[] {
  return REQUIRED_SONG_INFO_KEYS.filter(
    (key) => !String(value?.[key] ?? "").trim()
  );
}
