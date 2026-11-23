import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getTimezone,
  minutesToDecimalHours,
  startOfWeekInTz,
  endOfWeekInTz,
} from "@/lib/time";
import {
  AddEmployeeDialog,
  EditEmployeeDialog,
  ResetPasswordButton,
  DeactivateButton,
  ReactivateButton,
} from "@/components/admin/employee-dialogs";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function EmployeesPage() {
  const admin = await requireAdmin();
  const timezone = await getTimezone();
  const now = new Date();
  const weekStart = startOfWeekInTz(now, timezone);
  const weekEnd = endOfWeekInTz(now, timezone);

  const users = await prisma.user.findMany({
    orderBy: { fullName: "asc" },
    include: {
      entries: {
        where: {
          clockIn: { lte: weekEnd },
          OR: [{ clockOut: { gte: weekStart } }, { clockOut: null }],
        },
      },
    },
  });

  const openIds = new Set(
    (
      await prisma.timeEntry.findMany({
        where: { clockOut: null },
        select: { userId: true },
      })
    ).map((e) => e.userId)
  );

  function weekHours(
    entries: { clockIn: Date; clockOut: Date | null }[]
  ): number {
    let minutes = 0;
    for (const e of entries) {
      const start = e.clockIn < weekStart ? weekStart : e.clockIn;
      const endRaw = e.clockOut ?? now;
      const end = endRaw > weekEnd ? weekEnd : endRaw;
      if (end > start) {
        minutes += Math.floor((end.getTime() - start.getTime()) / 60000);
      }
    }
    return minutesToDecimalHours(minutes);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Employees</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Create and manage employee accounts
          </p>
        </div>
        <AddEmployeeDialog />
      </div>

      <Card>
        <CardContent className="pt-6">
          {users.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              No employees yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Currently</TableHead>
                  <TableHead>Hours this week</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isIn = openIds.has(user.id);
                  const hours = weekHours(user.entries);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Link
                          href={`/admin/employees/${user.id}`}
                          className="font-medium text-zinc-900 hover:underline"
                        >
                          {user.fullName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {user.username}
                      </TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>
                        {user.active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isIn ? (
                          <Badge variant="success">In</Badge>
                        ) : (
                          <Badge variant="secondary">Out</Badge>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {hours.toFixed(2)}h
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <EditEmployeeDialog
                            employee={{
                              id: user.id,
                              fullName: user.fullName,
                              role: user.role,
                              active: user.active,
                            }}
                          />
                          <ResetPasswordButton
                            employee={{
                              id: user.id,
                              fullName: user.fullName,
                            }}
                          />
                          {user.active ? (
                            user.id !== admin.id ? (
                              <DeactivateButton
                                employee={{
                                  id: user.id,
                                  fullName: user.fullName,
                                }}
                              />
                            ) : null
                          ) : (
                            <ReactivateButton
                              employee={{
                                id: user.id,
                                fullName: user.fullName,
                              }}
                            />
                          )}
                        </div>
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
