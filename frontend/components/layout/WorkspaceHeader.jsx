"use client";

import { Clock3, Database, Rows3, Target, Sparkles } from "lucide-react";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Tooltip } from "../ui/tooltip";
import { formatDuration, formatShape, scoreLabelFromValue } from "../../lib/workspace";

export default function WorkspaceHeader({ job, report, jobContext, elapsedMs, stageLabel }) {
  const filename = jobContext?.filename || report?.filename || job?.filename || "Untitled dataset";
  const rows = jobContext?.rowCount || 0;
  const columns = jobContext?.columnCount || 0;
  const targetColumn = jobContext?.targetColumn || "—";
  const taskType = jobContext?.taskType || "Classification";
  const score = Number(report?.score ?? 0);
  const scoreLabel = scoreLabelFromValue(score);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
      <div className="px-6 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-slate-400" />
              {stageLabel}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-100">{filename}</h1>
              {report?.status ? <Badge variant="info" className="uppercase tracking-[0.16em]">{report.status}</Badge> : null}
              {report ? <Badge variant={score >= 85 ? "healthy" : score >= 70 ? "warning" : "critical"}>{scoreLabel}</Badge> : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500"><Rows3 className="h-3.5 w-3.5" />Shape</div>
              <div className="mt-1 text-sm font-medium text-slate-100">{formatShape(rows, columns)}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500"><Target className="h-3.5 w-3.5" />Target</div>
              <div className="mt-1 truncate text-sm font-medium text-slate-100">{targetColumn}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500"><Database className="h-3.5 w-3.5" />Task type</div>
              <div className="mt-1 text-sm font-medium text-slate-100">{taskType}</div>
            </div>
            <Tooltip content={elapsedMs ? `${formatDuration(elapsedMs)} elapsed` : "Waiting for job timestamps"}>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500"><Clock3 className="h-3.5 w-3.5" />Runtime</div>
                <div className="mt-1 text-sm font-medium text-slate-100">{elapsedMs ? formatDuration(elapsedMs) : "—"}</div>
              </div>
            </Tooltip>
          </div>
        </div>

        <Separator className="mt-4" />
      </div>
    </header>
  );
}
