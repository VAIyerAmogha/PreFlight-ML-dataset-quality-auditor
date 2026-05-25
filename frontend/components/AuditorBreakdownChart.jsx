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
    return <div className="rounded-md border border-dashed border-slate-300 p-6 text-sm text-slate-500">No score breakdown available.</div>;
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 26 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#dfe7d9" />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: "#536156", fontSize: 12 }} />
          <YAxis type="category" dataKey="name" width={112} tick={{ fill: "#263229", fontSize: 12 }} />
          <Tooltip cursor={{ fill: "#eef4ea" }} />
          <Bar dataKey="score" radius={[0, 6, 6, 0]} fill="#2f6f4e" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
