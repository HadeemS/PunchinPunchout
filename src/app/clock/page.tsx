import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getOpenEntry } from "@/lib/punch";
import { formatTime, getSetting, getTimezone } from "@/lib/time";
import { LiveClock } from "@/components/clock/live-clock";
import { ElapsedTimer } from "@/components/clock/elapsed-timer";
import { PunchControls } from "@/components/clock/punch-controls";
import { logoutAction } from "@/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ClockPage() {
  const user = await requireUser();
  if (user.mustChangePassword) {
    // middleware also handles this
  }

  const [timezone, kioskSetting, openEntry] = await Promise.all([
    getTimezone(),
    getSetting("kioskAutoLogout", "true"),
    getOpenEntry(user.id),
  ]);

  const isClockedIn = !!openEntry;
  const sinceLabel = openEntry
    ? formatTime(openEntry.clockIn, timezone)
    : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <LiveClock timezone={timezone} />

        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Hello, {user.fullName}
          </h1>
          {isClockedIn ? (
            <Badge variant="success" className="px-3 py-1 text-sm">
              Clocked In since {sinceLabel}
            </Badge>
          ) : (
            <Badge variant="secondary" className="px-3 py-1 text-sm">
              Clocked Out
            </Badge>
          )}
        </div>

        {isClockedIn && openEntry && (
          <ElapsedTimer clockInIso={openEntry.clockIn.toISOString()} />
        )}

        <PunchControls
          isClockedIn={isClockedIn}
          kioskAutoLogout={kioskSetting === "true"}
        />

        <div className="flex items-center justify-center gap-6 text-sm">
          <Link
            href="/change-password"
            className="text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 rounded"
          >
            Change password
          </Link>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" className="h-auto p-0 text-sm text-zinc-500 hover:bg-transparent hover:text-zinc-900 hover:underline">
              Log out
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
