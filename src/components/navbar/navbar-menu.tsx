"use client";

import {
  FolderOpen,
  Menu,
  MicVocal,
  History as HistoryIcon,
  Keyboard,
  Moon,
  Redo2,
  Save,
  Settings2,
  Sun,
  Waves,
} from "lucide-react";
import { useTheme } from "next-themes";
import React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUiStore } from "@/features/ui/ui-store";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import {
  canRedo as historyCanRedo,
  canUndo as historyCanUndo,
} from "@/stores/karaoke-store/history";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { IMenusType } from "./navbar.d";

interface NavBarMenuProps {
  onSelectMenu?: (value: IMenusType) => void;
}

const NavBarTitle = React.memo(function NavBarTitle() {
  const title = useKaraokeStore((state) => state.metadata?.TITLE);
  const locale = useSettingsStore((state) => state.uiLocale);

  return (
    <span className="min-w-0 flex-1 truncate px-1 text-sm font-medium text-muted-foreground">
      {title || text(locale, "ยังไม่ได้ตั้งชื่อเพลง", "Untitled song")}
    </span>
  );
});

const NavBarHistoryActions = React.memo(function NavBarHistoryActions() {
  const { undo, redo } = useKaraokeStore((state) => state.actions);
  const history = useKaraokeStore((state) => state.history);
  const locale = useSettingsStore((state) => state.uiLocale);

  const canUndo = historyCanUndo(history);
  const canRedo = historyCanRedo(history);

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!canUndo}
              onClick={undo}
              aria-label={text(locale, "ย้อนกลับ", "Undo")}
            >
              <Redo2 className="scale-x-[-1]" />
            </Button>
          }
        />
        <TooltipContent>{text(locale, "ย้อนกลับ", "Undo")} · Ctrl+Z</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!canRedo}
              onClick={redo}
              aria-label={text(locale, "ทำซ้ำ", "Redo")}
            >
              <Redo2 />
            </Button>
          }
        />
        <TooltipContent>{text(locale, "ทำซ้ำ", "Redo")} · Ctrl+Y</TooltipContent>
      </Tooltip>
    </>
  );
});

const NavBarMenu: React.FC<NavBarMenuProps> = ({ onSelectMenu }) => {
  const { resolvedTheme, setTheme } = useTheme();
  const openDialog = useUiStore((state) => state.openDialog);
  const locale = useSettingsStore((state) => state.uiLocale);

  return (
    <div className="flex h-14 min-w-0 items-center gap-2 px-3 sm:px-5">
      <div className="flex shrink-0 items-center gap-2 pr-1">
        <span className="grid size-9 place-items-center bg-primary/15 text-primary">
          <Waves className="size-5" />
        </span>
        <span className="hidden text-sm font-semibold tracking-tight sm:block">
          {text(locale, "Lyrics Editor", "Lyrics Editor")}
        </span>
      </div>

      <Separator orientation="vertical" className="hidden h-6 sm:block" />

      <NavBarTitle />

      {/* Undo/redo stay one tap away; everything else lives in the menu. */}
      <NavBarHistoryActions />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" className="gap-1.5">
              <Menu className="size-5" />
              <span className="hidden sm:inline">{text(locale, "เมนู", "Menu")}</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{text(locale, "โปรเจกต์", "Project")}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onSelectMenu?.("PROJECT_OPEN")}>
              <FolderOpen />
              {text(locale, "เปิดโปรเจกต์", "Open project")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSelectMenu?.("EXPORT_FILE")}>
              <Save />
              {text(locale, "บันทึก / ส่งออก", "Save / export")}
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel>{text(locale, "เนื้อเพลง", "Lyrics")}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onSelectMenu?.("LYRICS_ADD")}>
              <MicVocal />
              {text(locale, "ใส่เนื้อเพลง", "Add lyrics")}
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel>{text(locale, "ตั้งค่า", "Settings")}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => openDialog("settings")}>
              <Settings2 />
              {text(locale, "ตั้งค่า", "Settings")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDialog("shortcuts")}>
              <Keyboard />
              {text(locale, "ปุ่มลัด", "Shortcuts")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDialog("history")}>
              <HistoryIcon />
              {text(locale, "ประวัติการแก้ไข", "Edit history")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {resolvedTheme === "dark" ? <Sun /> : <Moon />}
              {text(locale, "ธีม", "Theme")}
              <span className="ml-auto text-xs text-muted-foreground">
                {resolvedTheme === "dark" ? text(locale, "สว่าง", "Light") : text(locale, "มืด", "Dark")}
              </span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default NavBarMenu;
