"use client";

import { ArrowRight, RefreshCcw } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuditorBreakdownChart from "../../../../components/AuditorBreakdownChart";
import FindingsBadge from "../../../../components/FindingsBadge";
import ScoreGauge from "../../../../components/ScoreGauge";
import { getReport } from "../../../../lib/api";

function labelClass(label = "") {
  const normalized = label.toLowerCase();
  if (normalized.includes("excellent")) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (normalized.includes("good")) return "text-fern bg-emerald-50 border-emerald-200";
  if (normalized.includes("fair")) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

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
        if (active) {
          setReport(data);
          setError("");
        }
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
    <main className="min-h-screen bg-[#f4f7f1] px-5 py-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-normal text-fern">Audit report</p>
            <h1 className="mt-2 text-4xl font-bold text-ink">Dataset quality summary</h1>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/jobs/${jobId}/suggestions`)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-fern px-5 text-sm font-bold text-white hover:bg-[#285f43]"
          >
            Suggestions
            <ArrowRight size={18} />
          </button>
        </header>

        {loading ? <div className="rounded-md border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">Loading report...</div> : null}
        {error ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
            <button type="button" onClick={() => location.reload()} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-red-700">
              <RefreshCcw size={15} />
              Retry
            </button>
          </div>
        ) : null}

        {report ? (
          <>
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
                <ScoreGauge score={report.overall_score ?? report.score} label={report.score_label ?? report.interpretation_label} />
                <div className={`mx-auto mt-5 w-fit rounded-full border px-4 py-1.5 text-sm font-bold ${labelClass(report.score_label ?? report.interpretation_label)}`}>
                  {report.score_label ?? report.interpretation_label}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
                <h2 className="text-xl font-bold text-ink">Auditor score breakdown</h2>
                <div className="mt-4">
                  <AuditorBreakdownChart breakdown={report.score_breakdown} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
              <h2 className="text-xl font-bold text-ink">Findings by auditor</h2>
              <div className="mt-5 grid gap-4">
                {(report.auditor_results || []).map((auditor) => (
                  <section key={auditor.auditor_name} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold capitalize text-ink">{auditor.auditor_name.replaceAll("_", " ")}</h3>
                        <p className="mt-1 text-sm text-slate-500">Score {Number(auditor.score || 0).toFixed(0)} · {auditor.status}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {(auditor.findings || []).length ? (
                        auditor.findings.map((finding, index) => (
                          <div key={`${finding.issue_type}-${index}`} className="rounded-md bg-slate-50 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <FindingsBadge severity={finding.severity} />
                              {(finding.affected_columns || []).map((column) => (
                                <span key={column} className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                                  {column}
                                </span>
                              ))}
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-700">{finding.message}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No findings reported.</p>
                      )}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
