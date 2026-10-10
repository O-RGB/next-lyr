"use client";

import type { ReactNode } from "react";
import useIsMobile from "@/hooks/useIsMobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";

/** Both content and effects share responsive sizing, focus trapping and scrolling. */
export function EditorDrawer({ open, onClose, title, description, children, footer, initialFocus, placement = "responsive" }: {
  open: boolean; onClose: () => void; title: string; description: string;
  children: ReactNode; footer?: ReactNode;
  initialFocus?: () => HTMLElement | null;
  placement?: "responsive" | "bottom";
}) {
  const mobile = useIsMobile(640);
  return <Sheet open={open} onOpenChange={next => { if (!next) onClose(); }}>
    <SheetContent side={placement === "bottom" || mobile ? "bottom" : "right"} initialFocus={initialFocus}
      backdropProps={{ forceRender: true, className: "z-[60] bg-black/20" }}
      className="z-[61] gap-0 overflow-hidden bg-panel data-[side=bottom]:h-[82dvh] data-[side=bottom]:rounded-t-2xl data-[side=bottom]:sm:mx-auto data-[side=bottom]:sm:max-w-[760px] data-[side=right]:w-[min(440px,92vw)] data-[side=right]:sm:max-w-[440px]">
      <SheetHeader className="shrink-0 border-b border-line pr-12">
        <SheetTitle>{title}</SheetTitle>
        <SheetDescription>{description}</SheetDescription>
      </SheetHeader>
      <div data-editor-drawer-body className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
      {footer && <SheetFooter className="shrink-0 border-t border-line pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</SheetFooter>}
    </SheetContent>
  </Sheet>;
}
