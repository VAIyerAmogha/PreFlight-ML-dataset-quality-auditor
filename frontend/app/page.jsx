"use client";

import { Database, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { saveJobContext, uploadDataset } from "../lib/api";

function parseCsvHeaders(text) {
  const firstLine = text.split(/\r?\n/)[0] || "";
  return firstLine
    .split(",")
    .map((header) => header.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [targetColumn, setTargetColumn] = useState("");
  const [protectedAttributes, setProtectedAttributes] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const protectedOptions = useMemo(() => headers.filter((header) => header !== targetColumn), [headers, targetColumn]);

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
    <main className="min-h-screen bg-[#f4f7f1] px-5 py-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-normal text-fern">PreFlightML</p>
            <h1 className="mt-2 text-4xl font-bold tracking-normal text-ink md:text-5xl">Dataset quality audit</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Upload a CSV, identify the target column, and mark protected attributes before the auditors take off.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-fern shadow-sm">
            <ShieldCheck size={18} />
            Local API proxy active
          </div>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
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
            className={`flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-white p-8 text-center shadow-soft transition ${
              dragging ? "border-fern bg-emerald-50" : "border-slate-300 hover:border-fern"
            }`}
          >
            <input className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => handleFile(event.target.files?.[0])} />
            <UploadCloud size={54} className="text-fern" />
            <h2 className="mt-5 text-2xl font-bold text-ink">Drop your CSV here</h2>
            <p className="mt-2 text-sm text-slate-500">or click to browse from your machine</p>
            {file ? (
              <div className="mt-6 inline-flex items-center gap-2 rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                <Database size={16} />
                {file.name}
              </div>
            ) : null}
          </label>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
            <div className="space-y-5">
              <div>
                <label className="text-sm font-bold text-ink" htmlFor="target-column">
                  Target column
                </label>
                <select
                  id="target-column"
                  value={targetColumn}
                  onChange={(event) => setTargetColumn(event.target.value)}
                  disabled={!headers.length}
                  className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-ink outline-none focus:border-fern focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
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
                <div className="text-sm font-bold text-ink">Protected attributes</div>
                <div className="mt-3 grid max-h-56 gap-2 overflow-auto rounded-md border border-slate-200 p-3">
                  {!protectedOptions.length ? (
                    <p className="text-sm text-slate-500">Upload a CSV to select protected attributes.</p>
                  ) : (
                    protectedOptions.map((column) => (
                      <label key={column} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={protectedAttributes.includes(column)}
                          onChange={() => toggleProtected(column)}
                          className="h-4 w-4 accent-fern"
                        />
                        <span className="text-sm font-medium text-slate-700">{column}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div> : null}

              <button
                type="submit"
                disabled={loading || !file}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-fern px-5 text-sm font-bold text-white transition hover:bg-[#285f43] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                Start audit
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
