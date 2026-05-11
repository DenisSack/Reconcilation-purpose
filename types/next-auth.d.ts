import type { Role } from "@/lib/db-types";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    canAccessStatus: boolean;
    mustChangePassword: boolean;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
      canAccessStatus: boolean;
      mustChangePassword: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    canAccessStatus?: boolean;
    mustChangePassword?: boolean;
  }
}
