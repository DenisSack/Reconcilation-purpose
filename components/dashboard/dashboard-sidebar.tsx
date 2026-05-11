"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/db-types";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import {
  Building2,
  KeyRound,
  ChevronDown,
  GitCompareArrows,
  History,
  LayoutGrid,
  RefreshCw,
  ScrollText,
  Shield,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { usePreferencesStore } from "@/stores/preferences-store";

type Props = {
  username: string | null | undefined;
  role: Role;
  canAccessStatus: boolean;
};

const nav = [
  { href: "/dashboard/services", label: "Services", icon: LayoutGrid },
  {
    href: "/dashboard/reconciliation",
    label: "Réconciliation",
    icon: GitCompareArrows,
  },
  {
    href: "/dashboard/status",
    label: "Status Update",
    icon: RefreshCw,
    requiresStatus: true,
  },
  { href: "/dashboard/history", label: "Historique", icon: History },
  { href: "/dashboard/account/password", label: "Mot de passe", icon: KeyRound },
];

export function DashboardSidebar({ username, role, canAccessStatus }: Props) {
  const pathname = usePathname();
  const [adminOpen, setAdminOpen] = useState(
    pathname.startsWith("/dashboard/admin"),
  );
  const { language, initFromStorage } = usePreferencesStore();
  const isEn = language === "en";

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  const linkClass = (href: string) => {
    const active =
      pathname === href || pathname.startsWith(`${href}/`);
    return cn(
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-text-on-primary transition-colors hover:bg-white/10",
      active &&
        "border-l-[3px] border-gold bg-white/[0.15] pl-[9px] hover:bg-white/15",
      !active && "border-l-[3px] border-transparent",
    );
  };

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-white/10 bg-primary md:h-screen md:w-[240px] md:border-b-0 md:border-r">
      <div className="flex items-center gap-2 px-4 py-6">
        <Link href="/dashboard/services" className="text-xl font-bold tracking-tight text-text-on-primary">
          Luna<span className="text-gold">.</span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2">
        {nav
          .filter((item) => !item.requiresStatus || canAccessStatus)
          .map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={linkClass(item.href)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {isEn
                  ? item.href.includes("/services")
                    ? "Services"
                    : item.href.includes("/reconciliation")
                      ? "Reconciliation"
                      : item.href.includes("/status")
                        ? "Status Update"
                        : item.href.includes("/history")
                          ? "History"
                          : "Password"
                  : item.label}
              </Link>
            );
          })}

        {role === "ADMIN" && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setAdminOpen((o) => !o)}
              className="mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold text-text-on-primary hover:bg-white/10"
            >
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {isEn ? "Admin Panel" : "Panel Admin"}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  adminOpen && "rotate-180",
                )}
              />
            </button>
            {adminOpen && (
              <div className="ml-2 flex flex-col gap-1 border-l border-white/10 pl-2">
                <Link
                  href="/dashboard/admin/users"
                  className={linkClass("/dashboard/admin/users")}
                >
                  <Users className="h-4 w-4" />
                  {isEn ? "Users" : "Utilisateurs"}
                </Link>
                <Link
                  href="/dashboard/admin/services"
                  className={linkClass("/dashboard/admin/services")}
                >
                  <Building2 className="h-4 w-4" />
                  {isEn ? "Services" : "Services"}
                </Link>
                <Link
                  href="/dashboard/admin/audit"
                  className={linkClass("/dashboard/admin/audit")}
                >
                  <ScrollText className="h-4 w-4" />
                  {isEn ? "Audit" : "Audit"}
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="mt-auto border-t border-white/10 p-3">
        <div className="mb-3 flex items-center gap-2 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-text-on-primary">
            {(username ?? "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-on-primary">
              {username}
            </p>
            <p className="text-xs text-white/70">
              {isEn
                ? role === "ADMIN"
                  ? "Administrator"
                  : "User"
                : role === "ADMIN"
                  ? "Administrateur"
                  : "Utilisateur"}
            </p>
          </div>
        </div>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="secondary"
            className="w-full bg-white/10 text-text-on-primary hover:bg-white/20"
          >
            {isEn ? "Sign out" : "Déconnexion"}
          </Button>
        </form>
      </div>
    </aside>
  );
}
