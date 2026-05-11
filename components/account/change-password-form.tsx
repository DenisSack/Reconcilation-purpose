"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePasswordAction,
  type ChangePasswordState,
} from "@/lib/actions/change-password";

const initialState: ChangePasswordState = {
  ok: false,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Mise à jour…" : "Changer le mot de passe"}
    </Button>
  );
}

export function ChangePasswordForm({ required }: { required: boolean }) {
  const [state, formAction] = useFormState(changePasswordAction, initialState);

  return (
    <div className="space-y-4">
      {required && (
        <Alert>
          <AlertTitle>Changement obligatoire</AlertTitle>
          <AlertDescription>
            Votre mot de passe initial doit etre change avant d&apos;utiliser la plateforme.
          </AlertDescription>
        </Alert>
      )}
      {state.message && (
        <Alert variant={state.ok ? "success" : "destructive"}>
          <AlertTitle>{state.ok ? "Succes" : "Erreur"}</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      <form action={formAction} className="space-y-4 rounded-lg border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Mot de passe actuel</Label>
          <Input id="currentPassword" name="currentPassword" type="password" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">Nouveau mot de passe</Label>
          <Input id="newPassword" name="newPassword" type="password" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" required />
        </div>
        <SubmitButton />
      </form>
    </div>
  );
}
