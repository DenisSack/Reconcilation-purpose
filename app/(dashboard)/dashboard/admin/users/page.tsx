import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/db-types";
import { UsersAdmin, type UserRow } from "@/components/admin/users-admin";

type UserFromDb = {
  id: string;
  username: string;
  role: Role;
  canAccessStatus: boolean;
  services: { service: { id: string; name: string } }[];
  _count: { reconciliations: number };
};

export default async function AdminUsersPage() {
  const [users, services] = await Promise.all([
    prisma.user.findMany({
      include: {
        services: { include: { service: true } },
        _count: { select: { reconciliations: true } },
      },
      orderBy: { username: "asc" },
    }),
    prisma.service.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rows: UserRow[] = (users as UserFromDb[]).map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    canAccessStatus: u.canAccessStatus,
    services: u.services.map((us) => ({
      id: us.service.id,
      name: us.service.name,
    })),
    reconCount: u._count.reconciliations,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Utilisateurs
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestion des comptes et des droits d’accès.
        </p>
      </div>
      <UsersAdmin users={rows} services={services} />
    </div>
  );
}
