"use client";

import { ArrowLeft, ArrowRight, Download, Loader2, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SuggestionCard from "../../../../components/SuggestionCard";
import WorkflowHeader from "../../../../components/WorkflowHeader";
import { downloadBlob, exportJob, getSuggestions, loadJobContext } from "../../../../lib/api";

export default function SuggestionsPage() {
  const { jobId } = useParams();
  const router = useRouter();
  const [suggestions, setSuggestions] = useState([]);
  const [acceptedIds, setAcceptedIds] = useState([]);
  const [loading, setLoading] = useState(true);
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

  async function handleExport() {
    setExporting(true);
    setError("");
    try {
      const context = loadJobContext(jobId);
      const blob = await exportJob(jobId, acceptedIds, context.targetColumn);
      downloadBlob(blob, `preflight-${jobId}.zip`);
      router.push("/");
    } catch (err) {
      setError(err.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 text-slate-100 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <WorkflowHeader
          eyebrow="Suggestions"
          title="Review the fixes and export only what you accept"
          description="This is the last decision step. Accepted suggestions are the only ones that get written into the cleaned export bundle, so you stay in control of the final dataset."
          steps={["Dashboard", "Upload", "Audit", "Review", "Export"]}
          activeStep={4}
          jobId={jobId}
        />

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <aside className="grid gap-4">
            <div className="panel-surface rounded-[28px] border border-white/8 p-5 shadow-soft shadow-blue-950/20 animate-fade-up">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-200">
                <Sparkles size={16} />
                Final decision checkpoint
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Accepted suggestions only</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Toggle each recommendation on or off. The export uses the accepted set only, so rejected fixes stay out of the generated dataset and pipeline script.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-slate-300">
              <p className="font-semibold text-ink">Step guidance</p>
              <p className="mt-2">Back returns you to the report dashboard. Export packages the cleaned CSV, the preprocessing code, and the audit report together.</p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => router.push(`/jobs/${jobId}/report`)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-slate-200 transition hover:border-blue-400/40 hover:bg-blue-400/10"
              >
                <ArrowLeft size={16} />
                Back to report
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={loading || exporting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue-500 px-5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                Next: export accepted bundle
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="rounded-[28px] border border-blue-400/15 bg-blue-400/8 p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-blue-200/80">Current selection</div>
              <div className="mt-2 text-2xl font-semibold text-ink">{acceptedIds.length} / {suggestions.length}</div>
              <p className="mt-2 text-sm leading-7 text-slate-300">Accepted suggestions will be applied to the exported dataset and listed in the bundle for traceability.</p>
            </div>
          </aside>

          <section className="grid gap-4">
            {loading ? <div className="panel-surface rounded-[28px] border border-white/8 p-4 text-sm font-semibold text-slate-400 shadow-soft">Loading suggestions...</div> : null}
            {error ? <div className="rounded-[28px] border border-rose-500/25 bg-rose-500/10 p-4 text-sm font-semibold text-rose-200">{error}</div> : null}
            {!loading && !suggestions.length ? <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-400">No suggestions returned.</div> : null}

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
        </section>
      </div>
    </main>
  );
}
