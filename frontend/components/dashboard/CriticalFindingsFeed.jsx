"use client";

import Link from "next/link";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { formatTimestamp } from "../../lib/workspace";
import { normalizeSeverity } from "../../lib/workspace";

export default function CriticalFindingsFeed({ items = [] }) {
  if (!items.length) {
    return <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 p-6 text-sm text-slate-500">No critical findings recorded yet.</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {items.slice(0, 8).map((finding, index) => (
        <div key={`${finding.jobId}-${index}`} className="rounded-2xl border border-red-900/40 bg-red-950/30 p-4 transition-all duration-200 hover:border-red-800/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Badge variant="critical">{normalizeSeverity(finding.severity)}</Badge>
              <div className="text-sm font-medium text-slate-100">{finding.message}</div>
            </div>
            <Link className="text-xs text-slate-400 hover:text-slate-200" href={`/jobs/${finding.jobId}/findings`}>
              View
            </Link>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{finding.filename}</span>
            <Separator className="w-1.5 rotate-90 opacity-0" />
            <span>{formatTimestamp(finding.timestamp)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
