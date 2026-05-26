import { Badge } from "./badge";

export default function StatusChip({ status = "info", className = "" }) {
  const normalized = String(status || "info").toLowerCase();
  const variant = normalized === "completed" || normalized === "healthy" ? "healthy" : normalized === "failed" ? "critical" : normalized === "running" ? "warning" : "info";
  return <Badge variant={variant} className={className}>{normalized}</Badge>;
}
