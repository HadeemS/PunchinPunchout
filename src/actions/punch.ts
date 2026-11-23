"use server";

import { requireUser } from "@/lib/auth";
import { punchIn, punchOut } from "@/lib/punch";
import { formatTime, getTimezone } from "@/lib/time";

export type PunchActionResult =
  | { ok: true; message: string; recordedAt: string }
  | { ok: false; error: string };

export async function punchInAction(): Promise<PunchActionResult> {
  const user = await requireUser();
  if (user.role === "ADMIN") {
    // Admins can punch if they want — not forbidden by spec
  }
  const result = await punchIn(user.id);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  const tz = await getTimezone();
  const time = formatTime(result.clockIn, tz);
  return {
    ok: true,
    message: `Punched in at ${time}`,
    recordedAt: result.clockIn.toISOString(),
  };
}

export async function punchOutAction(): Promise<PunchActionResult> {
  const user = await requireUser();
  const result = await punchOut(user.id);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  const tz = await getTimezone();
  const time = formatTime(result.clockOut!, tz);
  return {
    ok: true,
    message: `Punched out at ${time}`,
    recordedAt: result.clockOut!.toISOString(),
  };
}
