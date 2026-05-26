"use client";

import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";

export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog overlay"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={() => onOpenChange?.(false)}
      />
      {children}
    </div>,
    document.body
  );
}

export function DialogContent({ className = "", ...props }) {
  return <div className={cn("relative z-10 w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl", className)} {...props} />;
}

export function DialogHeader({ className = "", ...props }) {
  return <div className={cn("border-b border-slate-800 px-6 py-5", className)} {...props} />;
}

export function DialogTitle({ className = "", ...props }) {
  return <h2 className={cn("text-xl font-semibold tracking-tight text-slate-100", className)} {...props} />;
}

export function DialogDescription({ className = "", ...props }) {
  return <p className={cn("mt-1 text-sm leading-6 text-slate-400", className)} {...props} />;
}

export function DialogFooter({ className = "", ...props }) {
  return <div className={cn("flex items-center justify-end gap-3 border-t border-slate-800 px-6 py-5", className)} {...props} />;
}
