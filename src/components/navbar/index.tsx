// src/components/navbar/index.tsx
import React, { useState } from "react";
import NavBarMemu from "./navbar-menu";
import { IMenusType } from "./navbar";
import ReadLyricsModal from "@/components/modals/read-lyrics";
import BuildNcnModal from "../modals/build-ncn";
import ProjectListModal from "../modals/project/project-list"; // <<< เพิ่ม

interface HandleNavbarModalProps {}

const NavBar: React.FC<HandleNavbarModalProps> = ({}) => {
  const [modal, setModal] = useState<IMenusType>();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false); // <<< เพิ่ม state ควบคุม modal

  const onSelectMenu = (value: IMenusType) => {
    // <<< เพิ่ม logic เปิด modal project
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
      {/* <<< เพิ่ม: เรียกใช้ ProjectListModal ที่นี่ */}
      <ProjectListModal
        open={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />
      <NavBarMemu onSelectMenu={onSelectMenu}></NavBarMemu>
    </>
  );
};

export default NavBar;
