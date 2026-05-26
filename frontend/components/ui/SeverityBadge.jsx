import { Badge } from "./badge";
import { normalizeSeverity } from "../../lib/workspace";

export default function SeverityBadge({ severity = "info", className = "" }) {
  const normalized = normalizeSeverity(severity);
  return <Badge variant={normalized === "healthy" ? "healthy" : normalized} className={className}>{normalized}</Badge>;
}
