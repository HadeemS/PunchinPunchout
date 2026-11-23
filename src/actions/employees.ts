"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { requireAdmin, hashPassword, generateTempPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "@/lib/validators";
import { zodFieldErrors } from "@/lib/zod-errors";

export type EmployeeActionResult =
  | { ok: true; tempPassword?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createEmployeeAction(
  _prev: EmployeeActionResult | null,
  formData: FormData
): Promise<EmployeeActionResult> {
  const admin = await requireAdmin();
  const parsed = createEmployeeSchema.safeParse({
    fullName: formData.get("fullName"),
    username: formData.get("username"),
    role: formData.get("role"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  const existing = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });
  if (existing) {
    return {
      ok: false,
      error: "Username already taken.",
      fieldErrors: { username: ["Username already taken."] },
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      fullName: parsed.data.fullName.trim(),
      username: parsed.data.username,
      role: parsed.data.role as Role,
      passwordHash,
      mustChangePassword: true,
      active: true,
    },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: "USER_CREATED",
    targetId: user.id,
    details: {
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
  });

  revalidatePath("/admin/employees");
  return { ok: true, tempPassword: parsed.data.password };
}

export async function updateEmployeeAction(
  _prev: EmployeeActionResult | null,
  formData: FormData
): Promise<EmployeeActionResult> {
  const admin = await requireAdmin();
  const parsed = updateEmployeeSchema.safeParse({
    id: formData.get("id"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.id },
  });
  if (!target) {
    return { ok: false, error: "Employee not found." };
  }

  // Cannot demote yourself
  if (
    target.id === admin.id &&
    parsed.data.role !== Role.ADMIN
  ) {
    return { ok: false, error: "You cannot demote yourself." };
  }

  // Keep at least one active admin
  if (
    target.role === Role.ADMIN &&
    parsed.data.role !== Role.ADMIN &&
    target.active
  ) {
    const activeAdmins = await prisma.user.count({
      where: { role: Role.ADMIN, active: true },
    });
    if (activeAdmins <= 1) {
      return {
        ok: false,
        error: "There must always be at least one active admin.",
      };
    }
  }

  const before = { fullName: target.fullName, role: target.role };
  const updated = await prisma.user.update({
    where: { id: target.id },
    data: {
      fullName: parsed.data.fullName.trim(),
      role: parsed.data.role as Role,
    },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: "USER_UPDATED",
    targetId: updated.id,
    details: {
      before,
      after: { fullName: updated.fullName, role: updated.role },
    },
  });

  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${updated.id}`);
  return { ok: true };
}

export async function resetPasswordAction(
  userId: string
): Promise<EmployeeActionResult> {
  const admin = await requireAdmin();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return { ok: false, error: "Employee not found." };
  }

  const tempPassword = generateTempPassword(12);
  const passwordHash = await hashPassword(tempPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword: true,
      sessionVersion: { increment: 1 },
    },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: "PASSWORD_RESET",
    targetId: userId,
    details: { username: target.username },
  });

  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${userId}`);
  return { ok: true, tempPassword };
}

export async function setEmployeeActiveAction(
  userId: string,
  active: boolean
): Promise<EmployeeActionResult> {
  const admin = await requireAdmin();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return { ok: false, error: "Employee not found." };
  }

  if (!active && target.id === admin.id) {
    return { ok: false, error: "You cannot deactivate yourself." };
  }

  if (!active && target.role === Role.ADMIN && target.active) {
    const activeAdmins = await prisma.user.count({
      where: { role: Role.ADMIN, active: true },
    });
    if (activeAdmins <= 1) {
      return {
        ok: false,
        error: "There must always be at least one active admin.",
      };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      active,
      ...(active ? {} : { sessionVersion: { increment: 1 } }),
    },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: active ? "USER_REACTIVATED" : "USER_DEACTIVATED",
    targetId: userId,
    details: { username: target.username },
  });

  revalidatePath("/admin/employees");
  revalidatePath(`/admin/employees/${userId}`);
  return { ok: true };
}

export async function generatePasswordAction(): Promise<{ password: string }> {
  await requireAdmin();
  return { password: generateTempPassword(12) };
}
