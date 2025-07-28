import React, { useEffect, useState } from "react";
import { BiHeart, BiDonateHeart } from "react-icons/bi";
import ModalCommon from "../../common/modal";
import Donate from "./donate";

interface DonateModalProps {}

const DonateModal: React.FC<DonateModalProps> = ({}) => {
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    setTimeout(() => {
      setOpen(true);
    }, 5000);
  }, []);
  return (
    <ModalCommon
      cancelButtonProps={{ children: "Close" }}
      okButtonProps={{ hidden: true }}
      open={open}
      onClose={() => setOpen(false)}
    >
      <Donate></Donate>
    </ModalCommon>
  );
};

export default DonateModal;
