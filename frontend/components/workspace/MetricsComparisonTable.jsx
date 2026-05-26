import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

function deltaTone(delta) {
  if (delta > 0) return "text-emerald-300";
  if (delta < 0) return "text-red-300";
  return "text-slate-400";
}

export function MetricsComparisonTable({ rows = [] }) {
  if (!rows.length) {
    return <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 p-6 text-sm text-slate-500">No simulation data available.</div>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-950/60 hover:bg-slate-950/60">
            <TableHead>Metric</TableHead>
            <TableHead>Before</TableHead>
            <TableHead>After</TableHead>
            <TableHead>Delta</TableHead>
            <TableHead>Significance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.metric}>
              <TableCell className="font-medium text-slate-100">{row.metric}</TableCell>
              <TableCell className="text-slate-300">{Number(row.before).toFixed(1)}</TableCell>
              <TableCell className="text-slate-300">{Number(row.after).toFixed(1)}</TableCell>
              <TableCell className={`font-medium ${deltaTone(row.delta)}`}>{row.delta > 0 ? "+" : ""}{Number(row.delta).toFixed(1)}</TableCell>
              <TableCell>
                <Badge variant={Number(row.pValue) < 0.05 ? "healthy" : "info"}>{Number(row.pValue).toFixed(3)} {Number(row.pValue) < 0.05 ? "significant" : "not significant"}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
