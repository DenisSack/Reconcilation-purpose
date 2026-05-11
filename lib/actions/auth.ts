"use server";

import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function logoutAction() {
  const session = await auth();
  if (session?.user?.id) {
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "LOGOUT",
        details: { username: session.user.name },
      },
    });
  }
  await signOut({ redirectTo: "/login" });
}
