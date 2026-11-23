import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  entryDurationMinutes,
  formatDate,
  formatDuration,
  formatTime,
  getTimezone,
  isMissedPunch,
  minutesToDecimalHours,
  startOfWeekInTz,
  endOfWeekInTz,
  toLocalDatetimeInputValue,
} from "@/lib/time";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { EntriesFilters } from "@/components/admin/entries-filters";
import { EntryActions } from "@/components/admin/entry-actions";
import { AddEntryDialog } from "@/components/admin/add-entry-dialog";
import { ExportButton } from "@/components/admin/export-button";
import { Pagination } from "@/components/admin/pagination";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 25;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function param(sp: Record<string, string | string[] | undefined>, key: string) {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function TimeEntriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const timezone = await getTimezone();
  const now = new Date();

  const defaultFrom = format(
    toZonedTime(startOfWeekInTz(now, timezone), timezone),
    "yyyy-MM-dd"
  );
  const defaultTo = format(
    toZonedTime(endOfWeekInTz(now, timezone), timezone),
    "yyyy-MM-dd"
  );

  const employeeId = param(sp, "employee") || undefined;
  const from = param(sp, "from") || defaultFrom;
  const to = param(sp, "to") || defaultTo;
  const statusRaw = param(sp, "status") || "all";
  const status =
    statusRaw === "open" || statusRaw === "closed" ? statusRaw : "all";
  const page = Math.max(1, parseInt(param(sp, "page") || "1", 10) || 1);

  const rangeStart = fromZonedTime(`${from}T00:00:00`, timezone);
  const rangeEnd = fromZonedTime(`${to}T23:59:59.999`, timezone);

  const where = {
    ...(employeeId ? { userId: employeeId } : {}),
    clockIn: { gte: rangeStart, lte: rangeEnd },
    ...(status === "open"
      ? { clockOut: null }
      : status === "closed"
        ? { clockOut: { not: null } }
        : {}),
  };

  const [employees, total, entries] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.timeEntry.count({ where }),
    prisma.timeEntry.findMany({
      where,
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { clockIn: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  // Total hours for full filtered set (not just page)
  const allForTotal = await prisma.timeEntry.findMany({
    where,
    select: { clockIn: true, clockOut: true },
  });
  let totalMinutes = 0;
  for (const e of allForTotal) {
    totalMinutes += entryDurationMinutes(e.clockIn, e.clockOut, now);
  }
  const totalHours = minutesToDecimalHours(totalMinutes);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filterParams = {
    ...(employeeId ? { employee: employeeId } : {}),
    from,
    to,
    ...(status !== "all" ? { status } : {}),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Time Entries</h1>
          <p className="mt-1 text-sm text-zinc-500">
            View, edit, and export punches
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton searchParams={filterParams} />
          <AddEntryDialog employees={employees} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-20 animate-pulse rounded-xl bg-zinc-100" />}>
            <EntriesFilters
              employees={employees}
              defaults={{
                employee: employeeId,
                from,
                to,
                status,
              }}
            />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {entries.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              No time entries for this range.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Punch In</TableHead>
                    <TableHead>Punch Out</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const mins = entryDurationMinutes(
                      entry.clockIn,
                      entry.clockOut,
                      now
                    );
                    const missed = isMissedPunch(
                      entry.clockIn,
                      entry.clockOut,
                      now
                    );
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {entry.user.fullName}
                        </TableCell>
                        <TableCell>
                          {formatDate(entry.clockIn, timezone)}
                        </TableCell>
                        <TableCell>
                          {formatTime(entry.clockIn, timezone)}
                        </TableCell>
                        <TableCell>
                          {entry.clockOut
                            ? formatTime(entry.clockOut, timezone)
                            : "—"}
                          {missed && (
                            <Badge variant="warning" className="ml-2">
                              Missed punch?
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatDuration(mins)}
                          <span className="ml-1 text-xs text-zinc-400">
                            ({minutesToDecimalHours(mins).toFixed(2)}h)
                          </span>
                        </TableCell>
                        <TableCell>
                          {entry.editNote ? (
                            <span
                              className="inline-flex items-center gap-1"
                              title={entry.editNote}
                            >
                              <Badge variant="secondary">Edited</Badge>
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <EntryActions
                            entry={{
                              id: entry.id,
                              clockInLocal: toLocalDatetimeInputValue(
                                entry.clockIn,
                                timezone
                              ),
                              clockOutLocal: entry.clockOut
                                ? toLocalDatetimeInputValue(
                                    entry.clockOut,
                                    timezone
                                  )
                                : null,
                              editNote: entry.editNote,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="font-medium">
                      Total ({total} entries)
                    </TableCell>
                    <TableCell colSpan={3} className="font-medium tabular-nums">
                      {formatDuration(totalMinutes)} ({totalHours.toFixed(2)}h)
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
              <div className="mt-4">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  basePath="/admin/time-entries"
                  searchParams={filterParams}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
