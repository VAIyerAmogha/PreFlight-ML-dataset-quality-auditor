"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, X } from "lucide-react";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { parseCsvPreview, inferTaskType } from "../../lib/workspace";
import { uploadDataset, saveJobContext } from "../../lib/api";
import { buildAuditRecord, upsertAuditRecord } from "../../lib/audit-history";

function buildPreview(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.readAsText(file.slice(0, 96 * 1024));
  });
}

export default function UploadModal({ onClose }) {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [columnCount, setColumnCount] = useState(0);
  const [targetColumn, setTargetColumn] = useState("");
  const [sampleRows, setSampleRows] = useState([]);

  const sizeLabel = useMemo(() => (file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "CSV only"), [file]);

  async function handleFile(nextFile) {
    setError("");
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      setError("Only CSV files are supported.");
      return;
    }
    if (nextFile.size > 25 * 1024 * 1024) {
      setError("File size exceeds 25 MB.");
      return;
    }

    setFile(nextFile);
    const preview = await buildPreview(nextFile);
    const parsed = parseCsvPreview(preview);
    setHeaders(parsed.headers);
    setRowCount(parsed.rowCount);
    setColumnCount(parsed.columnCount);
    setTargetColumn(parsed.headers[parsed.headers.length - 1] || "");
    setSampleRows(parsed.sampleRows);
  }

  async function handleSubmit() {
    if (!file) {
      setError("Choose a CSV before running the audit.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const context = {
        filename: file.name,
        rowCount,
        columnCount,
        targetColumn,
        taskType: inferTaskType(headers, sampleRows),
        createdAt: new Date().toISOString()
      };
      const result = await uploadDataset({ file });
      saveJobContext(result.job_id, context);
      upsertAuditRecord(buildAuditRecord({ job: { job_id: result.job_id, filename: file.name, created_at: context.createdAt, status: "PENDING" }, context, suggestionCount: 0 }));
      onClose?.();
      router.push(`/jobs/${result.job_id}/overview`);
    } catch (nextError) {
      setError(nextError.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle>Start a new audit</DialogTitle>
        <DialogDescription>Upload a CSV, confirm the target column, and launch the auditor pipeline.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-5 px-6 py-5 lg:grid-cols-[1.05fr_0.95fr]">
        <label
          className={`flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed px-6 py-8 text-center transition-all duration-200 ${dragging ? "border-slate-500 bg-slate-800" : "border-slate-700 bg-slate-900 hover:bg-slate-800"}`}
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
        >
          <input className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => handleFile(event.target.files?.[0])} />
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-200">
            <UploadCloud className="h-7 w-7" />
          </div>
          <div className="mt-5 text-xl font-semibold text-slate-100">Drop your CSV here</div>
          <p className="mt-2 max-w-sm text-sm leading-7 text-slate-400">or click to browse. The first row is parsed locally so you can verify the target column before the audit starts.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
            <Badge variant={file ? "healthy" : "info"}>{sizeLabel}</Badge>
            <Badge variant="info">CSV only</Badge>
          </div>
          {file ? <div className="mt-4 text-sm text-slate-200">{file.name}</div> : null}
        </label>

        <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Target column</div>
            <select
              value={targetColumn}
              onChange={(event) => setTargetColumn(event.target.value)}
              disabled={!headers.length}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-slate-600 disabled:cursor-not-allowed disabled:text-slate-500"
            >
              {!headers.length ? <option>Upload a CSV first</option> : null}
              {headers.map((header) => <option key={header} value={header}>{header}</option>)}
            </select>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Parsed headers</div>
            <div className="mt-2 flex min-h-24 flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              {headers.length ? headers.map((header) => <Badge key={header} variant={header === targetColumn ? "healthy" : "subtle"} className="font-mono">{header}</Badge>) : <div className="text-sm text-slate-500">Header preview will appear here.</div>}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Rows</div><div className="mt-1 text-lg font-semibold text-slate-100">{rowCount}</div></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Columns</div><div className="mt-1 text-lg font-semibold text-slate-100">{columnCount}</div></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Task</div><div className="mt-1 text-lg font-semibold text-slate-100">{inferTaskType(headers, sampleRows)}</div></div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm leading-7 text-slate-300">
            The audit will create a job, run the concurrent auditors, and redirect you to the workspace.
          </div>

          {error ? <div className="rounded-2xl border border-red-900/80 bg-red-950/40 p-4 text-sm text-red-200">{error}</div> : null}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onClose?.()}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={uploading || !file} className="bg-white text-slate-950 hover:bg-slate-200">
          {uploading ? "Running audit…" : "Run Audit"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
