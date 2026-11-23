"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { hasOverlap } from "@/lib/punch";
import {
  entryCreateSchema,
  entryDeleteSchema,
  entryEditSchema,
} from "@/lib/validators";
import { getTimezone, parseLocalDatetimeToUtc } from "@/lib/time";
import { zodFieldErrors } from "@/lib/zod-errors";

export type EntryActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function editEntryAction(
  _prev: EntryActionResult | null,
  formData: FormData
): Promise<EntryActionResult> {
  const admin = await requireAdmin();
  const parsed = entryEditSchema.safeParse({
    id: formData.get("id"),
    clockIn: formData.get("clockIn"),
    clockOut: formData.get("clockOut") || null,
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  const tz = await getTimezone();
  const clockIn = parseLocalDatetimeToUtc(parsed.data.clockIn, tz);
  const clockOut = parsed.data.clockOut
    ? parseLocalDatetimeToUtc(parsed.data.clockOut, tz)
    : null;

  const existing = await prisma.timeEntry.findUnique({
    where: { id: parsed.data.id },
  });
  if (!existing) {
    return { ok: false, error: "Time entry not found." };
  }

  if (
    await hasOverlap({
      userId: existing.userId,
      clockIn,
      clockOut,
      excludeId: existing.id,
    })
  ) {
    return {
      ok: false,
      error: "This time range overlaps another entry for this employee.",
    };
  }

  const before = {
    clockIn: existing.clockIn.toISOString(),
    clockOut: existing.clockOut?.toISOString() ?? null,
    editNote: existing.editNote,
  };

  const updated = await prisma.timeEntry.update({
    where: { id: existing.id },
    data: {
      clockIn,
      clockOut,
      editedById: admin.id,
      editNote: parsed.data.note,
    },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: "ENTRY_EDITED",
    targetId: updated.id,
    details: {
      before,
      after: {
        clockIn: updated.clockIn.toISOString(),
        clockOut: updated.clockOut?.toISOString() ?? null,
        editNote: updated.editNote,
      },
      userId: existing.userId,
    },
  });

  revalidatePath("/admin/time-entries");
  revalidatePath("/admin");
  revalidatePath(`/admin/employees/${existing.userId}`);
  return { ok: true };
}

export async function createEntryAction(
  _prev: EntryActionResult | null,
  formData: FormData
): Promise<EntryActionResult> {
  const admin = await requireAdmin();
  const parsed = entryCreateSchema.safeParse({
    userId: formData.get("userId"),
    clockIn: formData.get("clockIn"),
    clockOut: formData.get("clockOut") || null,
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
  });
  if (!user) {
    return { ok: false, error: "Employee not found." };
  }

  const tz = await getTimezone();
  const clockIn = parseLocalDatetimeToUtc(parsed.data.clockIn, tz);
  const clockOut = parsed.data.clockOut
    ? parseLocalDatetimeToUtc(parsed.data.clockOut, tz)
    : null;

  if (
    await hasOverlap({
      userId: user.id,
      clockIn,
      clockOut,
    })
  ) {
    return {
      ok: false,
      error: "This time range overlaps another entry for this employee.",
    };
  }

  const created = await prisma.timeEntry.create({
    data: {
      userId: user.id,
      clockIn,
      clockOut,
      editedById: admin.id,
      editNote: parsed.data.note,
    },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: "ENTRY_CREATED",
    targetId: created.id,
    details: {
      after: {
        userId: user.id,
        clockIn: created.clockIn.toISOString(),
        clockOut: created.clockOut?.toISOString() ?? null,
        editNote: created.editNote,
      },
    },
  });

  revalidatePath("/admin/time-entries");
  revalidatePath("/admin");
  revalidatePath(`/admin/employees/${user.id}`);
  return { ok: true };
}

export async function deleteEntryAction(
  _prev: EntryActionResult | null,
  formData: FormData
): Promise<EntryActionResult> {
  const admin = await requireAdmin();
  const parsed = entryDeleteSchema.safeParse({
    id: formData.get("id"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  const existing = await prisma.timeEntry.findUnique({
    where: { id: parsed.data.id },
  });
  if (!existing) {
    return { ok: false, error: "Time entry not found." };
  }

  await prisma.timeEntry.delete({ where: { id: existing.id } });

  await writeAuditLog({
    actorId: admin.id,
    action: "ENTRY_DELETED",
    targetId: existing.id,
    details: {
      before: {
        userId: existing.userId,
        clockIn: existing.clockIn.toISOString(),
        clockOut: existing.clockOut?.toISOString() ?? null,
        editNote: existing.editNote,
      },
      reason: parsed.data.note,
    },
  });

  revalidatePath("/admin/time-entries");
  revalidatePath("/admin");
  revalidatePath(`/admin/employees/${existing.userId}`);
  return { ok: true };
}
