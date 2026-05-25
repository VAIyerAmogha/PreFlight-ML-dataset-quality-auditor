"use client";

import { Download, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import MetricsTable from "../../../../components/MetricsTable";
import { downloadBlob, exportJob, getSuggestions, loadJobContext, runSimulation, saveJobContext } from "../../../../lib/api";

export default function SimulationPage() {
  const { jobId } = useParams();
  const [result, setResult] = useState(null);
  const [acceptedIds, setAcceptedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const chartData = useMemo(() => {
    const metrics = Object.keys(result?.before_metrics || {});
    return metrics.map((metric) => ({
      metric: metric.replaceAll("_", " "),
      before: typeof result.before_metrics[metric] === "number" ? Number(result.before_metrics[metric]) : Number(result.before_metrics[metric]?.mean || 0),
      after: typeof result.after_metrics?.[metric] === "number" ? Number(result.after_metrics?.[metric]) : Number(result.after_metrics?.[metric]?.mean || 0)
    }));
  }, [result]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const context = loadJobContext(jobId);
        if (context.simulation) {
          if (active) {
            setAcceptedIds(context.acceptedIds || []);
            setResult(context.simulation);
          }
          return;
        }

        const suggestionData = await getSuggestions(jobId);
        const suggestions = Array.isArray(suggestionData) ? suggestionData : suggestionData.suggestions || [];
        const ids = context.acceptedIds?.length ? context.acceptedIds : suggestions.map((suggestion) => suggestion.id);
        const freshResult = await runSimulation(jobId, ids, context.targetColumn);
        saveJobContext(jobId, { ...context, acceptedIds: ids, simulation: freshResult });
        if (active) {
          setAcceptedIds(ids);
          setResult(freshResult);
        }
      } catch (err) {
        if (active) setError(err.message || "Unable to load simulation.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [jobId]);

  async function handleExport() {
    setExporting(true);
    setError("");
    try {
      const context = loadJobContext(jobId);
      const blob = await exportJob(jobId, acceptedIds, context.targetColumn);
      downloadBlob(blob, `preflight-${jobId}.zip`);
    } catch (err) {
      setError(err.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7f1] px-5 py-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-normal text-fern">Simulation</p>
            <h1 className="mt-2 text-4xl font-bold text-ink">Before vs after impact</h1>
            {result?.task_type ? <p className="mt-2 text-sm font-semibold capitalize text-slate-600">{result.task_type} task</p> : null}
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading || exporting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-fern px-5 text-sm font-bold text-white hover:bg-[#285f43] disabled:bg-slate-300"
          >
            {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Export
          </button>
        </header>

        {loading ? <div className="rounded-md border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">Loading simulation...</div> : null}
        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}

        {result ? (
          <>
            <div className="overflow-x-auto">
              <MetricsTable result={result} />
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
              <h2 className="text-xl font-bold text-ink">Metric comparison</h2>
              <div className="mt-5 h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dfe7d9" />
                    <XAxis dataKey="metric" tick={{ fill: "#536156", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#536156", fontSize: 12 }} />
                    <Tooltip cursor={{ fill: "#eef4ea" }} />
                    <Legend />
                    <Bar dataKey="before" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="after" fill="#2f6f4e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
