import { MicVocal } from "lucide-react";
import ButtonCommon from "@/components/common/button";
import RetimingCancelButton from "@/components/common/retiming-cancel";
import LineSelectionToolbar from "@/components/lyrics/line-selection-toolbar";
import React from "react";

interface MobileActionButtonProps {
  preview?: boolean;
  setPreview?: (bool: boolean) => void;
  showLineSelection?: boolean;
  showPreview?: boolean;
}

const MobileActionButton: React.FC<MobileActionButtonProps> = ({
  preview,
  setPreview,
  showLineSelection = true,
  showPreview = true,
}) => {
  return (
    <>
      <div className="mr-auto flex items-center gap-1.5">
        <RetimingCancelButton />
        {showLineSelection ? (
          <LineSelectionToolbar compactActions />
        ) : null}
      </div>
      {showPreview ? (
        <ButtonCommon
          onClick={() => setPreview?.(!preview)}
          color={preview ? "warning" : "white"}
          size="xs"
          icon={<MicVocal />}
        >
          Preview
        </ButtonCommon>
      ) : null}
    </>
  );
};

export default MobileActionButton;
