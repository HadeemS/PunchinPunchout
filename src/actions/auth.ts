"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { loginSchema, changePasswordSchema } from "@/lib/validators";

const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Invalid username or password." };
  }

  const username = parsed.data.username.trim().toLowerCase();
  const password = parsed.data.password;

  const since = new Date(Date.now() - LOCKOUT_WINDOW_MS);
  const recentFails = await prisma.loginAttempt.count({
    where: {
      username,
      success: false,
      createdAt: { gte: since },
    },
  });

  if (recentFails >= MAX_ATTEMPTS) {
    const oldest = await prisma.loginAttempt.findFirst({
      where: {
        username,
        success: false,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "asc" },
    });
    const unlockAt = oldest
      ? oldest.createdAt.getTime() + LOCKOUT_WINDOW_MS
      : Date.now() + LOCKOUT_WINDOW_MS;
    const minutesLeft = Math.max(
      1,
      Math.ceil((unlockAt - Date.now()) / 60000)
    );
    return {
      ok: false,
      error: `Too many attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
    };
  }

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    null;

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !user.active) {
    await prisma.loginAttempt.create({
      data: {
        username,
        userId: user?.id ?? null,
        success: false,
        ip,
      },
    });
    return { ok: false, error: "Invalid username or password." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await prisma.loginAttempt.create({
      data: {
        username,
        userId: user.id,
        success: false,
        ip,
      },
    });
    return { ok: false, error: "Invalid username or password." };
  }

  await prisma.loginAttempt.create({
    data: {
      username,
      userId: user.id,
      success: true,
      ip,
    },
  });

  await createSession(user);

  if (user.mustChangePassword) {
    redirect("/change-password");
  }
  redirect(user.role === "ADMIN" ? "/admin" : "/clock");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function changePasswordAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] = fieldErrors[key] ?? [];
      fieldErrors[key].push(issue.message);
    }
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    return { ok: false, error: "User not found." };
  }

  const valid = await verifyPassword(
    parsed.data.currentPassword,
    dbUser.passwordHash
  );
  if (!valid) {
    return {
      ok: false,
      error: "Current password is incorrect.",
      fieldErrors: { currentPassword: ["Current password is incorrect."] },
    };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
      sessionVersion: { increment: 1 },
    },
  });

  await createSession(updated);

  redirect(updated.role === "ADMIN" ? "/admin" : "/clock");
}
