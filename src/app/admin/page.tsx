import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  entryDurationMinutes,
  formatDuration,
  formatTime,
  formatDateTime,
  getTimezone,
  isMissedPunch,
  minutesToDecimalHours,
  startOfDayInTz,
  endOfDayInTz,
  startOfWeekInTz,
  endOfWeekInTz,
  MISSED_PUNCH_HOURS,
} from "@/lib/time";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const timezone = await getTimezone();
  const now = new Date();
  const dayStart = startOfDayInTz(now, timezone);
  const dayEnd = endOfDayInTz(now, timezone);
  const weekStart = startOfWeekInTz(now, timezone);
  const weekEnd = endOfWeekInTz(now, timezone);
  const missedCutoff = new Date(
    now.getTime() - MISSED_PUNCH_HOURS * 60 * 60 * 1000
  );

  const [openEntries, todayEntries, weekEntries, missedCount, recent] =
    await Promise.all([
      prisma.timeEntry.findMany({
        where: { clockOut: null },
        include: { user: { select: { id: true, fullName: true } } },
        orderBy: { clockIn: "asc" },
      }),
      prisma.timeEntry.findMany({
        where: {
          clockIn: { lte: dayEnd },
          OR: [{ clockOut: { gte: dayStart } }, { clockOut: null }],
        },
      }),
      prisma.timeEntry.findMany({
        where: {
          clockIn: { lte: weekEnd },
          OR: [{ clockOut: { gte: weekStart } }, { clockOut: null }],
        },
      }),
      prisma.timeEntry.count({
        where: { clockOut: null, clockIn: { lt: missedCutoff } },
      }),
      prisma.timeEntry.findMany({
        take: 10,
        orderBy: { updatedAt: "desc" },
        include: { user: { select: { fullName: true } } },
      }),
    ]);

  function hoursInRange(
    entries: { clockIn: Date; clockOut: Date | null }[],
    rangeStart: Date,
    rangeEnd: Date
  ): number {
    let minutes = 0;
    for (const e of entries) {
      const start = e.clockIn < rangeStart ? rangeStart : e.clockIn;
      const endRaw = e.clockOut ?? now;
      const end = endRaw > rangeEnd ? rangeEnd : endRaw;
      if (end > start) {
        minutes += Math.floor((end.getTime() - start.getTime()) / 60000);
      }
    }
    return minutesToDecimalHours(minutes);
  }

  const todayHours = hoursInRange(todayEntries, dayStart, dayEnd);
  const weekHours = hoursInRange(weekEntries, weekStart, weekEnd);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Overview of today&apos;s activity
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Clocked in now" value={openEntries.length} />
        <StatCard
          title="Total hours today"
          value={todayHours.toFixed(2)}
          hint="Decimal hours"
        />
        <StatCard
          title="Total hours this week"
          value={weekHours.toFixed(2)}
          hint="Mon–Sun"
        />
        <StatCard
          title="Missed punches"
          value={missedCount}
          hint={`Open longer than ${MISSED_PUNCH_HOURS}h`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Who&apos;s in right now</CardTitle>
        </CardHeader>
        <CardContent>
          {openEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              No one is clocked in.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Clocked in at</TableHead>
                  <TableHead>Elapsed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openEntries.map((entry) => {
                  const mins = entryDurationMinutes(entry.clockIn, null, now);
                  const missed = isMissedPunch(entry.clockIn, null, now);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Link
                          href={`/admin/employees/${entry.user.id}`}
                          className="font-medium text-zinc-900 hover:underline"
                        >
                          {entry.user.fullName}
                        </Link>
                      </TableCell>
                      <TableCell>{formatTime(entry.clockIn, timezone)}</TableCell>
                      <TableCell className="tabular-nums">
                        {formatDuration(mins)}
                      </TableCell>
                      <TableCell>
                        {missed ? (
                          <Badge variant="warning">Missed punch?</Badge>
                        ) : (
                          <Badge variant="success">In</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              No recent punches.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {recent.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <span className="font-medium text-zinc-900">
                      {entry.user.fullName}
                    </span>
                    <span className="text-zinc-500">
                      {" "}
                      {entry.clockOut ? "punched out" : "punched in"}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-500">
                    {formatDateTime(
                      entry.clockOut ?? entry.clockIn,
                      timezone
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
