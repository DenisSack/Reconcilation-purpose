"use client";

import { useState, useTransition } from "react";
import type { Service } from "@/lib/db-types";
import {
  deleteServiceAction,
  upsertServiceAction,
} from "@/lib/actions/admin-services";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";

type Props = { services: Service[] };

export function ServicesAdmin({ services }: Props) {
  const [pending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[200px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((s) => (
              <TableRow key={s.id}>
                <TableCell colSpan={3} className="p-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <form
                      className="grid flex-1 gap-3 md:grid-cols-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        startTransition(async () => {
                          await upsertServiceAction(null, fd);
                        });
                      }}
                    >
                      <input type="hidden" name="id" value={s.id} />
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Nom
                        </label>
                        <Input name="name" defaultValue={s.name} required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Description
                        </label>
                        <Input
                          name="description"
                          defaultValue={s.description ?? ""}
                          placeholder="Description"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Button type="submit" size="sm" disabled={pending}>
                          Enregistrer les modifications
                        </Button>
                      </div>
                    </form>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setDeleteId(s.id)}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CardCreateService />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce service ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les liaisons utilisateurs et l’historique associés seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteId) return;
                startTransition(async () => {
                  await deleteServiceAction(deleteId);
                  setDeleteId(null);
                });
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CardCreateService() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="mb-3 text-sm font-medium">Ajouter un service</p>
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const res = await upsertServiceAction(null, fd);
            if (res.ok) (e.target as HTMLFormElement).reset();
            else setError(res.error ?? "Erreur");
          });
        }}
      >
        <div className="flex-1 space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="new-name">
            Nom
          </label>
          <Input id="new-name" name="name" required placeholder="Nouveau service" />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="new-desc">
            Description
          </label>
          <Input id="new-desc" name="description" placeholder="Optionnel" />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Création…" : "Créer"}
        </Button>
      </form>
      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
