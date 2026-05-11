/**
 * Types alignés sur prisma/schema.prisma.
 * Le client `@prisma/client` ne réexporte pas de façon fiable les enums/types dans ce setup (pnpm + Next),
 * donc on duplique les unions strictes ici.
 */

export const Role = {
  ADMIN: "ADMIN",
  USER: "USER",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "SERVICE_CREATED"
  | "SERVICE_UPDATED"
  | "SERVICE_DELETED";

export const AUDIT_ACTIONS: AuditAction[] = [
  "LOGIN",
  "LOGOUT",
  "USER_CREATED",
  "USER_UPDATED",
  "USER_DELETED",
  "SERVICE_CREATED",
  "SERVICE_UPDATED",
  "SERVICE_DELETED",
];

export function isAuditAction(v: string): v is AuditAction {
  return (AUDIT_ACTIONS as string[]).includes(v);
}

/** Champs utiles côté UI pour un service Prisma */
export type Service = {
  id: string;
  name: string;
  description: string | null;
  lastReconciled: Date | null;
  createdAt: Date;
};
