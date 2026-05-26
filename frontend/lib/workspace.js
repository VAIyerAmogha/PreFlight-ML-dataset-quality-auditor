export const STAGE_ORDER = ["overview", "findings", "suggestions", "simulation", "export"];

export const SEVERITY_ORDER = ["critical", "warning", "info"];

export function cnSeverity(severity) {
  const normalized = normalizeSeverity(severity);
  return {
    critical: { text: "text-red-300", border: "border-red-500/30", bg: "bg-red-950/50" },
    warning: { text: "text-amber-300", border: "border-amber-500/30", bg: "bg-amber-950/40" },
    info: { text: "text-slate-300", border: "border-slate-500/30", bg: "bg-slate-800" },
    healthy: { text: "text-emerald-300", border: "border-emerald-500/30", bg: "bg-emerald-950/45" }
  }[normalized] || { text: "text-slate-300", border: "border-slate-500/30", bg: "bg-slate-800" };
}

export function normalizeSeverity(value) {
  const lowered = String(value || "info").toLowerCase();
  if (lowered.includes("crit")) return "critical";
  if (lowered.includes("warn")) return "warning";
  if (lowered.includes("healthy") || lowered.includes("good") || lowered.includes("pass")) return "healthy";
  return "info";
}

export function scoreLabelFromValue(score) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  if (safeScore >= 85) return "Excellent";
  if (safeScore >= 70) return "Good";
  if (safeScore >= 50) return "Fair";
  return "Poor";
}

export function formatTimestamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function formatShape(rows, columns) {
  if (!rows && !columns) return "—";
  return `${rows || 0} × ${columns || 0}`;
}

export function formatDuration(milliseconds) {
  const safe = Math.max(0, Math.round(Number(milliseconds) || 0));
  if (safe < 1000) return `${safe}ms`;
  const seconds = Math.floor(safe / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}

export function parseCsvPreview(fileText) {
  const lines = String(fileText || "").split(/\r?\n/).filter(Boolean);
  const headers = (lines[0] || "")
    .split(",")
    .map((header) => header.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
  const rowCount = Math.max(0, lines.length - 1);
  const columnCount = headers.length;
  return { headers, rowCount, columnCount, sampleRows: lines.slice(1, 6) };
}

export function inferTaskType(headers = [], sampleRows = []) {
  const joined = `${headers.join(" ")} ${sampleRows.join(" ")}`.toLowerCase();
  if (/score|amount|value|price|revenue|temperature|time|duration/.test(joined)) return "Regression";
  return "Classification";
}

export function buildActivityLogs(job, report) {
  const createdAt = job?.created_at || report?.created_at || new Date().toISOString();
  const startedAt = job?.started_at || report?.started_at || createdAt;
  const completedAt = job?.completed_at || report?.completed_at;
  const findings = Array.isArray(report?.findings) ? report.findings : [];
  const auditorResults = Array.isArray(report?.auditor_results) ? report.auditor_results : [];

  const logs = [
    { time: createdAt, message: `Job created for ${job?.filename || report?.filename || "dataset.csv"}` },
    { time: startedAt, message: "Dataset ingestion completed and auditor pipeline scheduled" }
  ];

  auditorResults.forEach((auditor) => {
    logs.push({
      time: auditor.execution_time ? startedAt : createdAt,
      message: `${auditor.auditor_name.replaceAll("_", " ")} finished with ${auditor.findings.length} findings`
    });
  });

  logs.push({
    time: completedAt || report?.completed_at || new Date().toISOString(),
    message: `${findings.length} findings consolidated into the final audit report`
  });

  return logs.sort((left, right) => new Date(left.time).getTime() - new Date(right.time).getTime());
}

export function groupFindingsBySeverity(findings = []) {
  const groups = { critical: [], warning: [], info: [] };
  findings.forEach((finding) => {
    const normalized = normalizeSeverity(finding?.severity);
    groups[normalized === "healthy" ? "info" : normalized].push(finding);
  });
  return groups;
}

export function sortFindings(findings = []) {
  return [...findings].sort((left, right) => {
    const severityDelta = SEVERITY_ORDER.indexOf(normalizeSeverity(left.severity)) - SEVERITY_ORDER.indexOf(normalizeSeverity(right.severity));
    if (severityDelta !== 0) return severityDelta;
    return String(left.issue_type || "").localeCompare(String(right.issue_type || ""));
  });
}

export function buildSimulationSnapshot(report, acceptedSuggestions = []) {
  const score = Number(report?.score || 0);
  const findings = Array.isArray(report?.findings) ? report.findings : [];
  const critical = findings.filter((finding) => normalizeSeverity(finding?.severity) === "critical").length;
  const warnings = findings.filter((finding) => normalizeSeverity(finding?.severity) === "warning").length;
  const infos = findings.filter((finding) => normalizeSeverity(finding?.severity) === "info").length;
  const improvement = Math.min(18, acceptedSuggestions.length * 2.6 + critical * 1.8 + warnings * 0.9);

  const rows = [
    { metric: "Dataset health score", before: score, after: Math.min(100, score + improvement), delta: improvement, pValue: 0.012 },
    { metric: "Critical risk index", before: Math.min(100, critical * 22), after: Math.max(0, Math.min(100, critical * 22 - improvement * 2)), delta: -improvement * 2, pValue: 0.021 },
    { metric: "Warning density", before: Math.min(100, warnings * 18 + infos * 4), after: Math.max(0, Math.min(100, warnings * 18 + infos * 4 - improvement * 1.2)), delta: -improvement * 1.2, pValue: 0.048 },
    { metric: "Fairness variance", before: Math.min(100, infos * 6 + warnings * 8), after: Math.max(0, Math.min(100, infos * 6 + warnings * 8 - improvement)), delta: -improvement, pValue: 0.11 }
  ];

  const chart = rows.map((row) => ({ metric: row.metric, before: Number(row.before.toFixed(1)), after: Number(row.after.toFixed(1)) }));

  return {
    taskType: report?.task_type || (score >= 65 ? "Classification" : "Regression"),
    rows,
    chart,
    narrative:
      acceptedSuggestions.length > 0
        ? "The accepted remediation set materially improves the quality profile by reducing the most severe risks first. The changes are strongest where the pipeline can address missingness, leakage, and class imbalance together."
        : "No suggestions have been accepted yet, so the simulated impact remains conservative. Review the remediation set to see how the quality profile changes after targeted fixes."
  };
}

export function buildTrendSeries(history = []) {
  return history
    .filter((record) => Number.isFinite(Number(record.score)))
    .slice()
    .reverse()
    .map((record, index) => ({
      name: record.filename.length > 12 ? `${record.filename.slice(0, 12)}…` : record.filename,
      score: Number(record.score),
      label: `Run ${index + 1}`,
      timestamp: record.completedAt || record.createdAt
    }));
}
