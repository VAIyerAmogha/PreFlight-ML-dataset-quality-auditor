"use client";

import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Clock3, Loader2, RadioTower, Sparkles } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getJob } from "../../../../lib/api";
import WorkflowHeader from "../../../../components/WorkflowHeader";

const auditors = ["missing_data", "duplicates", "class_imbalance", "data_leakage", "label_noise", "outliers", "bias"];

function statusFor(index, progress, jobStatus) {
  const normalized = String(jobStatus || "").toLowerCase();
  if (normalized === "failed") return "failed";
  if (normalized === "completed") return "complete";
  const threshold = ((index + 1) / auditors.length) * 100;
  const previous = (index / auditors.length) * 100;
  if (progress >= threshold) return "complete";
  if (progress >= previous) return "running";
  return "pending";
}

function StatusIcon({ status }) {
  if (status === "complete") return <CheckCircle2 className="text-emerald-600" size={20} />;
  if (status === "running") return <Loader2 className="animate-spin text-amberline" size={20} />;
  if (status === "failed") return <AlertCircle className="text-red-600" size={20} />;
  return <Clock3 className="text-slate-400" size={20} />;
}

export default function ProgressPage() {
  const { jobId } = useParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const progress = Math.max(0, Math.min(100, Number(job?.progress) || 0));
  const isComplete = String(job?.status || "").toLowerCase() === "completed" || Boolean(job?.report_ready);

  const rows = useMemo(
    () => auditors.map((name, index) => ({ name, status: statusFor(index, progress, job?.status) })),
    [job?.status, progress]
  );

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const data = await getJob(jobId);
        if (!active) return;
        setJob(data);
        setError("");
      } catch (err) {
        if (active) setError(err.message || "Unable to load job progress.");
      } finally {
        if (active) setLoading(false);
      }
    }

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [jobId, router]);

  return (
    <main className="min-h-screen px-4 py-5 text-slate-100 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <WorkflowHeader
          eyebrow="Audit in progress"
          title={`Job ${jobId}`}
          description="The auditors are scanning the dataset, scoring the report, and preparing the review screen. This step is read-only so you can watch the progress before moving on."
          steps={["Dashboard", "Upload", "Audit", "Review", "Export"]}
          activeStep={2}
          jobId={jobId}
        />

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="panel-surface rounded-[32px] border border-white/8 p-6 shadow-soft shadow-blue-950/20 animate-fade-up">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-blue-200/80">Current scan</div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Running the quality pipeline</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-sm font-semibold capitalize text-blue-100">
                  <RadioTower size={18} />
                  {job?.status || "starting"}
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-sm font-semibold text-slate-400">
                  <span>Overall progress</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-900/80">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-sky-300 transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Live status</div>
                  <div className="mt-2 text-lg font-semibold text-ink">{job?.status || "starting"}</div>
                </div>
                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Progress</div>
                  <div className="mt-2 text-lg font-semibold text-ink">{progress.toFixed(0)}%</div>
                </div>
                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Next step</div>
                  <div className="mt-2 text-lg font-semibold text-ink">{isComplete ? "Review" : "Waiting"}</div>
                </div>
              </div>

              <div className="rounded-[28px] border border-blue-400/15 bg-blue-400/8 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-100">
                  <Sparkles size={16} />
                  What this step explains
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Each auditor checks a specific quality risk: missing values, duplicates, class imbalance, leakage, label noise, outliers, and bias. When the scan completes, the report will be ready for review.
                </p>
              </div>

              {loading ? <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 text-sm font-semibold text-slate-400">Loading job status...</div> : null}
              {error ? <div className="rounded-3xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm font-semibold text-rose-200">{error}</div> : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-slate-200 transition hover:border-blue-400/40 hover:bg-blue-400/10"
                >
                  <ArrowLeft size={16} />
                  Back to upload
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/jobs/${jobId}/report`)}
                  disabled={!isComplete}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-blue-500 px-5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700"
                >
                  Next: review report
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </article>

          <aside className="grid gap-4">
            {rows.map((row) => (
              <div key={row.name} className="flex items-center justify-between rounded-[24px] border border-white/8 bg-white/[0.03] p-4 shadow-soft shadow-blue-950/20">
                <div>
                  <div className="font-semibold capitalize text-ink">{row.name.replaceAll("_", " ")}</div>
                  <div className="mt-1 text-sm capitalize text-slate-400">{row.status}</div>
                </div>
                <StatusIcon status={row.status} />
              </div>
            ))}
          </aside>
        </section>
      </div>
    </main>
  );
}
