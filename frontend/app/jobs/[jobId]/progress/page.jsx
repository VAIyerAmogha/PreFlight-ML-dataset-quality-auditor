"use client";

import { AlertCircle, CheckCircle2, Clock3, Loader2, RadioTower } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getJob } from "../../../../lib/api";

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
        if (String(data.status).toLowerCase() === "completed" || data.report_ready) {
          router.push(`/jobs/${jobId}/report`);
        }
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
    <main className="min-h-screen bg-[#f4f7f1] px-5 py-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-normal text-fern">Audit in progress</p>
              <h1 className="mt-2 text-3xl font-bold text-ink">Job {jobId}</h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-4 py-2 text-sm font-bold capitalize text-fern">
              <RadioTower size={18} />
              {job?.status || "starting"}
            </div>
          </div>
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-sm font-semibold text-slate-600">
              <span>Overall progress</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-fern transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        {loading ? <div className="rounded-md border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">Loading job status...</div> : null}
        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}

        <div className="grid gap-3">
          {rows.map((row) => (
            <div key={row.name} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <div className="font-bold capitalize text-ink">{row.name.replaceAll("_", " ")}</div>
                <div className="mt-1 text-sm capitalize text-slate-500">{row.status}</div>
              </div>
              <StatusIcon status={row.status} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
