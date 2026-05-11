import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { resolveAuthSecret } from "@/lib/auth-secret";
import type { Role } from "@/lib/db-types";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: resolveAuthSecret(),
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Nom d'utilisateur", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = (await prisma.user.findUnique({
          where: { username: parsed.data.username },
          select: {
            id: true,
            username: true,
            password: true,
            role: true,
            canAccessStatus: true,
            mustChangePassword: true,
          } as never,
        })) as
          | {
              id: string;
              username: string;
              password: string;
              role: Role;
              canAccessStatus: boolean;
              mustChangePassword?: boolean;
            }
          | null;

        if (!user) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "LOGIN",
            details: { username: user.username },
          },
        });

        return {
          id: user.id,
          name: user.username,
          email: null,
          image: null,
          role: user.role,
          canAccessStatus: user.canAccessStatus,
          mustChangePassword: Boolean(user.mustChangePassword),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.canAccessStatus = user.canAccessStatus;
        token.mustChangePassword = user.mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.canAccessStatus = Boolean(token.canAccessStatus);
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
      }
      return session;
    },
  },
});
