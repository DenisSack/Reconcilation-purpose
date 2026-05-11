import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HistoryTable, type HistoryRow } from "@/components/history/history-table";

type Search = { page?: string };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const page = Math.max(1, Number(searchParams.page || "1"));
  const limit = 20;
  const where =
    session.user.role === "ADMIN" ? {} : { userId: session.user.id };
  const [total, items] = await prisma.$transaction([
    prisma.reconciliation.count({ where }),
    prisma.reconciliation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { username: true } },
        service: { select: { name: true } },
      },
    }),
  ]);

  const rows: HistoryRow[] = items.map((r) => ({
    id: r.id,
    userId: r.userId,
    username: r.user.username,
    serviceId: r.serviceId,
    serviceName: r.service.name,
    supplierCount: r.supplierCount,
    systemCount: r.systemCount,
    totalSupplier: r.totalSupplier,
    totalSystem: r.totalSystem,
    difference: r.difference,
    createdAt: r.createdAt.toISOString(),
    discrepancyCount: Array.isArray(r.discrepancies)
      ? (r.discrepancies as unknown[]).length
      : 0,
    discrepancies: r.discrepancies,
  }));
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Historique</h1>
        <p className="text-sm text-muted-foreground">
          Consultez les réconciliations enregistrées.
        </p>
      </div>
      <HistoryTable
        rows={rows}
        isAdmin={session.user.role === "ADMIN"}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
