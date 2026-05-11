import Link from "next/link";
import { auth } from "@/lib/auth";
import { getServicesForUser } from "@/lib/data/services";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ReconciliationIndexPage() {
  const session = await auth();
  if (!session?.user) return null;

  const services = await getServicesForUser(
    session.user.id,
    session.user.role,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Réconciliation</h1>
        <p className="text-sm text-muted-foreground">
          Choisissez un service pour comparer les fichiers fournisseur et système.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle>{s.name}</CardTitle>
              <CardDescription>
                {s.description ?? "Comparer les rapports"}
              </CardDescription>
            </CardHeader>
            <CardContent />
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={`/dashboard/reconciliation/${s.id}`}>
                  Lancer la réconciliation
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
