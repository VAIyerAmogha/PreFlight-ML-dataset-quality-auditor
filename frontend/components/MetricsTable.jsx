export default function MetricsTable({ result }) {
  const metrics = Object.keys(result?.before_metrics || {});

  if (!metrics.length) {
    return <div className="rounded-md border border-dashed border-slate-300 p-6 text-sm text-slate-500">No simulation metrics available.</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[620px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
          <tr>
            <th className="px-4 py-3">Metric</th>
            <th className="px-4 py-3">Before</th>
            <th className="px-4 py-3">After</th>
            <th className="px-4 py-3">Delta</th>
            <th className="px-4 py-3">p-value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
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
                <td className="px-4 py-3 text-slate-700">
                  {beforeMean.toFixed(3)}
                  {beforeStd ? <span className="ml-1 text-xs text-slate-400">± {beforeStd}</span> : null}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {afterMean.toFixed(3)}
                  {afterStd ? <span className="ml-1 text-xs text-slate-400">± {afterStd}</span> : null}
                </td>
                <td className={`px-4 py-3 font-bold ${delta >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {delta >= 0 ? "+" : ""}
                  {delta.toFixed(3)}
                </td>
                <td className={`px-4 py-3 font-semibold ${Number(pValue) < 0.05 ? "text-fern" : "text-slate-500"}`}>
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
