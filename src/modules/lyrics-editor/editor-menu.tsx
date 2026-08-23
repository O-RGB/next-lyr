"use client";

import {
  FileText,
  ListRestart,
  MicVocal,
  StickyNote,
  Wrench,
} from "lucide-react";
import React, { useState } from "react";

import ButtonCommon from "@/components/common/button";
import ModalCommon from "@/components/common/modal";
import MetadataForm from "@/components/metadata/metadata-form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { usePlayerSetupStore } from "@/hooks/usePlayerSetup";

interface LyricsEditorMenuProps {
  preview: boolean;
  onPreviewChange: (visible: boolean) => void;
  chordPanelVisible: boolean;
  onChordPanelVisibilityChange: (visible: boolean) => void;
}

export default function LyricsEditorMenu({
  preview,
  onPreviewChange,
  chordPanelVisible,
  onChordPanelVisibilityChange,
}: LyricsEditorMenuProps) {
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [metadataDirty, setMetadataDirty] = useState(false);
  const [metadataFormVersion, setMetadataFormVersion] = useState(0);
  const locale = useSettingsStore((state) => state.uiLocale);
  const mode = useKaraokeStore((state) => state.mode);
  const lyricsData = useKaraokeStore((state) => state.lyricsData);
  const timingMode = useKaraokeStore(
    (state) => state.isTimingActive || state.editingLineIndex !== null
  );
  const playerControls = usePlayerSetupStore((state) => state.playerControls);
  const handleRetimingAll = usePlayerHandlersStore(
    (state) => state.handleRetimingAll
  );

  const hasTiming = lyricsData.some((line) =>
    line.some((word) => word.at !== null)
  );
  const canRetimingAll = lyricsData.length > 0 && !!playerControls && !timingMode;
  const showRetimingPulse = canRetimingAll && !hasTiming;

  const openMetadata = () => {
    setMetadataDirty(false);
    setMetadataFormVersion((version) => version + 1);
    setMetadataOpen(true);
  };

  const closeMetadata = () => {
    setMetadataOpen(false);
    setMetadataDirty(false);
  };

  return (
    <>
      <ModalCommon
        title={text(locale, "ข้อมูลเพลง", "Music metadata")}
        open={metadataOpen}
        cancelButtonProps={{
          children: text(locale, "ยกเลิก", "Cancel"),
          onClick: closeMetadata,
        }}
        okButtonProps={{
          children: text(locale, "บันทึก", "Save"),
          form: "lyrics-editor-metadata-form",
          type: "submit",
          disabled: !metadataDirty,
        }}
        onClose={closeMetadata}
      >
        <MetadataForm
          key={metadataFormVersion}
          card={false}
          requiredFirst
          inputSize="md"
          className="flex flex-col gap-2"
          autoSave={false}
          formId="lyrics-editor-metadata-form"
          onDirtyChange={setMetadataDirty}
          onSave={closeMetadata}
          showRequiredErrors
          validateRequiredOnSave
        />
      </ModalCommon>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <ButtonCommon
              type="button"
              color="white"
              size="xs"
              icon={<Wrench className="size-5 sm:size-3.5" />}
              disabled={timingMode}
              aria-label={text(locale, "เครื่องมือแก้ไข", "Editor tools")}
              title={text(locale, "เครื่องมือแก้ไข", "Editor tools")}
              childrenClassName="hidden sm:inline"
              className="max-sm:!h-10 max-sm:!w-10 max-sm:!gap-0 max-sm:!rounded-lg max-sm:!border-line max-sm:!bg-panel max-sm:!p-0 max-sm:!text-foreground max-sm:!shadow-sm max-sm:active:scale-95 max-sm:touch-manipulation"
            >
              {text(locale, "เครื่องมือ", "Tools")}
            </ButtonCommon>
          }
        />
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {text(locale, "การแสดงผล", "View")}
            </DropdownMenuLabel>
            <DropdownMenuItem
              closeOnClick={false}
              disabled={timingMode}
              onClick={() => onPreviewChange(!preview)}
              className="justify-between"
            >
              <MicVocal />
              <span className="flex-1">Preview</span>
              <Switch
                checked={preview}
                tabIndex={-1}
                aria-hidden="true"
                className="pointer-events-none !h-[22px] !w-auto"
              >
                <span className="invisible whitespace-nowrap px-3 text-[8px] font-bold leading-none">
                  OFF
                </span>
                <span
                  className={`absolute inset-y-0 right-1 items-center text-[8px] font-bold leading-none text-foreground/70 ${
                    preview ? "hidden" : "flex"
                  }`}
                >
                  OFF
                </span>
                <span
                  className={`absolute inset-y-0 left-1 items-center text-[8px] font-bold leading-none text-primary-foreground ${
                    preview ? "flex" : "hidden"
                  }`}
                >
                  ON
                </span>
              </Switch>
            </DropdownMenuItem>

            {mode === "midi" ? (
              <DropdownMenuItem
                closeOnClick={false}
                disabled={timingMode}
                onClick={() =>
                  onChordPanelVisibilityChange(!chordPanelVisible)
                }
                className="justify-between"
              >
                <FileText />
                <span className="flex-1">{text(locale, "คอร์ด", "Chords")}</span>
                <Switch
                  checked={chordPanelVisible}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="pointer-events-none !h-[22px] !w-auto"
                >
                  <span className="invisible whitespace-nowrap px-3 text-[8px] font-bold leading-none">
                    OFF
                  </span>
                  <span
                    className={`absolute inset-y-0 right-1 items-center text-[8px] font-bold leading-none text-foreground/70 ${
                      chordPanelVisible ? "hidden" : "flex"
                    }`}
                  >
                    OFF
                  </span>
                  <span
                    className={`absolute inset-y-0 left-1 items-center text-[8px] font-bold leading-none text-primary-foreground ${
                      chordPanelVisible ? "flex" : "hidden"
                    }`}
                  >
                    ON
                  </span>
                </Switch>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {text(locale, "การทำงาน", "Actions")}
            </DropdownMenuLabel>
            <DropdownMenuItem
              disabled={timingMode}
              onClick={openMetadata}
            >
              <StickyNote />
              {text(locale, "ข้อมูลเพลง", "Metadata")}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canRetimingAll}
              onClick={() => void handleRetimingAll()}
              className={showRetimingPulse ? "retiming-onboarding-pulse" : undefined}
            >
              <ListRestart />
              {text(locale, "ปาดใหม่ทั้งหมด", "Retiming all")}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
