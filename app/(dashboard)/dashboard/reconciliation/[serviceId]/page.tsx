import { auth } from "@/lib/auth";
import { assertServiceAccess } from "@/lib/data/services";
import { ReconciliationWizard } from "@/components/reconciliation/reconciliation-wizard";
import { notFound, redirect } from "next/navigation";

type Props = { params: { serviceId: string } };

export default async function ReconciliationServicePage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const service = await assertServiceAccess(
    session.user.id,
    session.user.role,
    params.serviceId,
  );

  if (!service) notFound();

  return (
    <ReconciliationWizard serviceId={service.id} serviceName={service.name} />
  );
}
