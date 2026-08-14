import { MicVocal, StickyNote } from "lucide-react";
import ButtonCommon from "@/components/common/button";
import ModalCommon from "@/components/common/modal";
import MetadataForm from "@/components/metadata/metadata-form";
import LineSelectionToolbar from "@/components/lyrics/line-selection-toolbar";
import React, { useEffect, useState } from "react";

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
      <div className="mr-auto">
        <LineSelectionToolbar compact />
      </div>
      <ButtonCommon
        onClick={() => {
          setPreview?.(!preview);
        }}
        color={preview ? "warning" : "white"}
        size="xs"
        icon={<MicVocal></MicVocal>}
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
        icon={<StickyNote></StickyNote>}
      >
        Metadata
      </ButtonCommon>
    </>
  );
};

export default MobileActionButton;
