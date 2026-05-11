import { prisma } from "@/lib/prisma";
import { ServicesAdmin } from "@/components/admin/services-admin";

export default async function AdminServicesPage() {
  const services = await prisma.service.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
        <p className="text-sm text-muted-foreground">
          CRUD des services disponibles pour la réconciliation.
        </p>
      </div>
      <ServicesAdmin services={services} />
    </div>
  );
}
