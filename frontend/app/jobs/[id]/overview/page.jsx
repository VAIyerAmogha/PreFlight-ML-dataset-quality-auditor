"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "../../../../components/workspace/WorkspaceProvider";
import { Card, CardContent, CardHeader } from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { Progress } from "../../../../components/ui/progress";
import { ScrollArea } from "../../../../components/ui/scroll-area";
import { Skeleton } from "../../../../components/ui/skeleton";
import { formatTimestamp, formatDuration, scoreLabelFromValue } from "../../../../lib/workspace";
import { AlertCircle, CheckCircle2, Clock3, Loader2 } from "lucide-react";

function AuditorCard({ auditor }) {
  const status = String(auditor.status || "queued").toLowerCase();
  const icon = status === "completed" ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : status === "failed" ? <AlertCircle className="h-4 w-4 text-red-300" /> : status === "running" ? <Loader2 className="h-4 w-4 animate-spin text-slate-200" /> : <Clock3 className="h-4 w-4 text-slate-500" />;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition-all duration-200 hover:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-100">{auditor.auditor_name.replaceAll("_", " ")}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{status}</div>
        </div>
        {icon}
      </div>
      <div className="mt-4">
        <Progress value={auditor.progress ?? (status === "completed" ? 100 : status === "running" ? 55 : 0)} />
      </div>
      <div className="mt-3 text-xs text-slate-500">
        Execution time {auditor.execution_time ? formatDuration(Math.max(0, Math.round(Number(auditor.execution_time) * 1000))) : "pending"}
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const router = useRouter();
  const { job, report, jobContext, loading, error, activityLogs } = useWorkspace();

  useEffect(() => {
    if (report?.status === "COMPLETED") {
      router.prefetch(`/jobs/${job?.job_id}/findings`);
      const timer = setTimeout(() => router.replace(`/jobs/${job?.job_id}/findings`), 1200);
      return () => clearTimeout(timer);
    }
  }, [job?.job_id, report?.status, router]);

  if (loading && !job) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) return null;

  const auditorResults = report?.auditor_results || [];
  const progress = Number(job?.progress || 0);
  const remaining = Math.max(0, 100 - progress);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Dataset Identity</div>
          <h2 className="text-lg font-semibold text-slate-100">Live execution view</h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Dataset</div><div className="mt-1 text-sm text-slate-100">{jobContext?.filename || job?.filename}</div></div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Shape</div><div className="mt-1 text-sm text-slate-100">{jobContext?.rowCount || 0} × {jobContext?.columnCount || 0}</div></div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Target</div><div className="mt-1 text-sm text-slate-100">{jobContext?.targetColumn || "—"}</div></div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Task type</div><div className="mt-1 text-sm text-slate-100">{jobContext?.taskType || "Classification"}</div></div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-100">Analyzing Dataset Quality…</span>
                  <span className="text-slate-500">{progress.toFixed(0)}%</span>
                </div>
                <div className="mt-3"><Progress value={progress} /></div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>Estimated remaining time</span>
                  <span>{remaining ? `${remaining.toFixed(0)}% remaining` : "Finalizing report"}</span>
                </div>
              </div>
            </div>

            <Card className="border-slate-800 bg-slate-950/70">
              <CardHeader>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">System Activity</div>
                <div className="text-lg font-semibold text-slate-100">Terminal-style log</div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px] rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-400">
                  <div className="flex flex-col gap-2">
                    {activityLogs.map((entry) => (
                      <div key={`${entry.time}-${entry.message}`} className="flex gap-3">
                        <span className="shrink-0 text-slate-500">{formatTimestamp(entry.time)}</span>
                        <span>{entry.message}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="mt-3 text-xs text-slate-500">Last update: {formatTimestamp(job?.completed_at || job?.started_at || job?.created_at)}</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Auditor Pipeline</div>
              <h2 className="text-lg font-semibold text-slate-100">Seven concurrent checks</h2>
            </div>
            <Badge variant="info">{report?.status === "COMPLETED" ? scoreLabelFromValue(report?.score) : "Running"}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {auditorResults.map((auditor) => (
              <AuditorCard key={auditor.auditor_name} auditor={auditor} />
            ))}
            {!auditorResults.length ? Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-36 w-full" />) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
