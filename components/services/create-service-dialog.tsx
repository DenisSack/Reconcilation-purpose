"use client";

import { useState, useTransition } from "react";
import { upsertServiceAction } from "@/lib/actions/admin-services";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function CreateServiceDialog({ open, onOpenChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau service</DialogTitle>
          <DialogDescription>
            Créez un service disponible pour la réconciliation.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await upsertServiceAction(null, fd);
              if (res.ok) {
                onOpenChange(false);
                (e.target as HTMLFormElement).reset();
              } else {
                setError(res.error ?? "Erreur");
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="svc-name">Nom</Label>
            <Input id="svc-name" name="name" required placeholder="Ex. Électricité" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="svc-desc">Description</Label>
            <Input
              id="svc-desc"
              name="description"
              placeholder="Optionnel"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
