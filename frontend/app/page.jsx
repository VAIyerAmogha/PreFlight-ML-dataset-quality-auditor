"use client";

import { ArrowLeft, ArrowRight, BarChart3, Database, Loader2, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import WorkflowHeader from "../components/WorkflowHeader";
import { loadLatestReport, saveJobContext, uploadDataset } from "../lib/api";

function parseCsvHeaders(text) {
  const firstLine = text.split(/\r?\n/)[0] || "";
  return firstLine
    .split(",")
    .map((header) => header.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

export default function UploadPage() {
  const router = useRouter();
  const dashboardRef = useRef(null);
  const uploadRef = useRef(null);
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [targetColumn, setTargetColumn] = useState("");
  const [protectedAttributes, setProtectedAttributes] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [latestReport, setLatestReport] = useState(null);

  const protectedOptions = useMemo(() => headers.filter((header) => header !== targetColumn), [headers, targetColumn]);

  useEffect(() => {
    setLatestReport(loadLatestReport());
  }, []);

  function scrollToSection(ref) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleFile(nextFile) {
    setError("");
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      setError("Please choose a CSV file.");
      return;
    }

    setFile(nextFile);
    const text = await nextFile.slice(0, 64 * 1024).text();
    const parsedHeaders = parseCsvHeaders(text);
    setHeaders(parsedHeaders);
    setTargetColumn(parsedHeaders[parsedHeaders.length - 1] || "");
    setProtectedAttributes([]);
  }

  function toggleProtected(column) {
    setProtectedAttributes((current) =>
      current.includes(column) ? current.filter((item) => item !== column) : [...current, column]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) {
      setError("Choose a CSV file before starting the audit.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await uploadDataset({ file });
      saveJobContext(data.job_id, {
        filename: file.name,
        targetColumn,
        protectedAttributes
      });
      router.push(`/jobs/${data.job_id}/progress`);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 text-slate-100 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <WorkflowHeader
          eyebrow="PreFlightML"
          title="Minimal audit workflow for dataset quality"
          description="A focused, three-part flow: inspect the dashboard, upload a CSV, review the report, accept only the fixes you want, and export a cleaned bundle."
          steps={["Dashboard", "Upload", "Audit", "Review", "Export"]}
          activeStep={0}
        />

        <section ref={dashboardRef} className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="panel-surface rounded-[32px] border border-white/8 p-7 shadow-soft shadow-blue-950/30 animate-fade-up">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
                  <Sparkles size={13} />
                  Home dashboard
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
                  <ShieldCheck size={13} />
                  Local API proxy active
                </span>
              </div>

              <div className="max-w-3xl space-y-3">
                <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">{latestReport ? "Your latest run is ready" : "Start a new audit from a clean slate"}</h2>
                <p className="text-sm leading-7 text-slate-300 md:text-base">
                  The dashboard shows the finished scorecard, the review trail, and the fastest path into the next audit. When a report exists, the last completed result stays here so you can jump back in without losing context.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Step 1</div>
                  <div className="mt-2 font-semibold text-ink">Dashboard</div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">See the latest score, findings, and audit history before you upload anything new.</p>
                </div>
                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Step 2</div>
                  <div className="mt-2 font-semibold text-ink">Upload</div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Choose the target column and protected fields so the auditors know what matters.</p>
                </div>
                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Step 3</div>
                  <div className="mt-2 font-semibold text-ink">Export</div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Only accepted suggestions are applied to the exported dataset bundle.</p>
                </div>
              </div>

              {latestReport ? (
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-[28px] border border-blue-400/15 bg-blue-400/8 p-5 shadow-glow">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-blue-200/80">Latest completed audit</p>
                        <h3 className="mt-2 text-2xl font-semibold text-ink">{latestReport.filename}</h3>
                      </div>
                      <div className="rounded-full border border-blue-400/20 bg-slate-950/60 px-3 py-1.5 text-sm font-semibold text-blue-100">
                        Score {Number(latestReport.score || 0).toFixed(0)}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/8 bg-slate-950/40 p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Interpretation</div>
                        <div className="mt-2 text-lg font-semibold text-ink">{latestReport.interpretation_label || "Pending"}</div>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-slate-950/40 p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Findings</div>
                        <div className="mt-2 text-lg font-semibold text-ink">{(latestReport.findings || []).length}</div>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-slate-950/40 p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Auditors</div>
                        <div className="mt-2 text-lg font-semibold text-ink">{(latestReport.auditor_results || []).length}</div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => router.push(`/jobs/${latestReport.job_id}/report`)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue-500 px-5 text-sm font-semibold text-white transition hover:bg-blue-400"
                      >
                        Open latest dashboard
                        <ArrowRight size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollToSection(uploadRef)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-slate-200 transition hover:border-blue-400/40 hover:bg-blue-400/10"
                      >
                        Start a new upload
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-200">
                      <BarChart3 size={16} />
                      What this dashboard tracks
                    </div>
                    <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                      <p>• A compact score that summarizes how healthy the dataset looks after all auditors run.</p>
                      <p>• The findings list so you can see exactly what the model and the rules flagged.</p>
                      <p>• A single export path that applies only the suggestions you accept.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-200">
                    <BarChart3 size={16} />
                    No completed audit stored yet
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                    Uploading a CSV is the first move. Once the audit finishes, the dashboard will preserve the latest report here so you can come back to it from the home screen.
                  </p>
                </div>
              )}
            </div>
          </article>

          <aside className="grid gap-4">
            <div className="panel-surface rounded-[28px] border border-white/8 p-5 shadow-soft animate-fade-up">
              <div className="text-xs uppercase tracking-[0.22em] text-blue-200/80">Why this flow is minimal</div>
              <h3 className="mt-2 text-xl font-semibold text-ink">No detours, no simulation step</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Review the recommendations, accept the fixes you want, export the bundle, and land back on the dashboard with the latest stats already saved.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-200">
                <UploadCloud size={16} />
                Upload checklist
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                <p>1. Choose a CSV file with headers.</p>
                <p>2. Pick the target column that the auditors should protect.</p>
                <p>3. Mark protected attributes so the report explains fairness-sensitive fields clearly.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => scrollToSection(uploadRef)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-blue-500 px-5 text-sm font-semibold text-white transition hover:bg-blue-400"
            >
              Next: upload a dataset
              <ArrowRight size={16} />
            </button>
          </aside>
        </section>

        <section ref={uploadRef} id="upload" className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <label
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              handleFile(event.dataTransfer.files?.[0]);
            }}
            className={`flex min-h-[420px] cursor-pointer flex-col items-center justify-center rounded-[32px] border border-dashed p-8 text-center shadow-soft shadow-blue-950/20 transition ${
              dragging ? "border-blue-400 bg-blue-400/10" : "border-white/12 bg-white/[0.03] hover:border-blue-400/50 hover:bg-white/[0.05]"
            }`}
          >
            <input className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => handleFile(event.target.files?.[0])} />
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-400/10 text-blue-200">
              <UploadCloud size={30} />
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight text-ink">Drop your CSV here</h2>
            <p className="mt-2 max-w-md text-sm leading-7 text-slate-400">or click to browse. The wizard reads the header row first so you can set the target and protected attributes before the audit starts.</p>
            {file ? (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-sm font-semibold text-blue-100">
                <Database size={16} />
                {file.name}
              </div>
            ) : null}
          </label>

          <div className="panel-surface rounded-[32px] border border-white/8 p-6 shadow-soft shadow-blue-950/20">
            <div className="flex flex-col gap-5">
              <div>
                <label className="text-sm font-semibold text-ink" htmlFor="target-column">
                  Target column
                </label>
                <select
                  id="target-column"
                  value={targetColumn}
                  onChange={(event) => setTargetColumn(event.target.value)}
                  disabled={!headers.length}
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-900 disabled:text-slate-500"
                >
                  {!headers.length ? <option>Upload a CSV first</option> : null}
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-sm font-semibold text-ink">Protected attributes</div>
                <div className="mt-3 grid max-h-64 gap-2 overflow-auto rounded-3xl border border-white/8 bg-slate-950/50 p-3">
                  {!protectedOptions.length ? (
                    <p className="text-sm text-slate-500">Upload a CSV to select protected attributes.</p>
                  ) : (
                    protectedOptions.map((column) => (
                      <label key={column} className="flex items-center gap-3 rounded-2xl px-3 py-2 transition hover:bg-white/[0.04]">
                        <input
                          type="checkbox"
                          checked={protectedAttributes.includes(column)}
                          onChange={() => toggleProtected(column)}
                          className="h-4 w-4 accent-blue-400"
                        />
                        <span className="text-sm font-medium text-slate-200">{column}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="grid gap-3 rounded-3xl border border-blue-400/15 bg-blue-400/8 p-4 text-sm leading-7 text-slate-300">
                <p className="font-semibold text-blue-100">What happens next</p>
                <p>The backend creates a job, runs the auditors, and lands you on the progress view. After that, you can review the report, accept fixes, and export only the accepted changes.</p>
              </div>

              {error ? <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200">{error}</div> : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => scrollToSection(dashboardRef)}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-slate-200 transition hover:border-blue-400/40 hover:bg-blue-400/10"
                >
                  <ArrowLeft size={16} />
                  Back to dashboard
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading || !file}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-blue-500 px-5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  Next: start audit
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
