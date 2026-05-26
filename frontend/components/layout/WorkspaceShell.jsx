"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import WorkspaceHeader from "./WorkspaceHeader";
import { useWorkspace } from "../workspace/WorkspaceProvider";
import { STAGE_ORDER } from "../../lib/workspace";
import { Card } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

export default function WorkspaceShell({ children }) {
  const pathname = usePathname();
  const { jobId, job, report, jobContext, loading, error } = useWorkspace();

  const activeStage = useMemo(() => {
    return STAGE_ORDER.find((stage) => pathname?.includes(`/jobs/${jobId}/${stage}`)) || "overview";
  }, [jobId, pathname]);

  const completedStages = useMemo(() => {
    const stages = [];
    if (report) stages.push("overview", "findings", "suggestions", "simulation", "export");
    else if (job?.progress >= 80) stages.push("overview");
    return stages;
  }, [job, report]);

  const lockedStages = useMemo(() => {
    if (report) return [];
    if (job?.status?.toLowerCase() === "running" || job?.status?.toLowerCase() === "pending") return ["findings", "suggestions", "simulation", "export"];
    return [];
  }, [job, report]);

  const elapsedMs = useMemo(() => {
    const start = job?.started_at || job?.created_at;
    const end = job?.completed_at || (job?.status?.toLowerCase() === "completed" ? new Date().toISOString() : null);
    if (!start) return 0;
    const startDate = new Date(start).getTime();
    const endDate = end ? new Date(end).getTime() : Date.now();
    return Math.max(0, endDate - startDate);
  }, [job]);

  return (
    <div className="workspace-shell">
      <Sidebar jobId={jobId} activeStage={activeStage} completedStages={completedStages} lockedStages={lockedStages} />
      <div className="ml-56 min-h-screen">
        <WorkspaceHeader job={job} report={report} jobContext={jobContext} elapsedMs={elapsedMs} stageLabel={activeStage} />

        <main className="mx-auto w-full max-w-7xl px-6 py-8">
          {error ? (
            <Card className="border-red-900/80 bg-red-950/40 p-5 text-sm text-red-200">
              <div className="font-medium">Unable to load workspace</div>
              <div className="mt-1 text-red-200/80">{error}</div>
            </Card>
          ) : null}

          {loading && !job ? (
            <div className="grid gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
