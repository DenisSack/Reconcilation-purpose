"use client";

import { Fragment, useState } from "react";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProblemType } from "@/lib/validations";
import {
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useEffect } from "react";
import { usePreferencesStore } from "@/stores/preferences-store";

export type HistoryRow = {
  id: string;
  userId: string;
  username: string;
  serviceId: string;
  serviceName: string;
  supplierCount: number;
  systemCount: number;
  totalSupplier: number;
  totalSystem: number;
  difference: number;
  createdAt: string;
  discrepancyCount: number;
  discrepancies: unknown;
};

function problemVariant(
  p: ProblemType,
): "destructive" | "warning" | "secondary" {
  if (p === "Manquant fournisseur") return "destructive";
  if (p === "Manquant système") return "warning";
  return "secondary";
}

type Props = {
  rows: HistoryRow[];
  isAdmin: boolean;
  page: number;
  totalPages: number;
};

export function HistoryTable({ rows, isAdmin, page, totalPages }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { language, initFromStorage } = usePreferencesStore();
  const isEn = language === "en";
  const locale = isEn ? "en-US" : "fr-FR";
  const money = (v: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "XAF",
      minimumFractionDigits: 2,
    }).format(v);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && <TableHead>{isEn ? "User" : "Utilisateur"}</TableHead>}
              <TableHead>{isEn ? "Service" : "Service"}</TableHead>
              <TableHead>{isEn ? "Date / Time" : "Date / heure"}</TableHead>
              <TableHead>{isEn ? "Supplier tx" : "Tx fournisseur"}</TableHead>
              <TableHead>{isEn ? "System tx" : "Tx système"}</TableHead>
              <TableHead>{isEn ? "Supplier Total" : "Total Fournisseur"}</TableHead>
              <TableHead>{isEn ? "System Total" : "Total Système"}</TableHead>
              <TableHead>{isEn ? "Diff count" : "Nb écarts"}</TableHead>
              <TableHead className="w-[140px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const expanded = openId === r.id;
              const discList = Array.isArray(r.discrepancies)
                ? (r.discrepancies as {
                    reference: string;
                    supplierAmount: number | null;
                    systemAmount: number | null;
                    difference: number;
                    problem: ProblemType;
                  }[])
                : [];
              return (
                <Fragment key={r.id}>
                  <TableRow>
                    {isAdmin && (
                      <TableCell className="font-medium">{r.username}</TableCell>
                    )}
                    <TableCell>{r.serviceName}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(r.createdAt), "dd/MM/yyyy HH:mm", {
                        locale: isEn ? enUS : fr,
                      })}
                    </TableCell>
                    <TableCell>{r.supplierCount}</TableCell>
                    <TableCell>{r.systemCount}</TableCell>
                    <TableCell>
                      {money(r.totalSupplier)}
                    </TableCell>
                    <TableCell>
                      {money(r.totalSystem)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.discrepancyCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() =>
                          setOpenId(expanded ? null : r.id)
                        }
                      >
                        {expanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        {isEn ? "View details" : "Voir détails"}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expanded && (
                    <TableRow>
                      <TableCell
                        colSpan={isAdmin ? 9 : 8}
                        className="bg-muted/40 p-0"
                      >
                        <div className="p-4">
                          {discList.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Aucun écart enregistré pour cette réconciliation.
                            </p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>#</TableHead>
                                  <TableHead>{isEn ? "Reference" : "Référence"}</TableHead>
                                  <TableHead>{isEn ? "Supplier Amount" : "Montant Fournisseur"}</TableHead>
                                  <TableHead>{isEn ? "System Amount" : "Montant Système"}</TableHead>
                                  <TableHead>{isEn ? "Difference" : "Écart"}</TableHead>
                                  <TableHead>{isEn ? "Issue" : "Problème"}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {discList.map((d, idx) => (
                                  <TableRow key={`${r.id}-d-${idx}`}>
                                    <TableCell>{idx + 1}</TableCell>
                                    <TableCell className="font-medium">
                                      {d.reference}
                                    </TableCell>
                                    <TableCell>
                                      {d.supplierAmount !== null ? money(d.supplierAmount) : "—"}
                                    </TableCell>
                                    <TableCell>
                                      {d.systemAmount !== null ? money(d.systemAmount) : "—"}
                                    </TableCell>
                                    <TableCell>
                                      {money(d.difference)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={problemVariant(d.problem)}>
                                        {d.problem}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {isEn ? "Page" : "Page"} {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Button variant="outline" size="sm" asChild>
              <a href={`?page=${page - 1}`}>{isEn ? "Previous" : "Précédent"}</a>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              {isEn ? "Previous" : "Précédent"}
            </Button>
          )}
          {page < totalPages ? (
            <Button variant="outline" size="sm" asChild>
              <a href={`?page=${page + 1}`}>{isEn ? "Next" : "Suivant"}</a>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              {isEn ? "Next" : "Suivant"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
