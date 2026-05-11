import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary px-4 py-10">
      <div className="mb-10 text-center text-text-on-primary">
        <h1 className="text-4xl font-bold tracking-tight">
          Luna<span className="text-gold">.</span>
        </h1>
        <p className="mt-2 text-sm text-white/80">Réconciliation Financière</p>
      </div>
      <LoginForm />
      <div className="mt-8 w-full max-w-md rounded-lg border border-white/10 bg-white/5 p-4 text-xs text-white/70">
        <p className="mb-2 font-medium text-white/90">Comptes de démo</p>
        <ul className="space-y-1">
          <li>
            <span className="text-white">admin</span> / admin123 — Administrateur
          </li>
          <li>
            <span className="text-white">user1</span> / user123 — Utilisateur
          </li>
          <li>
            <span className="text-white">user2</span> / user123 — Utilisateur
          </li>
        </ul>
      </div>
    </div>
  );
}
