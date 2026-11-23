"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

function formatDetails(raw: string): string {
  try {
    const parsed: unknown = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

export function AuditDetails({ details }: { details: string | null }) {
  const [open, setOpen] = useState(false);
  const formatted = useMemo(
    () => (details ? formatDetails(details) : ""),
    [details]
  );

  if (!details) {
    return <span className="text-zinc-400">—</span>;
  }

  const Icon = open ? ChevronDown : ChevronRight;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
      >
        <Icon className="h-3.5 w-3.5" />
        {open ? "Hide details" : "View details"}
      </button>
      {open ? (
        <pre className="max-h-72 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-800">
          {formatted}
        </pre>
      ) : null}
    </div>
  );
}
