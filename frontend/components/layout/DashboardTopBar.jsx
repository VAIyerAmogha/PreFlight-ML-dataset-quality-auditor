import { Sparkles } from "lucide-react";
import { Button } from "../ui/button";

export default function DashboardTopBar({ onStartNewAudit }) {
  return (
    <header className="flex flex-col gap-5 border-b border-slate-800 pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-sm font-medium tracking-[0.22em] text-slate-500 uppercase">
          <Sparkles className="h-4 w-4 text-slate-400" />
          PreFlightML
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl">Continuous ML dataset governance</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">Monitor dataset health, inspect critical findings, and launch a new audit from a single operational dashboard.</p>
        </div>
      </div>
      <Button onClick={onStartNewAudit} size="lg" className="w-full bg-white text-slate-950 hover:bg-slate-200 lg:w-auto">
        Start New Audit
      </Button>
    </header>
  );
}
