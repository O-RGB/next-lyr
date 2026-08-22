import { ArrowLeft } from "lucide-react";
import React from "react";

import ButtonCommon, { type ButtonCommonProps } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * The editor's modal, rebuilt on the shared base-ui dialog.
 *
 * The previous version hand-rolled focus trapping, scroll locking, an iOS body
 * position hack and its own animation timers. base-ui does all of that, so what
 * is left here is only the parts specific to this app: the title bar, the
 * scrollable body, and the default OK/Cancel footer.
 */
export interface ModalCommonProps {
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Pass `null` to render no footer at all. */
  footer?: React.ReactNode | null;
  /** Pass `null` to drop just that button. */
  okButtonProps?: ButtonCommonProps | null;
  cancelButtonProps?: ButtonCommonProps | null;
  modalClassName?: string;
  className?: string;
  showCloseButton?: boolean;
}

const ModalCommon: React.FC<ModalCommonProps> = ({
  open,
  onClose,
  children,
  title,
  description,
  footer,
  okButtonProps,
  cancelButtonProps,
  modalClassName,
  className,
  showCloseButton = true,
}) => {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className={cn(
          // Wide enough for the lyric and chord tables this editor puts in modals.
          "max-h-[92dvh] gap-0 overflow-hidden p-0 sm:max-w-[min(900px,92vw)]",
          modalClassName,
          className
        )}
        showCloseButton={showCloseButton}
      >
        {title ? (
          <DialogHeader className="shrink-0 border-b border-line bg-panel px-5 py-4 pr-12">
            <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {children}
        </div>

        {footer !== null ? (
          <div className="shrink-0 border-t border-line bg-panel-2 p-4">
            {footer ?? (
              <div className="flex items-center justify-end gap-3">
                {cancelButtonProps !== null ? (
                  <ButtonCommon
                    size="sm"
                    color="gray"
                    icon={<ArrowLeft />}
                    onClick={onClose}
                    {...cancelButtonProps}
                  >
                    {cancelButtonProps?.children ?? "Cancel"}
                  </ButtonCommon>
                ) : null}
                {okButtonProps !== null ? (
                  <ButtonCommon color="primary" size="sm" {...okButtonProps}>
                    {okButtonProps?.children ?? "OK"}
                  </ButtonCommon>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default ModalCommon;
