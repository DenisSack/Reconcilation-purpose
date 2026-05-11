import { prisma } from "@/lib/prisma";
import { isAuditAction, type AuditAction } from "@/lib/db-types";
import { AuditTable, type AuditRow } from "@/components/admin/audit-table";

type Search = { action?: string; userId?: string };

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const where: {
    action?: AuditAction;
    userId?: string;
  } = {};

  if (searchParams.action && isAuditAction(searchParams.action)) {
    where.action = searchParams.action;
  }

  if (searchParams.userId) {
    where.userId = searchParams.userId;
  }

  const [logs, users] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { username: true } } },
    }),
    prisma.user.findMany({
      select: { id: true, username: true },
      orderBy: { username: "asc" },
    }),
  ]);

  type LogRow = {
    id: string;
    userId: string;
    action: AuditAction;
    details: unknown;
    createdAt: Date;
    user: { username: string };
  };

  const rows: AuditRow[] = (logs as LogRow[]).map((l) => ({
    id: l.id,
    createdAt: l.createdAt.toISOString(),
    userId: l.userId,
    username: l.user.username,
    action: l.action,
    details: l.details,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Journal d’audit
        </h1>
        <p className="text-sm text-muted-foreground">
          Événements système et actions administrateur.
        </p>
      </div>
      <AuditTable
        rows={rows}
        users={users}
        filters={{ action: searchParams.action, userId: searchParams.userId }}
      />
    </div>
  );
}
