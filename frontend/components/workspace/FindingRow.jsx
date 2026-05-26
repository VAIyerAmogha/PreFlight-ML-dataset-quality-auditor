"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import SeverityBadge from "../ui/SeverityBadge";
import { Badge } from "../ui/badge";
import { cnSeverity, normalizeSeverity } from "../../lib/workspace";

export default function FindingRow({ finding }) {
  const [open, setOpen] = useState(false);
  const normalized = normalizeSeverity(finding.severity);
  const tones = cnSeverity(normalized);

  return (
    <div className={`rounded-2xl border px-4 py-4 transition-all duration-200 ${tones.border} ${tones.bg}`}>
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-start justify-between gap-4 text-left">
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={normalized} />
            {(finding.affected_columns || []).map((column) => <Badge key={column} variant="subtle" className="font-mono">{column}</Badge>)}
          </div>
          <div className="text-base font-semibold text-slate-100">{finding.message}</div>
          <p className="max-w-4xl text-sm leading-7 text-slate-300">{finding.message}</p>
        </div>
        <div className="mt-1 text-slate-400">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div>
      </button>

      {open ? (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
          <div className="grid gap-2 md:grid-cols-2">
            <div><span className="text-slate-500">Issue type:</span> {finding.issue_type}</div>
            <div><span className="text-slate-500">Severity:</span> {normalized}</div>
          </div>
          {finding.metadata && Object.keys(finding.metadata).length ? (
            <pre className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-200">{JSON.stringify(finding.metadata, null, 2)}</pre>
          ) : (
            <div className="mt-4 text-slate-500">No additional metadata.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
