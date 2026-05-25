export default function FindingsBadge({ severity = "info" }) {
  const styles = {
    critical: "border-rose-500/25 bg-rose-500/10 text-rose-200",
    error: "border-rose-500/25 bg-rose-500/10 text-rose-200",
    warning: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    info: "border-sky-400/20 bg-sky-400/10 text-sky-200",
    success: "border-blue-400/20 bg-blue-400/10 text-blue-200"
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${styles[severity] || styles.info}`}>
      {severity}
    </span>
  );
}
