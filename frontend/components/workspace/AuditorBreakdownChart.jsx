"use client";

import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

function barColor(score) {
  if (score >= 85) return "#10b981";
  if (score >= 70) return "#f59e0b";
  if (score >= 50) return "#64748b";
  return "#ef4444";
}

export function AuditorBreakdownChart({ breakdown = [] }) {
  const data = Array.isArray(breakdown)
    ? breakdown.map((item) => ({
        name: String(item.auditor_name || "").replaceAll("_", " "),
        score: Number(item.score || 0)
      }))
    : Object.entries(breakdown).map(([name, score]) => ({ name: name.replaceAll("_", " "), score: Number(score || 0) }));

  if (!data.length) {
    return <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 p-6 text-sm text-slate-500">No score breakdown available.</div>;
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 6, right: 12, bottom: 4, left: 24 }}>
          <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={120} tick={{ fill: "#cbd5e1", fontSize: 12 }} />
          <Tooltip contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 12, color: "#e2e8f0" }} />
          <Bar dataKey="score" radius={[0, 999, 999, 0]} fill="#e2e8f0" label={false}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={barColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
