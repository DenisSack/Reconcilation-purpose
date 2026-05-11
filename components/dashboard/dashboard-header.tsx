"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePreferencesStore } from "@/stores/preferences-store";

const LABELS: Record<string, string> = {
  dashboard: "Tableau de bord",
  services: "Services",
  reconciliation: "Réconciliation",
  status: "Status Update",
  history: "Historique",
  admin: "Admin",
  account: "Compte",
  password: "Mot de passe",
  users: "Utilisateurs",
  audit: "Journal d’audit",
};

function titleCase(segment: string) {
  if (LABELS[segment]) return LABELS[segment];
  if (segment.length <= 8 && !segment.includes("-")) return segment;
  return "Détail";
}

type Props = { displayName: string | null | undefined };

export function DashboardHeader({ displayName }: Props) {
  const pathname = usePathname();
  const { language, setLanguage, initFromStorage } = usePreferencesStore();
  const isEn = language === "en";

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);
  const segments = pathname.split("/").filter(Boolean);

  const enLabel = (seg: string) =>
    ({
      dashboard: "Dashboard",
      services: "Services",
      reconciliation: "Reconciliation",
      status: "Status Update",
      history: "History",
      admin: "Admin",
      account: "Account",
      password: "Password",
      users: "Users",
      audit: "Audit log",
    })[seg] ?? titleCase(seg);
  const crumbs = segments.map((seg, i) => {
    const href = `/${segments.slice(0, i + 1).join("/")}`;
    const label = isEn ? enLabel(seg) : titleCase(seg);
    return { href, label, isLast: i === segments.length - 1 };
  });

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-surface px-4 py-3 md:px-8">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((c, idx) => (
          <Fragment key={c.href}>
            {idx > 0 && (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
            )}
            {c.isLast ? (
              <span className="font-medium text-foreground">{c.label}</span>
            ) : (
              <Link
                href={c.href}
                className="hover:text-foreground hover:underline"
              >
                {c.label}
              </Link>
            )}
          </Fragment>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <Select value={language} onValueChange={(v) => setLanguage(v as "fr" | "en")}>
          <SelectTrigger className="h-8 w-[90px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">Francais</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm font-medium text-foreground">{displayName}</div>
      </div>
    </header>
  );
}
