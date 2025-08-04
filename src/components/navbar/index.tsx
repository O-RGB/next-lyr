import React, { useState } from "react";
import NavBarMemu from "./navbar-menu";
import { IMenusType } from "./navbar";
import SelectMusicModal from "@/components/modals/select-music/select-music";
import ReadLyricsModal from "@/components/modals/read-lyrics";
import BuildNcnModal from "../modals/build-ncn";
import { useKaraokeStore } from "@/stores/karaoke-store";
import { MusicMode } from "@/types/common.type";

interface HandleNavbarModalProps {}

const NavBar: React.FC<HandleNavbarModalProps> = ({}) => {
  const [modal, setModal] = useState<IMenusType>();
  const { setMode } = useKaraokeStore((state) => state.actions);

  const onSelectMenu = (value: IMenusType) => {
    switch (value) {
      case "MODE_MIDI":
        setMode("midi");
        break;
      case "MODE_MP3":
        setMode("mp3");
        break;
      case "MODE_MP4":
        setMode("mp4");
        break;
      case "MODE_YOUTUBE":
        setMode("youtube");
        break;
      default:
        setModal(value);
        break;
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
        open={modal === "SAVE_NCN"}
        onClose={onCloseModal}
      ></BuildNcnModal>
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
