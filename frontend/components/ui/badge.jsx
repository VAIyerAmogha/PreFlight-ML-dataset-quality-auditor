import { cn } from "../../lib/cn";

export function Badge({ className = "", variant = "default", ...props }) {
  const variants = {
    default: "border border-slate-700 bg-slate-800 text-slate-100",
    subtle: "border border-slate-800 bg-slate-900 text-slate-300",
    critical: "border border-red-500/30 bg-red-950/70 text-red-200",
    warning: "border border-amber-500/30 bg-amber-950/60 text-amber-200",
    healthy: "border border-emerald-500/30 bg-emerald-950/60 text-emerald-200",
    info: "border border-slate-500/30 bg-slate-800 text-slate-200"
  };

  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", variants[variant] || variants.default, className)} {...props} />;
}