import { cn } from "../../lib/cn";

export function ScrollArea({ className = "", ...props }) {
  return <div className={cn("overflow-auto scrollbar-slim", className)} {...props} />;
}