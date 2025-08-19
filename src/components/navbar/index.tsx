import NavBarMemu from "./navbar-menu";
import ReadLyricsModal from "@/components/modals/read-lyrics";
import BuildNcnModal from "../modals/build-ncn";
import ProjectListModal from "../modals/project/project-list";
import React, { useState } from "react";
import { IMenusType } from "./navbar";

interface HandleNavbarModalProps {}

const NavBar: React.FC<HandleNavbarModalProps> = ({}) => {
  const [modal, setModal] = useState<IMenusType>();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const onSelectMenu = (value: IMenusType) => {
    if (value === "PROJECT_OPEN") {
      setIsProjectModalOpen(true);
    } else {
      setModal(value);
    }
  };

  const onCloseModal = () => {
    setModal(undefined);
  };
  return (
    <>
      <ReadLyricsModal
        open={modal === "LYRICS_ADD"}
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
