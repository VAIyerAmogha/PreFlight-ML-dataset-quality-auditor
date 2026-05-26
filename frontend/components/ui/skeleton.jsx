import { cn } from "../../lib/cn";

export function Skeleton({ className = "" }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-800/90", className)} />;
}
