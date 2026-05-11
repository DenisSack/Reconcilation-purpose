import { auth } from "@/lib/auth";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col bg-muted/30 md:flex-row">
      <DashboardSidebar
        username={session.user.name}
        role={session.user.role}
        canAccessStatus={session.user.canAccessStatus}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
        <DashboardHeader displayName={session.user.name} />
        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
