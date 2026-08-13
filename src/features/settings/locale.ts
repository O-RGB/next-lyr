import type { EditorSettings } from "./settings-store";

export type UiLocale = EditorSettings["uiLocale"];

export function text(locale: UiLocale, thai: string, english: string): string {
  return locale === "en" ? english : thai;
}
