"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export function LiveClock({ timezone }: { timezone: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const zoned = toZonedTime(now, timezone);

  return (
    <div className="text-center">
      <p className="text-5xl font-semibold tracking-tight text-zinc-900 tabular-nums sm:text-6xl">
        {format(zoned, "h:mm:ss a")}
      </p>
      <p className="mt-2 text-base text-zinc-500 sm:text-lg">
        {format(zoned, "EEEE, MMM d, yyyy")}
      </p>
    </div>
  );
}
