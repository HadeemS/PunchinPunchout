import Link from "next/link";
import { notFound } from "next/navigation";
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
  toLocalDatetimeInputValue,
  weekRangesLastN,
} from "@/lib/time";
import {
  EditEmployeeDialog,
  ResetPasswordButton,
  DeactivateButton,
  ReactivateButton,
} from "@/components/admin/employee-dialogs";
import { EntryActions } from "@/components/admin/entry-actions";
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

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const timezone = await getTimezone();
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      entries: {
        orderBy: { clockIn: "desc" },
        take: 100,
      },
    },
  });

  if (!user) notFound();

  const isIn = await prisma.timeEntry.findFirst({
    where: { userId: user.id, clockOut: null },
  });

  const weeks = weekRangesLastN(8, timezone, now);
  const weekTotals = await Promise.all(
    weeks.map(async (week) => {
      const entries = await prisma.timeEntry.findMany({
        where: {
          userId: user.id,
          clockIn: { lte: week.end },
          OR: [{ clockOut: { gte: week.start } }, { clockOut: null }],
        },
      });
      let minutes = 0;
      for (const e of entries) {
        const start = e.clockIn < week.start ? week.start : e.clockIn;
        const endRaw = e.clockOut ?? now;
        const end = endRaw > week.end ? week.end : endRaw;
        if (end > start) {
          minutes += Math.floor((end.getTime() - start.getTime()) / 60000);
        }
      }
      return {
        label: week.label,
        hours: minutesToDecimalHours(minutes),
        duration: formatDuration(minutes),
      };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/employees"
          className="text-sm text-zinc-500 hover:text-zinc-900 hover:underline"
        >
          ← Employees
        </Link>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              {user.fullName}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              @{user.username} · {user.role}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {user.active ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
              {isIn ? (
                <Badge variant="success">Clocked In</Badge>
              ) : (
                <Badge variant="secondary">Clocked Out</Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <EditEmployeeDialog
              employee={{
                id: user.id,
                fullName: user.fullName,
                role: user.role,
                active: user.active,
              }}
            />
            <ResetPasswordButton
              employee={{ id: user.id, fullName: user.fullName }}
            />
            {user.active ? (
              user.id !== admin.id ? (
                <DeactivateButton
                  employee={{ id: user.id, fullName: user.fullName }}
                />
              ) : null
            ) : (
              <ReactivateButton
                employee={{ id: user.id, fullName: user.fullName }}
              />
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly totals (last 8 weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week</TableHead>
                <TableHead>Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weekTotals.map((w) => (
                <TableRow key={w.label}>
                  <TableCell>{w.label}</TableCell>
                  <TableCell className="tabular-nums">
                    {w.duration} ({w.hours.toFixed(2)}h)
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time entries</CardTitle>
        </CardHeader>
        <CardContent>
          {user.entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              No time entries for this employee.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
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
                {user.entries.map((entry) => {
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
                      </TableCell>
                      <TableCell>
                        {entry.editNote ? (
                          <Badge variant="secondary" title={entry.editNote}>
                            Edited
                          </Badge>
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
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
