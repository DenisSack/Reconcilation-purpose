import { PrismaClient } from "@prisma/client";
import { Role, type AuditAction } from "../lib/db-types";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.reconciliation.deleteMany();
  await prisma.userService.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.service.deleteMany();

  const [electricite, eau, telephonie] = await Promise.all([
    prisma.service.create({
      data: {
        name: "Électricité",
        description: "Postes et facturation électricité",
        lastReconciled: new Date("2025-04-01T10:00:00.000Z"),
      },
    }),
    prisma.service.create({
      data: {
        name: "Eau",
        description: "Abonnements et consommation eau",
        lastReconciled: new Date("2025-03-20T14:30:00.000Z"),
      },
    }),
    prisma.service.create({
      data: {
        name: "Téléphonie",
        description: "Lignes fixes et mobiles",
        lastReconciled: new Date("2025-04-10T09:15:00.000Z"),
      },
    }),
  ]);

  const adminPass = await bcrypt.hash("admin123", 10);
  const userPass = await bcrypt.hash("user123", 10);

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      password: adminPass,
      role: Role.ADMIN,
      canAccessStatus: true,
    },
  });

  const user1 = await prisma.user.create({
    data: {
      username: "user1",
      password: userPass,
      role: Role.USER,
      canAccessStatus: true,
      services: {
        create: [
          { serviceId: electricite.id },
          { serviceId: eau.id },
        ],
      },
    },
  });

  const user2 = await prisma.user.create({
    data: {
      username: "user2",
      password: userPass,
      role: Role.USER,
      canAccessStatus: false,
      services: {
        create: [{ serviceId: telephonie.id }],
      },
    },
  });

  const demoDiscrepancies = [
    {
      reference: "INV-1001",
      supplierAmount: 1200,
      systemAmount: 1150,
      difference: 50,
      problem: "Montants différents" as const,
    },
    {
      reference: "INV-1002",
      supplierAmount: null,
      systemAmount: 300,
      difference: 300,
      problem: "Manquant fournisseur" as const,
    },
    {
      reference: "INV-1003",
      supplierAmount: 450,
      systemAmount: null,
      difference: 450,
      problem: "Manquant système" as const,
    },
  ];

  const recs = await Promise.all([
    prisma.reconciliation.create({
      data: {
        userId: user1.id,
        serviceId: electricite.id,
        totalSupplier: 5000,
        totalSystem: 4920,
        difference: 80,
        discrepancies: demoDiscrepancies,
      },
    }),
    prisma.reconciliation.create({
      data: {
        userId: user1.id,
        serviceId: eau.id,
        totalSupplier: 2100,
        totalSystem: 2100,
        difference: 0,
        discrepancies: [],
      },
    }),
    prisma.reconciliation.create({
      data: {
        userId: user2.id,
        serviceId: telephonie.id,
        totalSupplier: 980,
        totalSystem: 900,
        difference: 80,
        discrepancies: [demoDiscrepancies[0]],
      },
    }),
    prisma.reconciliation.create({
      data: {
        userId: admin.id,
        serviceId: electricite.id,
        totalSupplier: 12000,
        totalSystem: 11800,
        difference: 200,
        discrepancies: demoDiscrepancies,
      },
    }),
    prisma.reconciliation.create({
      data: {
        userId: admin.id,
        serviceId: telephonie.id,
        totalSupplier: 3400,
        totalSystem: 3400,
        difference: 0,
        discrepancies: [],
      },
    }),
  ]);

  const auditTemplates: {
    userId: string;
    action: AuditAction;
    details: object;
  }[] =
    [
      { userId: admin.id, action: "LOGIN", details: { demo: true } },
      { userId: admin.id, action: "SERVICE_CREATED", details: { name: "Électricité" } },
      { userId: admin.id, action: "USER_CREATED", details: { username: "user1" } },
      { userId: user1.id, action: "LOGIN", details: { demo: true } },
      { userId: user1.id, action: "LOGOUT", details: {} },
      { userId: admin.id, action: "USER_UPDATED", details: { target: "user2" } },
      { userId: user2.id, action: "LOGIN", details: { demo: true } },
      { userId: admin.id, action: "SERVICE_UPDATED", details: { name: "Eau" } },
      { userId: admin.id, action: "LOGOUT", details: {} },
      { userId: user1.id, action: "LOGIN", details: { second: true } },
    ];

  for (let i = 0; i < auditTemplates.length; i++) {
    const t = auditTemplates[i];
    await prisma.auditLog.create({
      data: {
        userId: t.userId,
        action: t.action,
        details: t.details,
        createdAt: new Date(Date.now() - (10 - i) * 3600_000),
      },
    });
  }

  console.log("Seed OK", {
    services: [electricite.name, eau.name, telephonie.name],
    users: [admin.username, user1.username, user2.username],
    reconciliations: recs.length,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
