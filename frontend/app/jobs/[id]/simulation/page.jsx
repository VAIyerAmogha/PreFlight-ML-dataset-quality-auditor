"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useWorkspace } from "../../../../components/workspace/WorkspaceProvider";
import { Card, CardContent, CardHeader } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import { MetricsComparisonTable } from "../../../../components/workspace/MetricsComparisonTable";
import { SimulationChart } from "../../../../components/workspace/SimulationChart";
import { buildSimulationSnapshot } from "../../../../lib/workspace";

export default function SimulationPage() {
  const router = useRouter();
  const { report, suggestions, acceptedSuggestionIds } = useWorkspace();

  const acceptedSuggestions = useMemo(
    () => suggestions.filter((suggestion) => acceptedSuggestionIds.includes(suggestion.id)),
    [acceptedSuggestionIds, suggestions]
  );
  const snapshot = useMemo(() => buildSimulationSnapshot(report, acceptedSuggestions), [acceptedSuggestions, report]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Simulation</div>
              <h2 className="text-lg font-semibold text-slate-100">Evidence-driven remediation impact</h2>
            </div>
            <Badge variant="info">{acceptedSuggestions.length} accepted</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Task type</div><div className="mt-1 text-sm text-slate-100">{snapshot.taskType}</div></div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Accepted suggestions</div><div className="mt-1 text-sm text-slate-100">{acceptedSuggestions.length}</div></div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Narrative</div><div className="mt-1 text-sm text-slate-100">Scientific comparison</div></div>
            </div>

            <MetricsComparisonTable rows={snapshot.rows} />
            <SimulationChart data={snapshot.chart} />

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-sm leading-7 text-slate-300">
              {snapshot.narrative}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => router.push(`/jobs/${report?.job_id}/suggestions`)}>
          <ArrowLeft className="h-4 w-4" />
          Back to Suggestions
        </Button>
        <Button onClick={() => router.push(`/jobs/${report?.job_id}/export`)}>
          Proceed to Export
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
