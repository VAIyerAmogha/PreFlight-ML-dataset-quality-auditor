import { cn } from "../../lib/cn";

export function Progress({ value = 0, className = "" }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-800", className)}>
      <div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${safe}%` }} />
    </div>
  );
}