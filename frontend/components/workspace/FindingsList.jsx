"use client";

import FindingRow from "./FindingRow";
import { ScrollArea } from "../ui/scroll-area";

export function FindingsList({ groups = { critical: [], warning: [], info: [] } }) {
  const order = [
    ["critical", groups.critical || []],
    ["warning", groups.warning || []],
    ["info", groups.info || []]
  ];

  if (!order.some(([, findings]) => findings.length)) {
    return <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 p-6 text-sm text-slate-500">No findings available.</div>;
  }

  return (
    <ScrollArea className="max-h-[720px] pr-2">
      <div className="space-y-5">
        {order.map(([label, findings]) =>
          findings.length ? (
            <section key={label} className="space-y-3">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</div>
              <div className="space-y-3">
                {findings.map((finding, index) => <FindingRow key={`${label}-${index}`} finding={finding} />)}
              </div>
            </section>
          ) : null
        )}
      </div>
    </ScrollArea>
  );
}
