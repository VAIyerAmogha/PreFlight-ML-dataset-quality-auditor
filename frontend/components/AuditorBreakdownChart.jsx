"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function AuditorBreakdownChart({ breakdown = {} }) {
  const data = Array.isArray(breakdown)
    ? breakdown.map((item) => ({
        name: String(item.auditor_name || "").replaceAll("_", " "),
        score: Number(item.score) || 0
      }))
    : Object.entries(breakdown).map(([name, score]) => ({
        name: name.replaceAll("_", " "),
        score: Number(score) || 0
      }));

  if (!data.length) {
    return <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">No score breakdown available.</div>;
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 26 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148, 163, 184, 0.16)" />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <YAxis type="category" dataKey="name" width={112} tick={{ fill: "#e2e8f0", fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: "rgba(79, 140, 255, 0.08)" }}
            contentStyle={{ background: "#07111f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#e8eefc" }}
            labelStyle={{ color: "#bfdbfe" }}
          />
          <Bar dataKey="score" radius={[0, 10, 10, 0]} fill="#4f8cff" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
