"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/time";

export function ElapsedTimer({ clockInIso }: { clockInIso: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const clockIn = new Date(clockInIso).getTime();
  const minutes = Math.max(0, Math.floor((now - clockIn) / 60000));

  return (
    <p className="text-center text-sm text-zinc-500">
      Elapsed:{" "}
      <span className="font-medium text-zinc-900 tabular-nums">
        {formatDuration(minutes)}
      </span>
    </p>
  );
}
