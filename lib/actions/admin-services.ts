"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminServiceSchema } from "@/lib/validations";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Non autorisé");
  }
  return session.user;
}

export async function upsertServiceAction(_prev: unknown, formData: FormData) {
  const admin = await requireAdmin();

  const raw = {
    id: formData.get("id")?.toString() || undefined,
    name: formData.get("name")?.toString() ?? "",
    description: formData.get("description")?.toString() || null,
  };

  const parsed = adminServiceSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.errors.map((e) => e.message).join(", "),
    };
  }

  const { id, name, description } = parsed.data;

  if (id) {
    await prisma.service.update({
      where: { id },
      data: { name, description },
    });
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "SERVICE_UPDATED",
        details: { serviceId: id, name },
      },
    });
  } else {
    const created = await prisma.service.create({
      data: { name, description: description ?? undefined },
    });
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "SERVICE_CREATED",
        details: { serviceId: created.id, name },
      },
    });
  }

  revalidatePath("/dashboard/admin/services");
  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/reconciliation");
  return { ok: true as const };
}

export async function deleteServiceAction(serviceId: string) {
  const admin = await requireAdmin();

  const svc = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!svc) {
    return { ok: false as const, error: "Service introuvable" };
  }

  await prisma.userService.deleteMany({ where: { serviceId } });
  await prisma.reconciliation.deleteMany({ where: { serviceId } });
  await prisma.service.delete({ where: { id: serviceId } });
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "SERVICE_DELETED",
      details: { serviceId, name: svc.name },
    },
  });

  revalidatePath("/dashboard/admin/services");
  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/reconciliation");
  return { ok: true as const };
}
