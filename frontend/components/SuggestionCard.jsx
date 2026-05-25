"use client";

import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { useState } from "react";
import FindingsBadge from "./FindingsBadge";

export default function SuggestionCard({ suggestion, accepted, onToggle }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5 shadow-soft shadow-blue-950/20 backdrop-blur animate-fade-up">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <FindingsBadge severity={suggestion.severity} />
            {(suggestion.affected_columns || []).map((column) => (
              <span key={column} className="rounded-full border border-white/8 bg-slate-900/60 px-2.5 py-1 text-xs font-semibold text-slate-300">
                {column}
              </span>
            ))}
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-ink">{suggestion.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{suggestion.explanation}</p>
          </div>
          {suggestion.expected_impact ? (
            <div className="rounded-2xl border border-blue-400/15 bg-blue-400/10 px-3 py-2 text-sm font-medium text-blue-100">
              {suggestion.expected_impact}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onToggle(suggestion.id)}
          className={`inline-flex h-10 min-w-28 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold transition ${
            accepted ? "bg-blue-500 text-white hover:bg-blue-400" : "border border-white/10 bg-white/5 text-slate-300 hover:border-blue-400/40 hover:bg-blue-400/10 hover:text-blue-100"
          }`}
        >
          {accepted ? <Check size={16} /> : <X size={16} />}
          {accepted ? "Accept" : "Reject"}
        </button>
      </div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-full border border-white/10 px-3 text-sm font-semibold text-slate-200 transition hover:border-blue-400/40 hover:bg-blue-400/10"
      >
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        Code
      </button>
      {open ? (
        <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/8 bg-[#030712] p-4 text-sm leading-6 text-slate-100">
          <code>{suggestion.code || "# No code provided"}</code>
        </pre>
      ) : null}
    </article>
  );
}
