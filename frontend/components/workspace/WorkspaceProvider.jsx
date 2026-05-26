"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getJob, getReport, getSuggestions, loadJobContext, saveLatestReport } from "../../lib/api";
import { buildActivityLogs } from "../../lib/workspace";
import { buildAuditRecord, upsertAuditRecord } from "../../lib/audit-history";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ jobId, children }) {
  const [job, setJob] = useState(null);
  const [report, setReport] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [acceptedSuggestionIds, setAcceptedSuggestionIds] = useState([]);
  const [jobContext, setJobContextState] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const fetchedReportRef = useRef(false);
  const fetchedSuggestionsRef = useRef(false);

  useEffect(() => {
    setJobContextState(loadJobContext(jobId));
    fetchedReportRef.current = false;
    fetchedSuggestionsRef.current = false;
    setJob(null);
    setReport(null);
    setSuggestions([]);
    setAcceptedSuggestionIds([]);
    setError("");
    setLoading(true);
  }, [jobId]);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const nextJob = await getJob(jobId);
        if (!active) return;
        setJob(nextJob);
        setLastUpdatedAt(new Date().toISOString());
        setError("");

        const isReady = Boolean(nextJob?.report_ready) || String(nextJob?.status || "").toLowerCase() === "completed";
        if (isReady && !fetchedReportRef.current) {
          fetchedReportRef.current = true;
          const nextReport = await getReport(jobId);
          if (!active) return;
          setReport(nextReport);
          saveLatestReport(nextReport);
          upsertAuditRecord(buildAuditRecord({ job: nextJob, report: nextReport, context: loadJobContext(jobId), suggestionCount: suggestions.length }));
        }
      } catch (nextError) {
        if (active) setError(nextError.message || "Unable to load workspace.");
      } finally {
        if (active) setLoading(false);
      }
    }

    poll();
    const interval = setInterval(poll, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [jobId, suggestions.length]);

  useEffect(() => {
    let active = true;

    async function fetchSuggestions() {
      if (!report || fetchedSuggestionsRef.current) return;
      try {
        const nextSuggestions = await getSuggestions(jobId);
        if (!active) return;
        const list = Array.isArray(nextSuggestions) ? nextSuggestions : nextSuggestions?.suggestions || [];
        setSuggestions(list);
        setAcceptedSuggestionIds((current) => (current.length ? current : list.map((item) => item.id)));
        fetchedSuggestionsRef.current = true;
      } catch {
        if (active) setSuggestions([]);
      }
    }

    fetchSuggestions();
    return () => {
      active = false;
    };
  }, [jobId, report]);

  useEffect(() => {
    if (!jobId || !jobContext) return;
    const nextContext = { ...jobContext, acceptedIds: acceptedSuggestionIds };
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(`preflight:${jobId}:context`, JSON.stringify(nextContext));
    }
  }, [acceptedSuggestionIds, jobContext, jobId]);

  const value = useMemo(
    () => ({
      jobId,
      job,
      report,
      suggestions,
      acceptedSuggestionIds,
      setAcceptedSuggestionIds,
      jobContext,
      setJobContextState,
      loading,
      error,
      lastUpdatedAt,
      activityLogs: buildActivityLogs(job, report),
      refresh: async () => {
        setLoading(true);
        fetchedReportRef.current = false;
        fetchedSuggestionsRef.current = false;
        const nextJob = await getJob(jobId);
        setJob(nextJob);
        if (nextJob.report_ready || String(nextJob.status || "").toLowerCase() === "completed") {
          const nextReport = await getReport(jobId);
          setReport(nextReport);
          saveLatestReport(nextReport);
        }
        setLoading(false);
      }
    }),
    [acceptedSuggestionIds, error, job, jobContext, jobId, lastUpdatedAt, loading, report, suggestions]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}
