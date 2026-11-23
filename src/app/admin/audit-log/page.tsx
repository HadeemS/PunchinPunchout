import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, getTimezone } from "@/lib/time";
import { AuditDetails } from "@/components/admin/audit-details";
import { Pagination } from "@/components/admin/pagination";
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

const PAGE_SIZE = 25;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const timezone = await getTimezone();
  const pageRaw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Math.max(1, parseInt(pageRaw || "1", 10) || 1);

  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const actorIds = [...new Set(logs.map((l) => l.actorId))];
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, fullName: true, username: true },
  });
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Audit Log</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Read-only record of administrative actions
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {logs.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              No audit log entries yet.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const actor = actorMap.get(log.actorId);
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(log.createdAt, timezone)}
                        </TableCell>
                        <TableCell>
                          {actor?.fullName ?? "Unknown"}
                          {actor ? (
                            <span className="block text-xs text-zinc-400">
                              @{actor.username}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.action}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-zinc-500">
                          {log.targetId ?? "—"}
                        </TableCell>
                        <TableCell>
                          <AuditDetails details={log.details} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-4">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  basePath="/admin/audit-log"
                  searchParams={{}}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
