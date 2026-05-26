import { cn } from "../../lib/cn";

export function Table({ className = "", ...props }) {
  return <table className={cn("w-full text-left text-sm", className)} {...props} />;
}

export function TableHeader({ className = "", ...props }) {
  return <thead className={cn("text-xs uppercase tracking-[0.18em] text-slate-500", className)} {...props} />;
}

export function TableBody({ className = "", ...props }) {
  return <tbody className={cn("divide-y divide-slate-800", className)} {...props} />;
}

export function TableRow({ className = "", ...props }) {
  return <tr className={cn("transition-colors hover:bg-slate-900/70", className)} {...props} />;
}

export function TableHead({ className = "", ...props }) {
  return <th className={cn("px-4 py-3 font-medium", className)} {...props} />;
}

export function TableCell({ className = "", ...props }) {
  return <td className={cn("px-4 py-3 align-top", className)} {...props} />;
}
