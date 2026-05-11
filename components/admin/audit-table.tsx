"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AUDIT_ACTIONS, type AuditAction } from "@/lib/db-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  LogIn,
  LogOut,
  Pencil,
  Trash2,
  UserMinus,
  UserPen,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export type AuditRow = {
  id: string;
  createdAt: string;
  username: string;
  userId: string;
  action: AuditAction;
  details: unknown;
};

const ACTIONS = AUDIT_ACTIONS;

function ActionIcon({ action }: { action: AuditAction }) {
  const common = "h-4 w-4";
  switch (action) {
    case "LOGIN":
      return <LogIn className={`${common} text-emerald-600`} />;
    case "LOGOUT":
      return <LogOut className={`${common} text-slate-500`} />;
    case "USER_CREATED":
      return <UserPlus className={`${common} text-primary`} />;
    case "USER_UPDATED":
      return <UserPen className={`${common} text-gold`} />;
    case "USER_DELETED":
      return <UserMinus className={`${common} text-destructive`} />;
    case "SERVICE_CREATED":
      return <Building2 className={`${common} text-primary`} />;
    case "SERVICE_UPDATED":
      return <Pencil className={`${common} text-gold`} />;
    case "SERVICE_DELETED":
      return <Trash2 className={`${common} text-destructive`} />;
    default:
      return null;
  }
}

function actionBadge(action: AuditAction) {
  if (action === "LOGIN") return { variant: "success" as const, label: action };
  if (action === "LOGOUT") return { variant: "secondary" as const, label: action };
  if (action.startsWith("USER")) return { variant: "outline" as const, label: action };
  return { variant: "outline" as const, label: action };
}

type UserOpt = { id: string; username: string };

type Props = {
  rows: AuditRow[];
  users: UserOpt[];
  filters: { action?: string; userId?: string };
};

export function AuditTable({ rows, users, filters }: Props) {
  const router = useRouter();

  const userLabel = useMemo(() => {
    const map = new Map(users.map((u) => [u.id, u.username]));
    return map;
  }, [users]);

  const pushQuery = (next: { action?: string; userId?: string }) => {
    const params = new URLSearchParams();
    if (next.action) params.set("action", next.action);
    if (next.userId) params.set("userId", next.userId);
    const qs = params.toString();
    router.push(qs ? `/dashboard/admin/audit?${qs}` : "/dashboard/admin/audit");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Action</p>
          <Select
            value={filters.action ?? "ALL"}
            onValueChange={(v) =>
              pushQuery({
                action: v === "ALL" ? undefined : v,
                userId: filters.userId,
              })
            }
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes</SelectItem>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Utilisateur</p>
          <Select
            value={filters.userId ?? "ALL"}
            onValueChange={(v) =>
              pushQuery({
                action: filters.action,
                userId: v === "ALL" ? undefined : v,
              })
            }
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" onClick={() => pushQuery({})}>
          Réinitialiser
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Date / heure</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Détails</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const b = actionBadge(r.action);
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <ActionIcon action={r.action} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {format(new Date(r.createdAt), "dd/MM/yyyy HH:mm:ss", {
                      locale: fr,
                    })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {userLabel.get(r.userId) ?? r.username}
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.variant}>{b.label}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[420px] truncate font-mono text-xs">
                    {JSON.stringify(r.details)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
