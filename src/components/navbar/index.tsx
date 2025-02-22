import React, { useState } from "react";
import NavBarMemu from "./navbar-menu";
import { IMenusType } from "./navbar.type";
import ReadLyricModal from "@/modals/read-lyric/read-lyric";
import NewFileModal from "@/modals/new-file/new-file";
import SaveFileModal from "@/modals/save-file/save-file";
import SelectMusicModal from "@/modals/select-music/select-music";

interface HandleNavbarModalProps {}

const NavBar: React.FC<HandleNavbarModalProps> = ({}) => {
  const [modal, setModal] = useState<IMenusType>();
  const onSelectMenu = (value: IMenusType) => {
    setModal(value);
  };

  const onCloseModal = () => {
    setModal(undefined);
  };
  return (
    <>
      <ReadLyricModal
        open={modal === "LYRICS_ADD"}
        onClose={onCloseModal}
      ></ReadLyricModal>
      <NewFileModal
        open={modal === "FILE_NEW"}
        onClose={onCloseModal}
      ></NewFileModal>
      <SaveFileModal
        open={modal === "SAVE_NCN"}
        onClose={onCloseModal}
      ></SaveFileModal>
      <SelectMusicModal
        open={modal === "OPEN_MUSIC"}
        onClose={onCloseModal}
      ></SelectMusicModal>

      <NavBarMemu onSelectMenu={onSelectMenu}></NavBarMemu>
    </>
  );
};

export default NavBar;
