import { Button } from "./button";

export default function EmptyState({ title, description, action }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-950/40 px-6 py-12">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-5 h-24 w-24 rounded-3xl border border-dashed border-slate-700 bg-slate-900/80" />
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">{description}</p>
        <div className="mt-6 flex justify-center">{action}</div>
      </div>
    </div>
  );
}
