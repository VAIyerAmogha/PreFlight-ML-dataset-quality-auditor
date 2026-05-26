import { cn } from "../../lib/cn";

export function Card({ className = "", ...props }) {
  return <div className={cn("rounded-2xl border border-slate-800 bg-slate-900/80 shadow-[0_1px_0_rgba(255,255,255,0.02)]", className)} {...props} />;
}

export function CardHeader({ className = "", ...props }) {
  return <div className={cn("flex flex-col gap-1.5 border-b border-slate-800 px-5 py-4", className)} {...props} />;
}

export function CardContent({ className = "", ...props }) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}