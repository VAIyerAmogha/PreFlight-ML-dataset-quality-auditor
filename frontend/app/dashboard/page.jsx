"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardTopBar from "../../components/layout/DashboardTopBar";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Separator } from "../../components/ui/separator";
import { Dialog } from "../../components/ui/dialog";
import UploadModal from "../../components/dashboard/UploadModal";
import SummaryCard from "../../components/dashboard/SummaryCard";
import RecentAuditsTable from "../../components/dashboard/RecentAuditsTable";
import CriticalFindingsFeed from "../../components/dashboard/CriticalFindingsFeed";
import HealthTrendChart from "../../components/dashboard/HealthTrendChart";
import EmptyState from "../../components/ui/EmptyState";
import { loadAuditHistory } from "../../lib/audit-history";
import { buildTrendSeries, normalizeSeverity, scoreLabelFromValue } from "../../lib/workspace";

export default function DashboardPage() {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(loadAuditHistory());
    const onStorage = () => setHistory(loadAuditHistory());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const metrics = useMemo(() => {
    const totalAudits = history.length;
    const averageScore = totalAudits ? Math.round(history.reduce((sum, record) => sum + Number(record.score || 0), 0) / totalAudits) : 0;
    const criticalFindings = history.reduce((sum, record) => sum + Number(record.criticalFindings || 0), 0);
    const datasetsExported = history.filter((record) => Boolean(record.exportedAt)).length;
    return { totalAudits, averageScore, criticalFindings, datasetsExported };
  }, [history]);

  const trendSeries = useMemo(() => buildTrendSeries(history), [history]);
  const criticalFeed = useMemo(
    () =>
      history.flatMap((record) =>
        (record.report?.findings || [])
          .filter((finding) => normalizeSeverity(finding.severity) === "critical")
          .slice(0, 2)
          .map((finding) => ({ ...finding, jobId: record.jobId, filename: record.filename, timestamp: record.completedAt || record.createdAt }))
      ),
    [history]
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <DashboardTopBar onStartNewAudit={() => setOpen(true)} />

        {history.length ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Total Audits" value={metrics.totalAudits} helperText="Audits stored in this browser" />
              <SummaryCard label="Average Dataset Health Score" value={metrics.averageScore} helperText={scoreLabelFromValue(metrics.averageScore)} />
              <SummaryCard label="Critical Findings (last 7 days)" value={metrics.criticalFindings} helperText="Incident-level risks" />
              <SummaryCard label="Datasets Exported" value={metrics.datasetsExported} helperText="Reproducible bundles downloaded" />
            </section>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Recent Audits</div>
                    <h2 className="mt-1 text-lg font-semibold text-slate-100">Operational audit history</h2>
                  </div>
                  <Badge variant="info">{history.length} runs</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <RecentAuditsTable history={history} />
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <Card>
                <CardHeader>
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Critical Findings Feed</div>
                  <h2 className="text-lg font-semibold text-slate-100">Most recent incident-style alerts</h2>
                </CardHeader>
                <CardContent>
                  <CriticalFindingsFeed items={criticalFeed} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Dataset Health Trend</div>
                  <h2 className="text-lg font-semibold text-slate-100">Score over time</h2>
                </CardHeader>
                <CardContent>
                  <HealthTrendChart data={trendSeries} />
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <EmptyState
            title="Start your first audit"
            description="Upload a CSV to begin continuous dataset governance. PreFlightML will run the auditor pipeline, score the dataset, and package a reproducible remediation bundle."
            action={<Button onClick={() => setOpen(true)}>Start New Audit</Button>}
          />
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <UploadModal onClose={() => setOpen(false)} />
      </Dialog>
    </main>
  );
}
