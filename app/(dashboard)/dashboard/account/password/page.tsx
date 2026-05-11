import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/account/change-password-form";

export default async function PasswordPage({
  searchParams,
}: {
  searchParams: { required?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Changer le mot de passe</h1>
        <p className="text-sm text-muted-foreground">
          Mettez a jour votre mot de passe pour securiser votre compte.
        </p>
      </div>
      <ChangePasswordForm required={searchParams.required === "1"} />
    </div>
  );
}
