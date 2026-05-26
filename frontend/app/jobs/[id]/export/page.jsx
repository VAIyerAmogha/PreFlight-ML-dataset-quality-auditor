"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, FileJson2, FileSpreadsheet, FileCode2, CheckCircle2 } from "lucide-react";
import { useWorkspace } from "../../../../components/workspace/WorkspaceProvider";
import { Card, CardContent, CardHeader } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import { exportJob, downloadBlob } from "../../../../lib/api";
import { markExportCompleted } from "../../../../lib/audit-history";
import { formatTimestamp } from "../../../../lib/workspace";

export default function ExportPage() {
  const router = useRouter();
  const { report, suggestions, acceptedSuggestionIds, jobContext } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloaded, setDownloaded] = useState(false);

  const acceptedSuggestions = useMemo(
    () => suggestions.filter((suggestion) => acceptedSuggestionIds.includes(suggestion.id)),
    [acceptedSuggestionIds, suggestions]
  );

  async function handleDownload() {
    setLoading(true);
    setError("");
    try {
      const blob = await exportJob(report.job_id, acceptedSuggestionIds, jobContext?.targetColumn || undefined);
      downloadBlob(blob, `preflight-${report.job_id}.zip`);
      markExportCompleted(report.job_id, new Date().toISOString(), acceptedSuggestionIds);
      setDownloaded(true);
    } catch (nextError) {
      setError(nextError.message || "Export failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Export Bundle</div>
              <h2 className="text-lg font-semibold text-slate-100">Reproducible preprocessing package</h2>
            </div>
            <Badge variant="healthy">{acceptedSuggestions.length} applied</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-3">
              {[
                { name: "cleaned_dataset.csv", icon: FileSpreadsheet, helper: `${jobContext?.rowCount || 0} rows · ${jobContext?.columnCount || 0} columns` },
                { name: "preprocessing_pipeline.py", icon: FileCode2, helper: `${acceptedSuggestions.length} pipeline steps` },
                { name: "audit_report.json", icon: FileJson2, helper: `${report?.findings?.length || 0} findings recorded` }
              ].map((artifact) => (
                <div key={artifact.name} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <artifact.icon className="h-5 w-5 text-slate-300" />
                    <div>
                      <div className="text-sm font-medium text-slate-100">{artifact.name}</div>
                      <div className="text-xs text-slate-500">{artifact.helper}</div>
                    </div>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                </div>
              ))}
            </div>

            <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Metadata</div>
              <div className="grid gap-3 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3"><span className="text-slate-500">Job ID</span><span className="font-mono text-xs text-slate-100">{report?.job_id}</span></div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3"><span className="text-slate-500">Exported at</span><span>{downloaded ? formatTimestamp(new Date().toISOString()) : "Pending"}</span></div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3"><span className="text-slate-500">Platform version</span><span>PreFlightML</span></div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3"><span className="text-slate-500">Suggestion count</span><span>{acceptedSuggestions.length}</span></div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-7 text-slate-300">
                This bundle contains everything needed to reproduce the preprocessing run.
              </div>
            </div>
          </div>

          {error ? <div className="mt-4 rounded-2xl border border-red-900/80 bg-red-950/40 p-4 text-sm text-red-200">{error}</div> : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => router.push(`/jobs/${report?.job_id}/simulation`)}>
          <ArrowLeft className="h-4 w-4" />
          Back to Simulation
        </Button>
        <Button onClick={handleDownload} disabled={loading} className="bg-white text-slate-950 hover:bg-slate-200">
          <Download className="h-4 w-4" />
          Download Export Bundle
        </Button>
      </div>
    </div>
  );
}
