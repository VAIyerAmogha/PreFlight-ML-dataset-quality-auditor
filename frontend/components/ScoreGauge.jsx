export default function ScoreGauge({ score = 0, label = "Pending" }) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (safeScore / 100) * circumference;
  const color = safeScore >= 85 ? "#4f8cff" : safeScore >= 70 ? "#60a5fa" : safeScore >= 50 ? "#7aa7ff" : "#93c5fd";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-44 w-44">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" role="img" aria-label={`Overall score ${safeScore}`}>
          <circle cx="60" cy="60" r="52" fill="none" stroke="#10223f" strokeWidth="12" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-5xl font-bold tracking-tight text-ink">{safeScore.toFixed(0)}</div>
          <div className="text-sm font-semibold text-slate-400">/ 100</div>
        </div>
      </div>
      <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-1.5 text-sm font-bold text-blue-200">
        {label}
      </span>
    </div>
  );
}
