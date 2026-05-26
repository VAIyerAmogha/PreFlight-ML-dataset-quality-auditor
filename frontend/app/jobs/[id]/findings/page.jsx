"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useWorkspace } from "../../../../components/workspace/WorkspaceProvider";
import { Card, CardContent, CardHeader } from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Progress } from "../../../../components/ui/progress";
import { ScrollArea } from "../../../../components/ui/scroll-area";
import { scoreLabelFromValue, groupFindingsBySeverity, normalizeSeverity } from "../../../../lib/workspace";
import { AuditorBreakdownChart } from "../../../../components/workspace/AuditorBreakdownChart";
import { ScoreGauge } from "../../../../components/workspace/ScoreGauge";
import { FindingsList } from "../../../../components/workspace/FindingsList";

export default function FindingsPage() {
  const router = useRouter();
  const { report } = useWorkspace();

  const grouped = useMemo(() => groupFindingsBySeverity(report?.findings || []), [report]);
  const score = Number(report?.score || 0);

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
            <ScoreGauge score={score} label={scoreLabelFromValue(score)} />
            <div className="max-w-sm text-center text-sm leading-7 text-slate-400">
              {score >= 85
                ? "The dataset is in strong shape with minimal operational risk and a healthy remediation posture."
                : score >= 70
                  ? "The dataset is broadly usable, but a few issues still warrant targeted remediation before downstream modeling."
                  : score >= 50
                    ? "There are meaningful quality concerns that should be addressed before this dataset reaches production workflows."
                    : "The dataset has high risk and should be remediated before any downstream modeling or export."}
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="border-slate-800 bg-slate-950/70">
              <CardHeader>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Auditor Breakdown</div>
                <h2 className="text-lg font-semibold text-slate-100">Score contribution by auditor</h2>
              </CardHeader>
              <CardContent>
                <AuditorBreakdownChart breakdown={report?.score_breakdown || []} />
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-950/70">
              <CardHeader>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Interpretation</div>
                <h2 className="text-lg font-semibold text-slate-100">Plain-English summary</h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-slate-300">
                  {report?.interpretation_label || scoreLabelFromValue(score)} audit signals were consolidated into one score so teams can prioritize what matters most first.
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Findings</div>
              <h2 className="text-lg font-semibold text-slate-100">Incident-style alerts</h2>
            </div>
            <Badge variant="info">{(report?.findings || []).length} total findings</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <FindingsList groups={grouped} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => router.push(`/jobs/${report?.job_id}/overview`)}>
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </Button>
        <Button onClick={() => router.push(`/jobs/${report?.job_id}/suggestions`)}>
          Continue to Suggestions
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
