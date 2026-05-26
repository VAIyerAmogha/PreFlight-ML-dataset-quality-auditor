import { cn } from "../../lib/cn";

export function Button({ className = "", variant = "default", size = "md", asChild = false, ...props }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: "bg-white text-slate-950 hover:bg-slate-200",
    secondary: "border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800",
    outline: "border border-slate-800 bg-transparent text-slate-100 hover:bg-slate-900",
    destructive: "bg-red-500 text-white hover:bg-red-400"
  };
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-sm"
  };

  if (asChild && props.children) {
    return props.children;
  }

  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}