"use client";

import { ArrowLeft, ArrowRight, RefreshCcw, Sparkles } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuditorBreakdownChart from "../../../../components/AuditorBreakdownChart";
import FindingsBadge from "../../../../components/FindingsBadge";
import ScoreGauge from "../../../../components/ScoreGauge";
import WorkflowHeader from "../../../../components/WorkflowHeader";
import { getReport, saveLatestReport } from "../../../../lib/api";

export default function ReportPage() {
  const { jobId } = useParams();
  const router = useRouter();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const data = await getReport(jobId);
        if (!active) return;
        setReport(data);
        saveLatestReport(data);
        setError("");
      } catch (err) {
        if (active) setError(err.message || "Unable to load report.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [jobId]);

  return (
    <main className="min-h-screen px-4 py-5 text-slate-100 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <WorkflowHeader
          eyebrow="Audit report"
          title="Dataset quality dashboard"
          description="This screen holds the finished scorecard and the detailed findings. It also saves the latest result so the home dashboard can reopen the most recent run after export."
          steps={["Dashboard", "Upload", "Audit", "Review", "Export"]}
          activeStep={3}
          jobId={jobId}
        />

        {loading ? <div className="panel-surface rounded-[28px] border border-white/8 p-4 text-sm font-semibold text-slate-400 shadow-soft">Loading report...</div> : null}
        {error ? (
          <div className="flex flex-col gap-3 rounded-[28px] border border-rose-500/25 bg-rose-500/10 p-4 text-sm font-semibold text-rose-200 md:flex-row md:items-center md:justify-between">
            {error}
            <button
              type="button"
              onClick={() => location.reload()}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-slate-200 transition hover:border-blue-400/40 hover:bg-blue-400/10"
            >
              <RefreshCcw size={15} />
              Retry
            </button>
          </div>
        ) : null}

        {report ? (
          <>
            <section className="grid gap-6 lg:grid-cols-[340px_1fr]">
              <div className="panel-surface rounded-[32px] border border-white/8 p-6 shadow-soft shadow-blue-950/20 animate-fade-up">
                <ScoreGauge score={report.overall_score ?? report.score} label={report.score_label ?? report.interpretation_label} />
                <div className="mt-5 rounded-2xl border border-blue-400/15 bg-blue-400/8 p-4 text-center text-sm font-semibold text-blue-100">
                  {report.score_label ?? report.interpretation_label}
                </div>
              </div>

              <div className="panel-surface rounded-[32px] border border-white/8 p-6 shadow-soft shadow-blue-950/20 animate-fade-up">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-200">
                  <Sparkles size={16} />
                  Auditor score breakdown
                </div>
                <div className="mt-4">
                  <AuditorBreakdownChart breakdown={report.score_breakdown} />
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
              <div className="panel-surface rounded-[32px] border border-white/8 p-6 shadow-soft shadow-blue-950/20">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-blue-200/80">Detailed review</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Findings by auditor</h2>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                    {report.filename}
                  </div>
                </div>

                <div className="mt-5 grid gap-4">
                  {(report.auditor_results || []).map((auditor) => (
                    <section key={auditor.auditor_name} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold capitalize text-ink">{auditor.auditor_name.replaceAll("_", " ")}</h3>
                          <p className="mt-1 text-sm text-slate-400">
                            Score {Number(auditor.score || 0).toFixed(0)} · {auditor.status}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3">
                        {(auditor.findings || []).length ? (
                          auditor.findings.map((finding, index) => (
                            <div key={`${finding.issue_type}-${index}`} className="rounded-2xl border border-white/8 bg-slate-950/60 p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <FindingsBadge severity={finding.severity} />
                                {(finding.affected_columns || []).map((column) => (
                                  <span key={column} className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-1 text-xs font-semibold text-slate-300">
                                    {column}
                                  </span>
                                ))}
                              </div>
                              <p className="mt-2 text-sm leading-7 text-slate-300">{finding.message}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-400">No findings reported.</p>
                        )}
                      </div>
                    </section>
                  ))}
                </div>
              </div>

              <aside className="grid gap-4">
                <div className="rounded-[28px] border border-blue-400/15 bg-blue-400/8 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-100">
                    <Sparkles size={16} />
                    What this screen is for
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    The dashboard translates the report into something easy to act on: overall quality, auditor breakdown, and a step-by-step view of each finding.
                  </p>
                </div>

                <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-slate-300">
                  <p className="font-semibold text-ink">Navigation</p>
                  <p className="mt-2">Use Back to return to the audit progress screen, or continue to suggestions to choose the exact fixes that should be exported.</p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/jobs/${jobId}/progress`)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-slate-200 transition hover:border-blue-400/40 hover:bg-blue-400/10"
                  >
                    <ArrowLeft size={16} />
                    Back to progress
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/jobs/${jobId}/suggestions`)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue-500 px-5 text-sm font-semibold text-white transition hover:bg-blue-400"
                  >
                    Next: suggestions
                    <ArrowRight size={16} />
                  </button>
                </div>
              </aside>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
