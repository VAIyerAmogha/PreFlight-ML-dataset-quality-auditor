"use client";

import { Download, Loader2, Play } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import SuggestionCard from "../../../../components/SuggestionCard";
import { downloadBlob, exportJob, getSuggestions, loadJobContext, runSimulation, saveJobContext } from "../../../../lib/api";

export default function SuggestionsPage() {
  const { jobId } = useParams();
  const router = useRouter();
  const [suggestions, setSuggestions] = useState([]);
  const [acceptedIds, setAcceptedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const acceptedSet = useMemo(() => new Set(acceptedIds), [acceptedIds]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const context = loadJobContext(jobId);
        const data = await getSuggestions(jobId);
        const list = Array.isArray(data) ? data : data.suggestions || [];
        if (active) {
          setSuggestions(list);
          if (context.acceptedIds?.length) {
            setAcceptedIds(context.acceptedIds);
          } else {
            setAcceptedIds(list.map((suggestion) => suggestion.id));
          }
          setError("");
        }
      } catch (err) {
        if (active) setError(err.message || "Unable to load suggestions.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [jobId]);

  function toggleSuggestion(id) {
    setAcceptedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function handleSimulation() {
    setSimulating(true);
    setError("");
    try {
      const context = loadJobContext(jobId);
      saveJobContext(jobId, { ...context, acceptedIds });
      const result = await runSimulation(jobId, acceptedIds, context.targetColumn);
      saveJobContext(jobId, { ...context, acceptedIds, simulation: result });
      router.push(`/jobs/${jobId}/simulation`);
    } catch (err) {
      setError(err.message || "Simulation failed.");
    } finally {
      setSimulating(false);
    }
  }

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
            <p className="text-sm font-bold uppercase tracking-normal text-fern">Suggestions</p>
            <h1 className="mt-2 text-4xl font-bold text-ink">Review recommended fixes</h1>
            <p className="mt-2 text-sm text-slate-600">{acceptedIds.length} of {suggestions.length} suggestions accepted</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSimulation}
              disabled={loading || simulating}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-fern px-5 text-sm font-bold text-white hover:bg-[#285f43] disabled:bg-slate-300"
            >
              {simulating ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
              Run Simulation
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={loading || exporting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
            >
              {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              Export
            </button>
          </div>
        </header>

        {loading ? <div className="rounded-md border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">Loading suggestions...</div> : null}
        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}
        {!loading && !suggestions.length ? <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">No suggestions returned.</div> : null}

        <div className="grid gap-4">
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              accepted={acceptedSet.has(suggestion.id)}
              onToggle={toggleSuggestion}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
