"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "./button";

export default function CodeBlock({ code = "", language = "python" }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-xs text-slate-500">
        <span className="font-mono uppercase tracking-[0.18em]">{language}</span>
        <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 rounded-full border-slate-700 bg-slate-900 px-3 text-xs">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-6 text-slate-200"><code>{code || "# No code available"}</code></pre>
    </div>
  );
}
