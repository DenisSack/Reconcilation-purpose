"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

export type LoginFormState = { error: string | null };

export async function loginAction(
  _prev: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    return { error: "Champs requis" };
  }

  let result: string | undefined;
  try {
    result = await signIn("credentials", {
      username,
      password,
      redirect: false,
      redirectTo: "/dashboard/services",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Identifiants invalides" };
    }
    throw error;
  }

  const next = typeof result === "string" ? result : "";
  if (!next) {
    return { error: "Identifiants invalides" };
  }

  let u: URL;
  try {
    u = new URL(next, "http://localhost");
  } catch {
    return { error: "Identifiants invalides" };
  }

  if (u.searchParams.get("error")) {
    return { error: "Identifiants invalides" };
  }

  redirect(`${u.pathname}${u.search}${u.hash}`);
}
