import React, { useState } from "react";
import NavBarMemu from "./navbar-menu";
import { IMenusType } from "./navbar";
import SelectMusicModal from "@/components/modals/select-music/select-music";
import ReadLyricsModal from "@/components/modals/read-lyrics";

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
      <ReadLyricsModal
        open={modal === "LYRICS_ADD"}
        onClose={onCloseModal}
      ></ReadLyricsModal>
      {/* <ReadLyricModal
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
      ></SaveFileModal> */}
      <SelectMusicModal
        open={modal === "OPEN_MUSIC"}
        onClose={onCloseModal}
      ></SelectMusicModal>

      <NavBarMemu onSelectMenu={onSelectMenu}></NavBarMemu>
    </>
  );
};

export default NavBar;
