import { NextResponse } from "next/server";
import { checkNeonHealth } from "@/lib/neon";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await checkNeonHealth();
  const ok = health.postgres.ok && (!health.auth.configured || health.auth.ok);
  return NextResponse.json(
    {
      ok,
      ...health,
      note:
        "Employee login uses app JWT sessions; Neon Auth is provisioned for future Managed Better Auth use.",
    },
    { status: ok ? 200 : 503 }
  );
}
