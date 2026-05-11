import type { Role, Service } from "@/lib/db-types";
import { prisma } from "@/lib/prisma";

export async function getServicesForUser(
  userId: string,
  role: Role,
): Promise<Service[]> {
  if (role === "ADMIN") {
    return prisma.service.findMany({
      orderBy: { name: "asc" },
    }) as Promise<Service[]>;
  }

  return prisma.service.findMany({
    where: {
      users: {
        some: { userId },
      },
    },
    orderBy: { name: "asc" },
  }) as Promise<Service[]>;
}

export async function assertServiceAccess(
  userId: string,
  role: Role,
  serviceId: string,
): Promise<Service | null> {
  if (role === "ADMIN") {
    const s = await prisma.service.findUnique({ where: { id: serviceId } });
    return s as Service | null;
  }

  return prisma.service.findFirst({
    where: {
      id: serviceId,
      users: { some: { userId } },
    },
  }) as Promise<Service | null>;
}
