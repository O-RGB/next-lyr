import { MicVocal, StickyNote } from "lucide-react";
import ButtonCommon from "@/components/common/button";
import ModalCommon from "@/components/common/modal";
import MetadataForm from "@/components/metadata/metadata-form";
import LineSelectionToolbar from "@/components/lyrics/line-selection-toolbar";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import React, { useState } from "react";

interface MobileActionButtonProps {
  preview?: boolean;
  setPreview?: (bool: boolean) => void;
  showLineSelection?: boolean;
  showMetadata?: boolean;
}

const MobileActionButton: React.FC<MobileActionButtonProps> = ({
  preview,
  setPreview,
  showLineSelection = true,
  showMetadata = true,
}) => {
  const [metadata, setMetadata] = useState<boolean>(false);
  const locale = useSettingsStore((state) => state.uiLocale);
  return (
    <>
      {showLineSelection ? (
        <div className="mr-auto">
          <LineSelectionToolbar compact />
        </div>
      ) : null}
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
      {showMetadata ? (
        <>
          <ModalCommon
            title={text(locale, "ข้อมูลเพลง", "Music metadata")}
            open={metadata}
            cancelButtonProps={null}
            okButtonProps={{
              children: text(locale, "บันทึก", "Save"),
              form: "mobile-metadata-form",
              type: "submit",
            }}
            onClose={() => setMetadata(false)}
          >
            <MetadataForm
              card={false}
              requiredFirst
              inputSize="md"
              className="flex flex-col gap-2"
              autoSave={false}
              formId="mobile-metadata-form"
              onSave={() => setMetadata(false)}
              showRequiredErrors
              validateRequiredOnSave
            />
          </ModalCommon>
          <ButtonCommon
            onClick={() => setMetadata(true)}
            color="white"
            size="xs"
            icon={<StickyNote />}
          >
            {text(locale, "ข้อมูลเพลง", "Metadata")}
          </ButtonCommon>
        </>
      ) : null}
    </>
  );
};

export default MobileActionButton;
