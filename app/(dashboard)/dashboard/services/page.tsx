import { auth } from "@/lib/auth";
import { getServicesForUser } from "@/lib/data/services";
import { ServicesGrid } from "@/components/services/services-grid";

export default async function ServicesPage() {
  const session = await auth();
  if (!session?.user) return null;

  const services = await getServicesForUser(
    session.user.id,
    session.user.role,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Services disponibles
        </h1>
        <p className="text-sm text-muted-foreground">
          Sélectionnez un service pour lancer une réconciliation.
        </p>
      </div>
      <ServicesGrid
        services={services}
        isAdmin={session.user.role === "ADMIN"}
      />
    </div>
  );
}
