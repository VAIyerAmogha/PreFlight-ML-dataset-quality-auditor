export function ScoreGauge({ score = 0, label = "Pending" }) {
  const safe = Math.max(0, Math.min(100, Number(score) || 0));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safe / 100) * circumference;

  const ringColor = safe >= 85 ? "#10b981" : safe >= 70 ? "#f59e0b" : safe >= 50 ? "#64748b" : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-44 w-44">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-label={`Overall score ${safe}`}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeLinecap="round"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-5xl font-semibold tracking-tight text-slate-100">{safe.toFixed(0)}</div>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-500">/ 100</div>
        </div>
      </div>
      <div className="rounded-full border border-slate-800 bg-slate-900 px-4 py-1.5 text-sm font-medium text-slate-200">{label}</div>
    </div>
  );
}
