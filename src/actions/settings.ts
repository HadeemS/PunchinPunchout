"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { settingsSchema } from "@/lib/validators";
import { COMMON_TIMEZONES } from "@/lib/time";

export type SettingsActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateSettingsAction(
  _prev: SettingsActionResult | null,
  formData: FormData
): Promise<SettingsActionResult> {
  const admin = await requireAdmin();

  const parsed = settingsSchema.safeParse({
    timezone: formData.get("timezone"),
    kioskAutoLogout: formData.get("kioskAutoLogout"),
    businessName: formData.get("businessName"),
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

  if (
    !(COMMON_TIMEZONES as readonly string[]).includes(parsed.data.timezone)
  ) {
    return {
      ok: false,
      error: "Invalid timezone.",
      fieldErrors: { timezone: ["Invalid timezone."] },
    };
  }

  const before: Record<string, string> = {};
  for (const key of ["timezone", "kioskAutoLogout", "businessName"] as const) {
    const s = await prisma.setting.findUnique({ where: { key } });
    before[key] = s?.value ?? "";
  }

  await prisma.setting.upsert({
    where: { key: "timezone" },
    update: { value: parsed.data.timezone },
    create: { key: "timezone", value: parsed.data.timezone },
  });
  await prisma.setting.upsert({
    where: { key: "kioskAutoLogout" },
    update: { value: parsed.data.kioskAutoLogout },
    create: { key: "kioskAutoLogout", value: parsed.data.kioskAutoLogout },
  });
  await prisma.setting.upsert({
    where: { key: "businessName" },
    update: { value: parsed.data.businessName },
    create: { key: "businessName", value: parsed.data.businessName },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: "SETTINGS_UPDATED",
    details: {
      before,
      after: parsed.data,
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/login");
  revalidatePath("/clock");
  revalidatePath("/admin");
  return { ok: true };
}
