const AUDIT_HISTORY_KEY = "preflight:audit-history";

function readJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadAuditHistory() {
  return readJson(AUDIT_HISTORY_KEY, []);
}

export function saveAuditHistory(history) {
  writeJson(AUDIT_HISTORY_KEY, history);
}

export function upsertAuditRecord(record) {
  if (!record?.jobId) return record;
  const history = loadAuditHistory();
  const next = [record, ...history.filter((item) => item.jobId !== record.jobId)]
    .sort((left, right) => new Date(right.completedAt || right.createdAt || 0) - new Date(left.completedAt || left.createdAt || 0))
    .slice(0, 50);
  saveAuditHistory(next);
  return record;
}

export function buildAuditRecord({ job, report, context = {}, suggestionCount = 0, acceptedSuggestionIds = [], exportedAt = null }) {
  const findings = Array.isArray(report?.findings) ? report.findings : [];
  const severityCounts = findings.reduce(
    (accumulator, finding) => {
      const severity = String(finding?.severity || "info").toLowerCase();
      if (severity === "critical") accumulator.critical += 1;
      else if (severity === "warning") accumulator.warning += 1;
      else accumulator.info += 1;
      return accumulator;
    },
    { critical: 0, warning: 0, info: 0 }
  );

  return {
    jobId: job?.job_id || report?.job_id || context.jobId || "",
    filename: report?.filename || job?.filename || context.filename || "Untitled dataset",
    score: Number(report?.score ?? context.score ?? 0),
    status: String(job?.status || report?.status || "PENDING"),
    createdAt: job?.created_at || report?.created_at || context.createdAt || new Date().toISOString(),
    startedAt: job?.started_at || report?.started_at || context.startedAt || null,
    completedAt: job?.completed_at || report?.completed_at || context.completedAt || null,
    exportedAt,
    rowCount: Number(context.rowCount || 0),
    columnCount: Number(context.columnCount || 0),
    targetColumn: context.targetColumn || null,
    taskType: context.taskType || "Classification",
    suggestionCount,
    acceptedSuggestionIds,
    findingsCount: findings.length,
    criticalFindings: severityCounts.critical,
    warningFindings: severityCounts.warning,
    infoFindings: severityCounts.info,
    interpretationLabel: report?.interpretation_label || context.interpretationLabel || "Pending",
    report
  };
}

export function markExportCompleted(jobId, exportedAt, acceptedSuggestionIds = []) {
  const history = loadAuditHistory();
  const next = history.map((record) =>
    record.jobId === jobId ? { ...record, exportedAt, acceptedSuggestionIds } : record
  );
  saveAuditHistory(next);
}

export function getAuditRecord(jobId) {
  return loadAuditHistory().find((record) => record.jobId === jobId) || null;
}
