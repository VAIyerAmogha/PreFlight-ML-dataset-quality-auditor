import { Card, CardContent, CardHeader } from "../ui/card";

export default function SummaryCard({ label, value, helperText }) {
  return (
    <Card>
      <CardHeader>
        <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</div>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-semibold tracking-tight text-slate-100">{value}</div>
        {helperText ? <div className="mt-2 text-sm text-slate-400">{helperText}</div> : null}
      </CardContent>
    </Card>
  );
}
