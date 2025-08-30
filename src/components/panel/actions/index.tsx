import ButtonCommon from "@/components/common/button";
import ModalCommon from "@/components/common/modal";
import MetadataForm from "@/components/metadata/metadata-form";
import React, { useEffect, useState } from "react";
import { MdOutlineLyrics, MdOutlineStickyNote2 } from "react-icons/md";

interface MobileActionButtonProps {
  preview?: boolean;
  setPreview?: (bool: boolean) => void;
}

const MobileActionButton: React.FC<MobileActionButtonProps> = ({
  preview,
  setPreview,
}) => {
  const [metadata, setMetadata] = useState<boolean>(false);
  useEffect(() => {}, []);
  return (
    <>
      <ButtonCommon
        onClick={() => {
          setPreview?.(!preview);
        }}
        color={preview ? "warning" : "white"}
        size="xs"
        icon={<MdOutlineLyrics></MdOutlineLyrics>}
      >
        Preview
      </ButtonCommon>
      <ModalCommon
        title={"Music Metadata"}
        open={metadata}
        cancelButtonProps={{ children: "Close" }}
        okButtonProps={{ hidden: true }}
        onClose={() => setMetadata(false)}
      >
        <MetadataForm inputSize="md" />
      </ModalCommon>
      <ButtonCommon
        onClick={() => setMetadata(true)}
        color="white"
        size="xs"
        icon={<MdOutlineStickyNote2></MdOutlineStickyNote2>}
      >
        Metadata
      </ButtonCommon>
    </>
  );
};

export default MobileActionButton;
