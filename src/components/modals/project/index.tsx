import ModalCommon from "@/components/common/modal";
import React from "react";

interface ProjectModalProps {
  open?: boolean;
  onClose?: () => void;
}

const ProjectModal: React.FC<ProjectModalProps> = ({
  open = false,
  onClose = () => {},
}) => {
  return (
    <ModalCommon
      modalId="read-lyrics"
      title="เลือกเพลง"
      open={open}
      onClose={onClose}
      footer={null}
    ></ModalCommon>
  );
};

export default ProjectModal;
