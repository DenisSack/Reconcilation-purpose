"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminUserSchema } from "@/lib/validations";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Non autorisé");
  }
  return session.user;
}

export async function upsertUserAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin();

  const raw = {
    id: formData.get("id")?.toString() || undefined,
    username: formData.get("username")?.toString() ?? "",
    password: formData.get("password")?.toString() || undefined,
    role: (formData.get("role")?.toString() as "ADMIN" | "USER") ?? "USER",
    canAccessStatus: formData.get("canAccessStatus") === "on",
    serviceIds: formData.getAll("serviceIds").map(String),
  };

  const parsed = adminUserSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.errors.map((e) => e.message).join(", "),
    };
  }

  const { id, username, password, role, canAccessStatus, serviceIds } =
    parsed.data;

  if (!id && (!password || password.length < 4)) {
    return {
      ok: false as const,
      error:
        "Mot de passe requis (min. 4 caractères) pour un nouvel utilisateur",
    };
  }

  if (id && password && password.length > 0 && password.length < 4) {
    return { ok: false as const, error: "Mot de passe trop court" };
  }

  const passwordHash =
    password && password.length > 0
      ? await bcrypt.hash(password, 10)
      : undefined;

  if (id) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return { ok: false as const, error: "Utilisateur introuvable" };
    if (existing.username === "admin" && username !== "admin") {
      return {
        ok: false as const,
        error: "Le compte admin principal ne peut pas être renommé",
      };
    }

    await prisma.user.update({
      where: { id },
      data: {
        username,
        role,
        canAccessStatus,
        ...(passwordHash
          ? { password: passwordHash, mustChangePassword: true }
          : {}),
      } as never,
    });
    await prisma.userService.deleteMany({ where: { userId: id } });
    if (serviceIds.length > 0) {
      await prisma.userService.createMany({
        data: serviceIds.map((serviceId) => ({ userId: id, serviceId })),
      });
    }
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "USER_UPDATED",
        details: { targetUserId: id, username },
      },
    });
  } else {
    const user = await prisma.user.create({
      data: {
        username,
        password: passwordHash!,
        mustChangePassword: true,
        role,
        canAccessStatus,
      } as never,
    });
    if (serviceIds.length > 0) {
      await prisma.userService.createMany({
        data: serviceIds.map((serviceId) => ({
          userId: user.id,
          serviceId,
        })),
      });
    }
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "USER_CREATED",
        details: { targetUserId: user.id, username },
      },
    });
  }

  revalidatePath("/dashboard/admin/users");
  return { ok: true as const };
}

export async function deleteUserAction(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) {
    return {
      ok: false as const,
      error: "Vous ne pouvez pas supprimer votre propre compte",
    };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false as const, error: "Introuvable" };
  if (target.username === "admin") {
    return {
      ok: false as const,
      error: "Le compte administrateur principal ne peut pas être supprimé",
    };
  }

  await prisma.reconciliation.deleteMany({ where: { userId } });
  await prisma.auditLog.deleteMany({ where: { userId } });
  await prisma.userService.deleteMany({ where: { userId } });
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "USER_DELETED",
      details: { targetUserId: userId, username: target.username },
    },
  });
  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/dashboard/admin/users");
  return { ok: true as const };
}
