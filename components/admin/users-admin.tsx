"use client";

import { useMemo, useState, useTransition } from "react";
import type { Role } from "@/lib/db-types";
import { deleteUserAction, upsertUserAction } from "@/lib/actions/admin-users";
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
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";

export type UserRow = {
  id: string;
  username: string;
  role: Role;
  canAccessStatus: boolean;
  services: { id: string; name: string }[];
  reconCount: number;
};

type ServiceOption = { id: string; name: string };

type Props = {
  users: UserRow[];
  services: ServiceOption[];
};

export function UsersAdmin({ users, services }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [role, setRole] = useState<Role>("USER");
  const [selectedServices, setSelectedServices] = useState<Set<string>>(
    new Set(),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const openCreate = () => {
    setEditing(null);
    setCanAccess(false);
    setRole("USER");
    setSelectedServices(new Set());
    setShowPw(false);
    setError(null);
    setOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setCanAccess(u.canAccessStatus);
    setRole(u.role);
    setSelectedServices(new Set(u.services.map((s) => s.id)));
    setShowPw(false);
    setError(null);
    setOpen(true);
  };

  const toggleService = (id: string) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (editing) fd.set("id", editing.id);
    fd.set("role", role);
    if (canAccess) fd.set("canAccessStatus", "on");
    selectedServices.forEach((id) => fd.append("serviceIds", id));

    startTransition(async () => {
      const res = await upsertUserAction(null, fd);
      if (res.ok) {
        setOpen(false);
        form.reset();
      } else {
        setError("error" in res ? res.error : "Erreur");
      }
    });
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    startTransition(async () => {
      const res = await deleteUserAction(deleteId);
      if (!res.ok) {
        setError("error" in res ? res.error : "Suppression impossible");
      }
      setDeleteId(null);
    });
  };

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.username.localeCompare(b.username)),
    [users],
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>Ajouter un utilisateur</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Status Update</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Réconciliations</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.username}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "ADMIN" ? "default" : "outline"}>
                    {u.role === "ADMIN" ? "Administrateur" : "Utilisateur"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.canAccessStatus ? "success" : "secondary"}>
                    {u.canAccessStatus ? "Oui" : "Non"}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[260px]">
                  <div className="flex flex-wrap gap-1">
                    {u.services.map((s) => (
                      <Badge key={s.id} variant="outline" className="text-xs">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{u.reconCount}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(u)}
                      aria-label="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={u.username === "admin"}
                      onClick={() => setDeleteId(u.id)}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier l’utilisateur" : "Nouvel utilisateur"}
            </DialogTitle>
            <DialogDescription>
              Définissez les accès et services autorisés.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">Nom d’utilisateur</Label>
              <Input
                id="username"
                name="username"
                required
                defaultValue={editing?.username}
                disabled={editing?.username === "admin"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Mot de passe {editing ? "(laisser vide pour conserver)" : ""}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  name="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Masquer" : "Afficher"}
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as Role)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Utilisateur</SelectItem>
                  <SelectItem value="ADMIN">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Accès Status Update</p>
                <p className="text-xs text-muted-foreground">
                  Autorise la page de mise à jour statut
                </p>
              </div>
              <Switch checked={canAccess} onCheckedChange={setCanAccess} />
            </div>
            <div className="space-y-2">
              <Label>Services autorisés</Label>
              <div className="grid gap-2 rounded-md border p-3">
                {services.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedServices.has(s.id)}
                      onChange={() => toggleService(s.id)}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l’utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
