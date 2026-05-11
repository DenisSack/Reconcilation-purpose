"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
  type MappingKey,
  useReconciliationStore,
} from "@/stores/reconciliation-store";
import { usePreferencesStore } from "@/stores/preferences-store";

const applyGuess = (
  side: "supplier" | "system",
  guess: Record<MappingKey, string>,
) => {
  useReconciliationStore.setState((s) => {
    const base =
      side === "supplier" ? s.supplierMapping : s.systemMapping;
    const next = { ...base };
    (Object.keys(guess) as MappingKey[]).forEach((k) => {
      if (guess[k]) next[k] = guess[k];
    });
    return side === "supplier"
      ? { supplierMapping: next }
      : { systemMapping: next };
  });
};
import { CheckCircle2, FileSpreadsheet, Trash2, Upload } from "lucide-react";

const ACCEPT = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "application/vnd.ms-excel": [".xls"],
  "text/csv": [".csv"],
};

const MAPPING_FIELDS: { key: MappingKey; label: string; required?: boolean }[] =
  [
    { key: "reference", label: "Référence", required: true },
    { key: "amount", label: "Montant", required: true },
    { key: "date", label: "Date" },
    { key: "status", label: "Statut" },
    { key: "description", label: "Description" },
  ];

function formatBytes(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

function parseWorkbook(ab: ArrayBuffer) {
  const wb = XLSX.read(ab, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: true,
  });
  if (!matrix.length) {
    return { headers: [] as string[], rows: [] as Record<string, string>[] };
  }

  const headerIndex = matrix.findIndex((row) =>
    row.some((cell) => String(cell ?? "").trim() !== ""),
  );
  if (headerIndex < 0) {
    return { headers: [] as string[], rows: [] as Record<string, string>[] };
  }
  const headerRow = matrix[headerIndex] ?? [];
  const headers = headerRow.map((h, i) => {
    const v = String(h ?? "").trim();
    return v || `Colonne ${i + 1}`;
  });

  const normalized = matrix.slice(headerIndex + 1).map((row, offset) => {
    const mapped = Object.fromEntries(
      headers.map((h, idx) => [h, String(row[idx] ?? "").trim()]),
    ) as Record<string, string>;
    mapped.__rowNumber = String(headerIndex + 2 + offset);
    return mapped;
  });
  return { headers, rows: normalized };
}

function parseIntervals(spec: string): Array<[number, number]> | null {
  const raw = spec.trim();
  if (!raw) return [];
  const ranges: Array<[number, number]> = [];
  const parts = raw.split(",").map((x) => x.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((x) => Number.parseInt(x.trim(), 10));
      if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0 || a > b) {
        return null;
      }
      ranges.push([a, b]);
    } else {
      const n = Number.parseInt(part, 10);
      if (!Number.isInteger(n) || n <= 0) return null;
      ranges.push([n, n]);
    }
  }
  return ranges;
}

function inIntervals(rowNumber: number, spec: string) {
  const ranges = parseIntervals(spec);
  if (ranges === null) return false;
  if (!ranges.length) return true;
  return ranges.some(([a, b]) => rowNumber >= a && rowNumber <= b);
}

function guessColumn(headers: string[], key: MappingKey): string {
  const lower = headers.map((x) => x.toLowerCase());
  const pick = (patterns: string[]) => {
    const idx = lower.findIndex((col) =>
      patterns.some((p) => col.includes(p)),
    );
    return idx >= 0 ? headers[idx]! : "";
  };

  switch (key) {
    case "reference":
      return pick(["ref", "réf", "reference", "id", "numero", "n°", "facture"]);
    case "amount":
      return pick(["montant", "amount", "total", "somme", "prix"]);
    case "date":
      return pick(["date"]);
    case "status":
      return pick(["statut", "status", "etat"]);
    case "description":
      return pick(["desc", "libelle", "label", "detail", "motif"]);
    default:
      return "";
  }
}

