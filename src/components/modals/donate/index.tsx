import { useEffect, useState } from "react";
import ModalCommon from "../../common/modal";
import Donate from "./donate";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";

const DonateModal = () => {
  const [open, setOpen] = useState<boolean>(false);
  const locale = useSettingsStore((state) => state.uiLocale);

  useEffect(() => {
    setTimeout(() => {
      setOpen(true);
    }, 5000);
  }, []);
  return (
    <ModalCommon
      title={text(locale, "สนับสนุน NextLyricsEditor", "Support NextLyricsEditor")}
      cancelButtonProps={{ children: text(locale, "ปิด", "Close") }}
      okButtonProps={{ hidden: true }}
      open={open}
      onClose={() => setOpen(false)}
    >
      <Donate></Donate>
    </ModalCommon>
  );
};

export default DonateModal;
