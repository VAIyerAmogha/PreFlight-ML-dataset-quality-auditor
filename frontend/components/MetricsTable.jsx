export default function MetricsTable({ result }) {
  const metrics = Object.keys(result?.before_metrics || {});

  if (!metrics.length) {
    return <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">No comparison metrics available.</div>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04] backdrop-blur">
      <table className="w-full min-w-[620px] text-left text-sm">
        <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.18em] text-slate-400">
          <tr>
            <th className="px-4 py-3">Metric</th>
            <th className="px-4 py-3">Before</th>
            <th className="px-4 py-3">After</th>
            <th className="px-4 py-3">Delta</th>
            <th className="px-4 py-3">p-value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/6">
          {metrics.map((metric) => {
            const delta = Number(result.deltas?.[metric] || 0);
            const pValue = result.p_values?.[metric];
            const before = result.before_metrics[metric];
            const after = result.after_metrics?.[metric];
            const beforeMean = typeof before === "number" ? before : Number(before?.mean || 0);
            const afterMean = typeof after === "number" ? after : Number(after?.mean || 0);
            const beforeStd = typeof before === "object" && before?.std != null ? Number(before.std).toFixed(3) : null;
            const afterStd = typeof after === "object" && after?.std != null ? Number(after.std).toFixed(3) : null;
            return (
              <tr key={metric}>
                <td className="px-4 py-3 font-semibold text-ink">{metric.replaceAll("_", " ")}</td>
                <td className="px-4 py-3 text-slate-300">
                  {beforeMean.toFixed(3)}
                  {beforeStd ? <span className="ml-1 text-xs text-slate-500">± {beforeStd}</span> : null}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {afterMean.toFixed(3)}
                  {afterStd ? <span className="ml-1 text-xs text-slate-500">± {afterStd}</span> : null}
                </td>
                <td className={`px-4 py-3 font-bold ${delta >= 0 ? "text-blue-300" : "text-rose-300"}`}>
                  {delta >= 0 ? "+" : ""}
                  {delta.toFixed(3)}
                </td>
                <td className={`px-4 py-3 font-semibold ${Number(pValue) < 0.05 ? "text-blue-200" : "text-slate-400"}`}>
                  {pValue == null ? "n/a" : Number(pValue).toFixed(3)}
                  {Number(pValue) < 0.05 ? " significant" : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
