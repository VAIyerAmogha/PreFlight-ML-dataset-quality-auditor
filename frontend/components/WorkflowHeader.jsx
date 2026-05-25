"use client";

import Link from "next/link";
import { ChevronRight, Home, UploadCloud } from "lucide-react";

export default function WorkflowHeader({
  eyebrow,
  title,
  description,
  steps = [],
  activeStep = 0,
  jobId = "",
}) {
  return (
    <header className="panel-surface rounded-[28px] border border-white/8 px-5 py-5 shadow-soft shadow-blue-950/20 md:px-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">{eyebrow}</p>
          <div className="max-w-3xl space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-5xl">{title}</h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-300 md:text-base">{description}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:min-w-[240px] md:items-end">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">
            <Home size={14} />
            Dashboard ready
          </div>
          <div className="flex flex-wrap justify-end gap-2 text-xs text-slate-400">
            <Link className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 transition hover:border-blue-400/40 hover:text-blue-200" href="/">
              <Home size={13} />
              Home
            </Link>
            <Link className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 transition hover:border-blue-400/40 hover:text-blue-200" href="/#upload">
              <UploadCloud size={13} />
              Upload
            </Link>
            {jobId ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-blue-200">
                Job <span className="font-semibold">{jobId.slice(0, 8)}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {steps.length ? (
        <div className="mt-6 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          {steps.map((step, index) => {
            const active = index === activeStep;
            const complete = index < activeStep;
            return (
              <div
                key={step}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                  active
                    ? "border-blue-400/45 bg-blue-400/10 text-blue-100 shadow-glow"
                    : complete
                    ? "border-blue-400/18 bg-white/6 text-slate-200"
                    : "border-white/8 bg-white/[0.03] text-slate-400"
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-blue-400 text-slate-950" : "bg-white/10 text-slate-200"}`}>
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{step}</div>
                </div>
                {active ? <ChevronRight size={15} className="ml-auto text-blue-300" /> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </header>
  );
}