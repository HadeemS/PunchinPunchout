import { prisma } from "@/lib/db";

export async function writeAuditLog(params: {
  actorId: string;
  action: string;
  targetId?: string | null;
  details?: unknown;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      targetId: params.targetId ?? null,
      details:
        params.details === undefined
          ? null
          : typeof params.details === "string"
            ? params.details
            : JSON.stringify(params.details),
    },
  });
}
