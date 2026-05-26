"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

export function SimulationChart({ data = [] }) {
  if (!data.length) {
    return <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 p-6 text-sm text-slate-500">No chart data available.</div>;
  }

  return (
    <div className="h-[320px] w-full rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="metric" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} domain={[0, 100]} />
          <Tooltip contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 12, color: "#e2e8f0" }} />
          <Legend wrapperStyle={{ color: "#94a3b8" }} />
          <Bar dataKey="before" fill="#475569" radius={[8, 8, 0, 0]} />
          <Bar dataKey="after" fill="#e2e8f0" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
