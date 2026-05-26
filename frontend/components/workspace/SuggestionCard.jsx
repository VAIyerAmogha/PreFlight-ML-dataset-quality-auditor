"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Check, X } from "lucide-react";
import SeverityBadge from "../ui/SeverityBadge";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import CodeBlock from "../ui/CodeBlock";
import { cn } from "../../lib/cn";

export default function SuggestionCard({ suggestion, accepted, onToggle }) {
  const [open, setOpen] = useState(false);

  return (
    <article className={cn(
      "rounded-3xl border bg-slate-900/80 p-5 shadow-[0_1px_0_rgba(255,255,255,0.02)] transition-all duration-200",
      accepted ? "border-emerald-500/30 bg-emerald-950/20" : "border-slate-800",
      !accepted ? "opacity-90 hover:border-slate-700" : ""
    )}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={suggestion.severity} />
            {(suggestion.affected_columns || []).map((column) => <Badge key={column} variant="subtle" className="font-mono">{column}</Badge>)}
          </div>
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-100">{suggestion.title}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">{suggestion.explanation}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-sm leading-6 text-slate-300">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Expected impact</div>
            <div className="mt-1">{suggestion.expected_impact}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 xl:flex-col xl:items-end">
          <Button variant={accepted ? "default" : "outline"} size="sm" onClick={() => onToggle(suggestion.id)} className={accepted ? "bg-white text-slate-950 hover:bg-slate-200" : "border-slate-700 bg-slate-950"}>
            <Check className="h-4 w-4" />
            Accept
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onToggle(suggestion.id)}>
            <X className="h-4 w-4" />
            Reject
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="mt-5 inline-flex h-9 items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 text-sm font-medium text-slate-200 transition-all duration-200 hover:border-slate-700 hover:bg-slate-900"
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Python code
      </button>

      {open ? <div className="mt-4"><CodeBlock code={suggestion.code} /></div> : null}
    </article>
  );
}
