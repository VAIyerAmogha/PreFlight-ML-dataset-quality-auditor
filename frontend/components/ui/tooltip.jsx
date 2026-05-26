import { cn } from "../../lib/cn";

export function Tooltip({ content, className = "", children }) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      {content ? (
        <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-max max-w-xs -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 shadow-xl group-hover:block">
          {content}
        </span>
      ) : null}
    </span>
  );
}
