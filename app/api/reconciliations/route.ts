import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reconciliationSaveSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

type ReconciliationListRow = {
  id: string;
  userId: string;
  serviceId: string;
  supplierCount: number;
  systemCount: number;
  totalSupplier: number;
  totalSystem: number;
  difference: number;
  createdAt: Date;
  discrepancies: unknown;
  user: { username: string };
  service: { name: string };
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
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

  const rows = (items as ReconciliationListRow[]).map((r) => ({
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
    discrepancies: r.discrepancies,
    discrepancyCount: Array.isArray(r.discrepancies)
      ? (r.discrepancies as unknown[]).length
      : 0,
  }));

  return NextResponse.json({
    items: rows,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = reconciliationSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    serviceId,
    supplierCount,
    systemCount,
    totalSupplier,
    totalSystem,
    difference,
    discrepancies,
  } =
    parsed.data;

  const service = await prisma.service.findFirst({
    where:
      session.user.role === "ADMIN"
        ? { id: serviceId }
        : { id: serviceId, users: { some: { userId: session.user.id } } },
  });

  if (!service) {
    return NextResponse.json({ error: "Service non autorisé" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.reconciliation.create({
      data: {
        userId: session.user.id,
        serviceId,
        supplierCount,
        systemCount,
        totalSupplier,
        totalSystem,
        difference,
        discrepancies: JSON.parse(JSON.stringify(discrepancies)) as object[],
      } as never,
    }),
    prisma.service.update({
      where: { id: serviceId },
      data: { lastReconciled: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
