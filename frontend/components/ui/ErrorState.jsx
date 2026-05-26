import { Button } from "./button";

export default function ErrorState({ title = "Something went wrong", description, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-900/80 bg-red-950/40 p-5 text-sm text-red-200">
      <div className="font-medium">{title}</div>
      {description ? <div className="mt-1 text-red-200/80">{description}</div> : null}
      {onRetry ? <div className="mt-4"><Button variant="outline" size="sm" onClick={onRetry}>Retry</Button></div> : null}
    </div>
  );
}
