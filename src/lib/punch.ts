import { prisma } from "@/lib/db";

export type PunchResult =
  | { ok: true; clockIn: Date; clockOut?: Date }
  | { ok: false; error: string };

export async function punchIn(userId: string): Promise<PunchResult> {
  const now = new Date();

  try {
    const entry = await prisma.$transaction(async (tx) => {
      const open = await tx.timeEntry.findFirst({
        where: { userId, clockOut: null },
      });
      if (open) {
        throw new Error("ALREADY_IN");
      }
      return tx.timeEntry.create({
        data: {
          userId,
          clockIn: now,
        },
      });
    });

    return { ok: true, clockIn: entry.clockIn };
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_IN") {
      return {
        ok: false,
        error: "You are already punched in. Punch out first.",
      };
    }
    throw err;
  }
}

export async function punchOut(userId: string): Promise<PunchResult> {
  const now = new Date();

  try {
    const entry = await prisma.$transaction(async (tx) => {
      const open = await tx.timeEntry.findFirst({
        where: { userId, clockOut: null },
      });
      if (!open) {
        throw new Error("NOT_IN");
      }
      return tx.timeEntry.update({
        where: { id: open.id },
        data: { clockOut: now },
      });
    });

    return {
      ok: true,
      clockIn: entry.clockIn,
      clockOut: entry.clockOut ?? undefined,
    };
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_IN") {
      return {
        ok: false,
        error: "You are not punched in. Punch in first.",
      };
    }
    throw err;
  }
}

export async function getOpenEntry(userId: string) {
  return prisma.timeEntry.findFirst({
    where: { userId, clockOut: null },
    orderBy: { clockIn: "desc" },
  });
}

/**
 * Check whether a proposed [clockIn, clockOut] interval overlaps any other
 * entry for the same user. Open entries are treated as extending to `now`
 * for comparison when the other entry is open; for the proposed entry, if
 * clockOut is null it is treated as open until far future for overlap checks
 * against closed entries, and as now for display purposes — for admin
 * validation we treat null clockOut as "open" which conflicts with any
 * overlapping open/closed window.
 */
export async function hasOverlap(params: {
  userId: string;
  clockIn: Date;
  clockOut: Date | null;
  excludeId?: string;
}): Promise<boolean> {
  const { userId, clockIn, clockOut, excludeId } = params;
  const proposedEnd = clockOut ?? new Date(8640000000000000); // far future if open

  const others = await prisma.timeEntry.findMany({
    where: {
      userId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  for (const other of others) {
    const otherEnd = other.clockOut ?? new Date(8640000000000000);
    // Overlap if start < otherEnd AND end > other.clockIn
    if (clockIn < otherEnd && proposedEnd > other.clockIn) {
      return true;
    }
  }
  return false;
}
