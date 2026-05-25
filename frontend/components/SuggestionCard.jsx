"use client";

import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { useState } from "react";
import FindingsBadge from "./FindingsBadge";

export default function SuggestionCard({ suggestion, accepted, onToggle }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <FindingsBadge severity={suggestion.severity} />
            {(suggestion.affected_columns || []).map((column) => (
              <span key={column} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {column}
              </span>
            ))}
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">{suggestion.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{suggestion.explanation}</p>
          </div>
          {suggestion.expected_impact ? (
            <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              {suggestion.expected_impact}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onToggle(suggestion.id)}
          className={`inline-flex h-10 min-w-28 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold transition ${
            accepted ? "bg-fern text-white hover:bg-[#285f43]" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {accepted ? <Check size={16} /> : <X size={16} />}
          {accepted ? "Accept" : "Reject"}
        </button>
      </div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        Code
      </button>
      {open ? (
        <pre className="mt-3 overflow-x-auto rounded-md bg-slate-950 p-4 text-sm leading-6 text-slate-100">
          <code>{suggestion.code || "# No code provided"}</code>
        </pre>
      ) : null}
    </article>
  );
}
