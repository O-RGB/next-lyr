import NavBarMemu from "./navbar-menu";
import ReadLyricsModal from "@/components/modals/read-lyrics";
import BuildNcnModal from "../modals/build-ncn";
import ProjectListModal from "../modals/project/project-list";
import { useUiStore } from "@/features/ui/ui-store";
import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { usePlayerHandlersStore } from "@/hooks/usePlayerHandlers";
import { useSettingsStore } from "@/features/settings/settings-store";
import { text } from "@/features/settings/locale";
import { IMenusType } from "./navbar";

interface HandleNavbarModalProps {}

const NavBar: React.FC<HandleNavbarModalProps> = ({}) => {
  const [modal, setModal] = useState<IMenusType>();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const dialog = useUiStore((state) => state.dialog);
  const openDialog = useUiStore((state) => state.openDialog);

  const menuRequestRef = useRef(false);
  const onSelectMenu = async (value: IMenusType) => {
    if (menuRequestRef.current) return;
    const state = useKaraokeStore.getState();
    if (state.isTimingActive || state.editingLineIndex !== null) {
      menuRequestRef.current = true;
      try {
        usePlayerHandlersStore.getState().handlePauseTiming();
        await state.actions.stopTiming();
        await state.actions.saveCurrentProject();
      } catch (error) {
        toast.error(text(useSettingsStore.getState().uiLocale,
          "บันทึกไม่สำเร็จ งานยังอยู่ในหน้านี้", "Could not save; your work is still on this page"));
        console.error(error);
        return;
      } finally {
        menuRequestRef.current = false;
      }
    }
    if (value === "PROJECT_OPEN") {
      setIsProjectModalOpen(true);
    } else {
      setModal(value);
    }
  };

  const onCloseModal = () => {
    setModal(undefined);
    if (dialog === "lyrics") openDialog(null);
  };
  return (
    <>
      <ReadLyricsModal
        open={modal === "LYRICS_ADD" || dialog === "lyrics"}
        onClose={onCloseModal}
      ></ReadLyricsModal>
      <BuildNcnModal
        open={modal === "EXPORT_FILE"}
        onClose={onCloseModal}
      ></BuildNcnModal>
      <ProjectListModal
        open={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />
      <NavBarMemu onSelectMenu={onSelectMenu}></NavBarMemu>
    </>
  );
};

export default NavBar;
