"use client";

import Link from "next/link";
import { Check, Lock, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";
import { STAGE_ORDER } from "../../lib/workspace";

const STAGE_LABELS = {
  overview: "Overview",
  findings: "Findings",
  suggestions: "Suggestions",
  simulation: "Simulation",
  export: "Export"
};

export default function Sidebar({ jobId, activeStage, completedStages = [], lockedStages = [] }) {
  return (
    <aside className="fixed left-0 top-0 h-full w-56 border-r border-slate-800 bg-slate-950/95 px-4 py-5">
      <div className="flex h-full flex-col gap-6">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.26em] text-slate-500">Workspace</div>
          <div className="mt-2 text-xl font-semibold tracking-tight text-slate-100">PreFlightML</div>
          <div className="mt-1 text-xs text-slate-500">Job {jobId.slice(0, 8)}</div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {STAGE_ORDER.map((stage, index) => {
            const active = stage === activeStage;
            const completed = completedStages.includes(stage);
            const locked = lockedStages.includes(stage);
            const href = `/jobs/${jobId}/${stage}`;

            return (
              <Link
                key={stage}
                href={href}
                className={cn(
                  "group flex items-center justify-between rounded-xl border px-3 py-3 text-sm transition-all duration-200",
                  active
                    ? "border-slate-700 bg-slate-800 text-slate-100"
                    : completed
                      ? "border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-700"
                      : "border-transparent bg-transparent text-slate-500 hover:border-slate-800 hover:bg-slate-900/70",
                  locked ? "opacity-60" : ""
                )}
                aria-disabled={locked}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[11px] text-slate-300">
                    {completed ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span className="truncate font-medium">{STAGE_LABELS[stage]}</span>
                </span>
                {locked ? <Lock className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className={cn("h-3.5 w-3.5 transition-opacity", active ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />}
              </Link>
            );
          })}
        </nav>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-xs leading-6 text-slate-400">
          Linear workflow with backward navigation always enabled.
        </div>
      </div>
    </aside>
  );
}
