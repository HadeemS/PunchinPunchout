import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rowsToCsv } from "@/lib/csv";
import {
  entryDurationMinutes,
  formatDate,
  formatTime,
  getTimezone,
  minutesToDecimalHours,
} from "@/lib/time";
import { fromZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  startOfWeekInTz,
  endOfWeekInTz,
} from "@/lib/time";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const timezone = await getTimezone();
  const now = new Date();
  const sp = request.nextUrl.searchParams;

  const defaultFrom = format(
    toZonedTime(startOfWeekInTz(now, timezone), timezone),
    "yyyy-MM-dd"
  );
  const defaultTo = format(
    toZonedTime(endOfWeekInTz(now, timezone), timezone),
    "yyyy-MM-dd"
  );

  const employeeId = sp.get("employee") || undefined;
  const from = sp.get("from") || defaultFrom;
  const to = sp.get("to") || defaultTo;
  const statusRaw = sp.get("status") || "all";
  const status =
    statusRaw === "open" || statusRaw === "closed" ? statusRaw : "all";

  const rangeStart = fromZonedTime(`${from}T00:00:00`, timezone);
  const rangeEnd = fromZonedTime(`${to}T23:59:59.999`, timezone);

  const entries = await prisma.timeEntry.findMany({
    where: {
      ...(employeeId ? { userId: employeeId } : {}),
      clockIn: { gte: rangeStart, lte: rangeEnd },
      ...(status === "open"
        ? { clockOut: null }
        : status === "closed"
          ? { clockOut: { not: null } }
          : {}),
    },
    include: {
      user: { select: { fullName: true, username: true } },
    },
    orderBy: { clockIn: "asc" },
  });

  const headers = [
    "Employee",
    "Username",
    "Date",
    "Punch In",
    "Punch Out",
    "Hours",
    "Edited",
    "Note",
  ];

  const rows = entries.map((e) => {
    const mins = entryDurationMinutes(e.clockIn, e.clockOut, now);
    return [
      e.user.fullName,
      e.user.username,
      formatDate(e.clockIn, timezone),
      formatTime(e.clockIn, timezone),
      e.clockOut ? formatTime(e.clockOut, timezone) : "",
      minutesToDecimalHours(mins).toFixed(2),
      e.editNote ? "Yes" : "No",
      e.editNote ?? "",
    ];
  });

  const csv = rowsToCsv(headers, rows);
  const filename = `timeclock_${from}_to_${to}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
