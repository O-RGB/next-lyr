"use client";

import { Loader2 } from "lucide-react";
import { createPortal } from "react-dom";

type ProjectLoadingProps = {
  message: string;
};

export default function ProjectLoading({ message }: ProjectLoadingProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/20 p-4 text-foreground backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-[220px] flex-col items-center gap-3 rounded-lg border border-line bg-panel px-7 py-6 text-center shadow-2xl">
        <Loader2 className="size-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>,
    document.body
  );
}
