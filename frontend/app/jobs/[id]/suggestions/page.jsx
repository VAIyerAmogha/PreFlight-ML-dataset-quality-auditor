"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Filter, CheckSquare, Square } from "lucide-react";
import { useWorkspace } from "../../../../components/workspace/WorkspaceProvider";
import { Card, CardContent, CardHeader } from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import SuggestionCard from "../../../../components/workspace/SuggestionCard";
import { normalizeSeverity, scoreLabelFromValue } from "../../../../lib/workspace";

export default function SuggestionsPage() {
  const router = useRouter();
  const { report, suggestions, acceptedSuggestionIds, setAcceptedSuggestionIds } = useWorkspace();
  const [severityFilter, setSeverityFilter] = useState("all");

  const acceptedSet = useMemo(() => new Set(acceptedSuggestionIds), [acceptedSuggestionIds]);
  const filteredSuggestions = useMemo(() => {
    if (severityFilter === "all") return suggestions;
    return suggestions.filter((suggestion) => normalizeSeverity(suggestion.severity) === severityFilter);
  }, [severityFilter, suggestions]);

  function toggleSuggestion(id) {
    setAcceptedSuggestionIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function acceptAll() {
    setAcceptedSuggestionIds(filteredSuggestions.map((item) => item.id));
  }

  function rejectAll() {
    setAcceptedSuggestionIds([]);
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">AI Preprocessing Recommendations</div>
              <h2 className="text-lg font-semibold text-slate-100">Dataset remediation copilot</h2>
            </div>
            <Badge variant="info">{suggestions.length} suggestions</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={acceptAll}><CheckSquare className="h-4 w-4" />Accept All</Button>
              <Button variant="outline" size="sm" onClick={rejectAll}><Square className="h-4 w-4" />Reject All</Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Filter className="h-4 w-4" />
              {[
                ["all", "All"],
                ["critical", "Critical"],
                ["warning", "Warning"],
                ["info", "Info"]
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSeverityFilter(key)}
                  className={`rounded-full border px-3 py-1.5 transition-all duration-200 ${severityFilter === key ? "border-slate-600 bg-slate-800 text-slate-100" : "border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between text-sm text-slate-400">
            <span>{acceptedSuggestionIds.length} accepted</span>
            <span>{scoreLabelFromValue(report?.score)} dataset score context</span>
          </div>

          <div className="mt-5 grid gap-4">
            {filteredSuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                accepted={acceptedSet.has(suggestion.id)}
                onToggle={toggleSuggestion}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => router.push(`/jobs/${report?.job_id}/findings`)}>
          <ArrowLeft className="h-4 w-4" />
          Back to Findings
        </Button>
        {acceptedSuggestionIds.length ? (
          <Button onClick={() => router.push(`/jobs/${report?.job_id}/simulation`)}>
            Proceed to Simulation
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