function buildGuess(headers: string[]): Record<MappingKey, string> {
  return {
    reference: guessColumn(headers, "reference"),
    amount: guessColumn(headers, "amount"),
    date: guessColumn(headers, "date"),
    status: guessColumn(headers, "status"),
    description: guessColumn(headers, "description"),
  };
}

function parseAmount(raw: string) {
  const s = raw.replace(/\s/g, "").replace(",", ".");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export type DiscrepancyRow = {
  reference: string;
  supplierAmount: number | null;
  systemAmount: number | null;
  difference: number;
  problem: ProblemType;
};

function runReconcile(
  supplierRows: Record<string, string>[],
  systemRows: Record<string, string>[],
  supplierMap: Record<MappingKey, string>,
  systemMap: Record<MappingKey, string>,
  supplierIntervals: Record<MappingKey, string>,
  systemIntervals: Record<MappingKey, string>,
): {
  supplierCount: number;
  systemCount: number;
  totalSupplier: number;
  totalSystem: number;
  discrepancies: DiscrepancyRow[];
} {
  const sRef = supplierMap.reference;
  const sAmt = supplierMap.amount;
  const yRef = systemMap.reference;
  const yAmt = systemMap.amount;

  const supplierByRef = new Map<string, Record<string, string>>();
  let supplierCount = 0;
  let totalSupplier = 0;
  for (const row of supplierRows) {
    const rowNumber = Number.parseInt(row.__rowNumber ?? "0", 10);
    const ref = inIntervals(rowNumber, supplierIntervals.reference)
      ? (row[sRef] ?? "").trim()
      : "";
    if (!ref) continue;
    supplierCount += 1;
    supplierByRef.set(ref, row);
    totalSupplier += inIntervals(rowNumber, supplierIntervals.amount)
      ? parseAmount(row[sAmt] ?? "0")
      : 0;
  }

  const systemByRef = new Map<string, Record<string, string>>();
  let systemCount = 0;
  let totalSystem = 0;
  for (const row of systemRows) {
    const rowNumber = Number.parseInt(row.__rowNumber ?? "0", 10);
    const ref = inIntervals(rowNumber, systemIntervals.reference)
      ? (row[yRef] ?? "").trim()
      : "";
    if (!ref) continue;
    systemCount += 1;
    systemByRef.set(ref, row);
    totalSystem += inIntervals(rowNumber, systemIntervals.amount)
      ? parseAmount(row[yAmt] ?? "0")
      : 0;
  }

  const discrepancies: DiscrepancyRow[] = [];
  const allRefs = new Set<string>([
    ...Array.from(supplierByRef.keys()),
    ...Array.from(systemByRef.keys()),
  ]);

  for (const ref of allRefs) {
    const sRow = supplierByRef.get(ref);
    const yRow = systemByRef.get(ref);
    const sa =
      sRow &&
      inIntervals(Number.parseInt(sRow.__rowNumber ?? "0", 10), supplierIntervals.amount)
        ? parseAmount(sRow[sAmt] ?? "0")
        : null;
    const ya =
      yRow &&
      inIntervals(Number.parseInt(yRow.__rowNumber ?? "0", 10), systemIntervals.amount)
        ? parseAmount(yRow[yAmt] ?? "0")
        : null;

    if (sRow && !yRow) {
      discrepancies.push({
        reference: ref,
        supplierAmount: sa,
        systemAmount: null,
        difference: sa ?? 0,
        problem: "Manquant système",
      });
      continue;
    }
    if (!sRow && yRow) {
      discrepancies.push({
        reference: ref,
        supplierAmount: null,
        systemAmount: ya,
        difference: ya ?? 0,
        problem: "Manquant fournisseur",
      });
      continue;
    }
    if (sRow && yRow) {
      const diff = Math.abs((sa ?? 0) - (ya ?? 0));
      if (diff > 0.01) {
        discrepancies.push({
          reference: ref,
          supplierAmount: sa,
          systemAmount: ya,
          difference: (sa ?? 0) - (ya ?? 0),
          problem: "Montants différents",
        });
      }
    }
  }

  discrepancies.sort((a, b) => a.reference.localeCompare(b.reference));

  return {
    supplierCount,
    systemCount,
    totalSupplier,
    totalSystem,
    discrepancies,
  };
}

function problemBadgeVariant(
  p: ProblemType,
): "destructive" | "warning" | "secondary" {
  if (p === "Manquant fournisseur") return "destructive";
  if (p === "Manquant système") return "warning";
  return "secondary";
}

type Props = { serviceId: string; serviceName: string };

export function ReconciliationWizard({ serviceId, serviceName }: Props) {
  const router = useRouter();
  const { language, initFromStorage } = usePreferencesStore();
  const {
    step,
    supplierFile,
    systemFile,
    supplierHeaders,
    systemHeaders,
    supplierMapping,
    systemMapping,
    reset,
    setStep,
    setSupplierFile,
    setSystemFile,
    setHeaders,
    setMapping,
  } = useReconciliationStore();

  const [supplierRows, setSupplierRows] = useState<Record<string, string>[]>(
    [],
  );
  const [systemRows, setSystemRows] = useState<Record<string, string>[]>([]);
  const [supplierIntervals, setSupplierIntervals] = useState<Record<MappingKey, string>>({
    reference: "",
    amount: "",
    date: "",
    status: "",
    description: "",
  });
  const [systemIntervals, setSystemIntervals] = useState<Record<MappingKey, string>>({
    reference: "",
    amount: "",
    date: "",
    status: "",
    description: "",
  });
  const [results, setResults] = useState<{
    supplierCount: number;
    systemCount: number;
    totalSupplier: number;
    totalSystem: number;
    discrepancies: DiscrepancyRow[];
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    reset();
  }, [serviceId, reset]);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  const onSupplierDrop = useCallback(
    async (files: File[]) => {
      const f = files[0];
      if (!f) return;
      const ab = await f.arrayBuffer();
      setSupplierFile({ name: f.name, size: f.size, arrayBuffer: ab });
      const { headers, rows } = parseWorkbook(ab);
      setHeaders("supplier", headers);
      setSupplierRows(rows);
      applyGuess("supplier", buildGuess(headers));
    },
    [setSupplierFile, setHeaders],
  );

  const onSystemDrop = useCallback(
    async (files: File[]) => {
      const f = files[0];
      if (!f) return;
      const ab = await f.arrayBuffer();
      setSystemFile({ name: f.name, size: f.size, arrayBuffer: ab });
      const { headers, rows } = parseWorkbook(ab);
      setHeaders("system", headers);
      setSystemRows(rows);
      applyGuess("system", buildGuess(headers));
    },
    [setSystemFile, setHeaders],
  );

  const supplierDrop = useDropzone({
    onDrop: onSupplierDrop,
    accept: ACCEPT,
    maxFiles: 1,
    multiple: false,
  });

  const systemDrop = useDropzone({
    onDrop: onSystemDrop,
    accept: ACCEPT,
    maxFiles: 1,
    multiple: false,
  });

  const canProceedStep1 = Boolean(supplierFile && systemFile);
  const mappingValid = useMemo(() => {
    return (
      supplierMapping.reference &&
      supplierMapping.amount &&
      systemMapping.reference &&
      systemMapping.amount
    );
  }, [supplierMapping, systemMapping]);
  const intervalsValid = useMemo(() => {
    const all = [...Object.values(supplierIntervals), ...Object.values(systemIntervals)];
    return all.every((x) => parseIntervals(x) !== null);
  }, [supplierIntervals, systemIntervals]);

  const locale = language === "en" ? "en-US" : "fr-FR";
  const isEn = language === "en";
  const formatMoney = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "XAF",
      minimumFractionDigits: 2,
    }).format(value);

  const goResults = () => {
    if (!mappingValid) return;
    const r = runReconcile(
      supplierRows,
      systemRows,
      supplierMapping,
      systemMapping,
      supplierIntervals,
      systemIntervals,
    );
    setResults(r);
    setStep(3);
    void persist(r);
  };

  const persist = async (r: {
    supplierCount: number;
    systemCount: number;
    totalSupplier: number;
    totalSystem: number;
    discrepancies: DiscrepancyRow[];
  }) => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/reconciliations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          supplierCount: r.supplierCount,
          systemCount: r.systemCount,
          totalSupplier: r.totalSupplier,
          totalSystem: r.totalSystem,
          difference: r.totalSupplier - r.totalSystem,
          discrepancies: r.discrepancies,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setSaveError(typeof j.error === "string" ? j.error : "Échec de la sauvegarde");
      }
    } catch {
      setSaveError("Erreur réseau");
    } finally {
      setSaving(false);
      router.refresh();
    }
  };

  const clearSupplier = () => {
    setSupplierFile(null);
    setHeaders("supplier", []);
    setSupplierRows([]);
    MAPPING_FIELDS.forEach((f) => setMapping("supplier", f.key, ""));
    setSupplierIntervals({
      reference: "",
      amount: "",
      date: "",
      status: "",
      description: "",
    });
  };

  const clearSystem = () => {
    setSystemFile(null);
    setHeaders("system", []);
    setSystemRows([]);
    MAPPING_FIELDS.forEach((f) => setMapping("system", f.key, ""));
    setSystemIntervals({
      reference: "",
      amount: "",
      date: "",
      status: "",
      description: "",
    });
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {isEn ? "Reconciliation" : "Réconciliation"} — {serviceName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEn
            ? "Upload files, map columns, then review discrepancies."
            : "Importez les fichiers, mappez les colonnes, puis consultez les écarts."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((n) => (
          <Badge
            key={n}
            variant={step === n ? "default" : "outline"}
            className="rounded-full px-3"
          >
            {isEn ? `Step ${n}` : `Étape ${n}`}
          </Badge>
        ))}
      </div>

      {step === 1 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-primary/20 bg-blue-50/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Rapport Fournisseur
              </CardTitle>
              <CardDescription>
                Glissez un fichier Excel ou CSV
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!supplierFile ? (
                <div
                  {...supplierDrop.getRootProps()}
                  className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/40 bg-white/60 p-6 text-center transition hover:border-primary"
                >
                  <input {...supplierDrop.getInputProps()} />
                  <Upload className="mb-2 h-8 w-8 text-primary" />
                  <p className="text-sm font-medium text-primary">
                    Déposer le fichier ici
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    .xlsx, .xls, .csv
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border bg-white p-4">
                  <div>
                    <p className="font-medium">{supplierFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(supplierFile.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearSupplier}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-blue-50/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Rapport Système
              </CardTitle>
              <CardDescription>
                Glissez un fichier Excel ou CSV
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!systemFile ? (
                <div
                  {...systemDrop.getRootProps()}
                  className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/40 bg-white/60 p-6 text-center transition hover:border-primary"
                >
                  <input {...systemDrop.getInputProps()} />
                  <Upload className="mb-2 h-8 w-8 text-primary" />
                  <p className="text-sm font-medium text-primary">
                    Déposer le fichier ici
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    .xlsx, .xls, .csv
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border bg-white p-4">
                  <div>
                    <p className="font-medium">{systemFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(systemFile.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearSystem}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 md:col-span-2">
              <Button variant="outline" onClick={() => router.push("/dashboard/services")}>
              {isEn ? "Back" : "Retour"}
            </Button>
            <Button
              disabled={!canProceedStep1}
              onClick={() => setStep(2)}
            >
              {isEn ? "Continue" : "Continuer"}
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {(["supplier", "system"] as const).map((side) => {
              const headers = side === "supplier" ? supplierHeaders : systemHeaders;
              const mapping = side === "supplier" ? supplierMapping : systemMapping;
              const intervals = side === "supplier" ? supplierIntervals : systemIntervals;
              const title =
                side === "supplier" ? "Fournisseur" : "Système";
              return (
                <Card key={side}>
                  <CardHeader>
                    <CardTitle>{isEn ? "Mapping" : "Mapping"} — {title}</CardTitle>
                    <CardDescription>
                      {isEn
                        ? "Map file columns to Luna fields"
                        : "Associez les colonnes du fichier aux champs Luna"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {MAPPING_FIELDS.map((field) => (
                      <div
                        key={field.key}
                        className="grid gap-2 sm:grid-cols-[1fr_220px_220px] sm:items-center"
                      >
                        <span className="text-sm">
                          {field.label}
                          {field.required ? (
                            <span className="text-destructive"> *</span>
                          ) : null}
                        </span>
                        <Select
                          value={mapping[field.key] || "__none__"}
                          onValueChange={(v) =>
                            setMapping(side, field.key, v === "__none__" ? "" : v)
                          }
                        >
                          <SelectTrigger className="sm:w-[220px]">
                            <SelectValue placeholder="Colonne…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">—</SelectItem>
                            {headers.map((h) => (
                              <SelectItem key={h} value={h}>
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={intervals[field.key]}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (side === "supplier") {
                              setSupplierIntervals((prev) => ({ ...prev, [field.key]: value }));
                            } else {
                              setSystemIntervals((prev) => ({ ...prev, [field.key]: value }));
                            }
                          }}
                          placeholder="Lignes: 4-56,64-130"
                        />
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      {isEn
                        ? "Row intervals per column (optional): e.g. 4-56,64-130. Leave empty to use all rows."
                        : "Intervalles de lignes par colonne (optionnel): ex. 4-56,64-130. Videz le champ pour utiliser toutes les lignes."}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {!intervalsValid && (
            <Alert variant="destructive">
              <AlertTitle>{isEn ? "Invalid intervals" : "Intervalles invalides"}</AlertTitle>
              <AlertDescription>
                {isEn
                  ? "Use format 4-56,64-130 or 12,18,27."
                  : "Utilisez le format 4-56,64-130 ou 12,18,27."}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              {isEn ? "Back" : "Retour"}
            </Button>
            <Button disabled={!mappingValid || !intervalsValid} onClick={goResults}>
              {isEn ? "Run comparison" : "Lancer la comparaison"}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && results && (
        <div className="flex flex-col gap-6">
          {saveError && (
            <Alert variant="destructive">
              <AlertTitle>Sauvegarde</AlertTitle>
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  {isEn ? "Supplier transactions" : "Transactions fournisseur"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{results.supplierCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  {isEn ? "System transactions" : "Transactions système"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{results.systemCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Total Fournisseur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  {formatMoney(results.totalSupplier)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Total Système
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  {formatMoney(results.totalSystem)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Différence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-2xl font-bold ${
                    Math.abs(results.totalSupplier - results.totalSystem) < 0.01
                      ? "text-emerald-600"
                      : "text-destructive"
                  }`}
                >
                  {formatMoney(results.totalSupplier - results.totalSystem)}
                </p>
              </CardContent>
            </Card>
          </div>

          {results.discrepancies.length === 0 ? (
            <Alert variant="success" className="border-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Réconciliation parfaite</AlertTitle>
              <AlertDescription>
                Aucun écart détecté entre les deux fichiers.
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Écarts ({results.discrepancies.length})</CardTitle>
                <CardDescription>
                  Détail des lignes en anomalie
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Référence</TableHead>
                      <TableHead>Montant Fournisseur</TableHead>
                      <TableHead>Montant Système</TableHead>
                      <TableHead>Écart</TableHead>
                      <TableHead>Problème</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.discrepancies.map((d, i) => (
                      <TableRow key={`${d.reference}-${i}`}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{d.reference}</TableCell>
                        <TableCell>
                          {d.supplierAmount !== null ? formatMoney(d.supplierAmount) : "—"}
                        </TableCell>
                        <TableCell>
                          {d.systemAmount !== null ? formatMoney(d.systemAmount) : "—"}
                        </TableCell>
                        <TableCell>
                          {formatMoney(d.difference)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={problemBadgeVariant(d.problem)}>
                            {d.problem}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {saving ? "Sauvegarde en cours…" : "Résultat enregistré dans l’historique."}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Retour au mapping
              </Button>
              <Button onClick={() => router.push("/dashboard/history")}>
                Voir l’historique
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
