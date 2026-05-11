"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Upload, Trash2 } from "lucide-react";
import { usePreferencesStore } from "@/stores/preferences-store";

const ACCEPT = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "application/vnd.ms-excel": [".xls"],
  "text/csv": [".csv"],
};

function parseWorkbook(ab: ArrayBuffer) {
  const wb = XLSX.read(ab, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: true,
  });
  if (!matrix.length) return { headers: [] as string[], rows: [] as Record<string, string>[] };
  const headerIndex = matrix.findIndex((row) =>
    row.some((cell) => String(cell ?? "").trim() !== ""),
  );
  if (headerIndex < 0) return { headers: [] as string[], rows: [] as Record<string, string>[] };
  const headers = (matrix[headerIndex] ?? []).map((h, i) => {
    const v = String(h ?? "").trim();
    return v || `Column ${i + 1}`;
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
      if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0 || a > b) return null;
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

function parseReferences(input: string) {
  return input
    .split(/\r?\n|,|;/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function guessRefColumn(headers: string[]) {
  const lower = headers.map((h) => h.toLowerCase());
  const idx = lower.findIndex((c) =>
    ["ref", "réf", "reference", "id", "numero", "facture"].some((p) =>
      c.includes(p),
    ),
  );
  return idx >= 0 ? headers[idx]! : "";
}

export function StatusClient() {
  const { language, initFromStorage } = usePreferencesStore();
  const isEn = language === "en";
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [refCols, setRefCols] = useState<string[]>([""]);
  const [queriesText, setQueriesText] = useState("");
  const [intervalSpec, setIntervalSpec] = useState("");

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  const onDrop = useCallback(async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    const ab = await f.arrayBuffer();
    setFileName(f.name);
    const parsed = parseWorkbook(ab);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setRefCols([guessRefColumn(parsed.headers)]);
    setQueriesText("");
  }, []);

  const dz = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles: 1,
    multiple: false,
  });

  const intervalOk = parseIntervals(intervalSpec) !== null;
  const refs = useMemo(() => parseReferences(queriesText), [queriesText]);
  const filteredRows = useMemo(
    () =>
      rows.filter((r) =>
        inIntervals(Number.parseInt(r.__rowNumber ?? "0", 10), intervalSpec),
      ),
    [rows, intervalSpec],
  );
  const hits = useMemo(() => {
    const activeRefCols = refCols.filter((c) => c);
    if (!activeRefCols.length || !refs.length) return [];
    return refs.map((ref) => ({
      ref,
      match:
        filteredRows
          .map((r) => {
            const matchCol = activeRefCols.find(
              (c) => (r[c] ?? "").toLowerCase() === ref.toLowerCase(),
            );
            return matchCol ? { row: r, column: matchCol } : null;
          })
          .find(Boolean) ?? null,
    }));
  }, [filteredRows, refCols, refs]);
  const firstHit = hits.find((h) => h.match)?.match ?? null;

  const first50 = useMemo(() => filteredRows.slice(0, 50), [filteredRows]);

  const clear = () => {
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setRefCols([""]);
    setQueriesText("");
    setIntervalSpec("");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Status Update</h1>
        <p className="text-sm text-muted-foreground">
          {isEn
            ? "Upload a supplier report, map the reference column, and search multiple transactions."
            : "Importez un rapport fournisseur, mappez la référence et recherchez plusieurs transactions."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEn ? "Supplier file" : "Fichier fournisseur"}</CardTitle>
          <CardDescription>
            {isEn ? "Accepted formats: .xlsx, .xls, .csv" : "Formats acceptés : .xlsx, .xls, .csv"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!fileName ? (
            <div
              {...dz.getRootProps()}
              className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/30 bg-blue-50/60 p-6 text-center"
            >
              <input {...dz.getInputProps()} />
              <Upload className="mb-2 h-8 w-8 text-primary" />
              <p className="text-sm font-medium text-primary">
                {isEn ? "Drop file here" : "Déposer le fichier ici"}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-4">
              <div>
                <p className="font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {rows.length} {isEn ? "row(s)" : "ligne(s)"}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={clear}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {headers.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{isEn ? "Reference column" : "Colonne référence"}</Label>
                <div className="space-y-2">
                  {refCols.map((col, idx) => (
                    <div key={`ref-col-${idx}`} className="flex items-center gap-2">
                      <Select
                        value={col || "__none__"}
                        onValueChange={(v) =>
                          setRefCols((prev) => {
                            const next = [...prev];
                            next[idx] = v === "__none__" ? "" : v;
                            return next;
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir…" />
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
                      {refCols.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setRefCols((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          {isEn ? "Remove" : "Retirer"}
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setRefCols((prev) => [...prev, ""])}
                  >
                    {isEn ? "Add reference mapping column" : "Ajouter une colonne de mapping référence"}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="line-interval">
                  {isEn ? "Line intervals for mapping" : "Intervalles de lignes pour le mapping"}
                </Label>
                <Input
                  id="line-interval"
                  value={intervalSpec}
                  onChange={(e) => setIntervalSpec(e.target.value)}
                  placeholder="4-56,64-130"
                />
              </div>
            </div>
          )}
          {headers.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="ref-search">
                {isEn
                  ? "References (multiple: comma/new line)"
                  : "Références (plusieurs: virgule / nouvelle ligne)"}
              </Label>
              <textarea
                id="ref-search"
                value={queriesText}
                onChange={(e) => setQueriesText(e.target.value)}
                placeholder={isEn ? "REF001, REF002" : "REF001, REF002"}
                className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          )}
          {!intervalOk && (
            <Alert variant="destructive">
              <AlertTitle>{isEn ? "Invalid intervals" : "Intervalles invalides"}</AlertTitle>
              <AlertDescription>
                {isEn ? "Use format 4-56,64-130." : "Utilisez le format 4-56,64-130."}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {firstHit && (
        <Card>
          <CardHeader>
            <CardTitle>{isEn ? "Found transaction" : "Transaction trouvée"}</CardTitle>
            <CardDescription>
              {isEn ? "Reference" : "Référence"} :{" "}
              {firstHit.row[firstHit.column]} ({isEn ? "column" : "colonne"}: {firstHit.column})
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {headers.map((h) => (
              <div
                key={h}
                className="rounded-md border bg-muted/30 p-3 text-sm"
              >
                <p className="text-xs font-medium text-muted-foreground">{h}</p>
                <p className="font-medium">{firstHit.row[h] || "—"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {hits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{isEn ? "Search results" : "Résultats de recherche"}</CardTitle>
            <CardDescription>
              {hits.filter((h) => h.match).length} / {hits.length}{" "}
              {isEn ? "reference(s) found" : "référence(s) trouvée(s)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {hits.map((h) => (
              <div key={h.ref} className="flex items-center justify-between rounded border p-2 text-sm">
                <span className="font-medium">{h.ref}</span>
                <Badge variant={h.match ? "secondary" : "destructive"}>
                  {h.match ? (isEn ? "Found" : "Trouvée") : (isEn ? "Not found" : "Non trouvée")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {refs.length > 0 && refCols.some(Boolean) && hits.every((h) => !h.match) && (
        <Alert variant="destructive">
          <AlertTitle>{isEn ? "No results" : "Aucun résultat"}</AlertTitle>
          <AlertDescription>
            {isEn
              ? "No row matches these references exactly."
              : "Aucune ligne ne correspond exactement à ces références."}
          </AlertDescription>
        </Alert>
      )}

      {first50.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>50 premières transactions</CardTitle>
              <CardDescription>
                {isEn ? "Preview of imported file" : "Aperçu du fichier importé"}
              </CardDescription>
            </div>
            <Badge variant="secondary">{first50.length} / {filteredRows.length}</Badge>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {first50.map((row, i) => (
                  <TableRow key={i}>
                    {headers.map((h) => (
                      <TableCell key={h} className="max-w-[220px] truncate">
                        {row[h]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
