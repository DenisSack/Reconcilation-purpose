import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const session = req.auth;

  if (path.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (
      session.user?.mustChangePassword &&
      !path.startsWith("/dashboard/account/password")
    ) {
      return NextResponse.redirect(
        new URL("/dashboard/account/password?required=1", req.url),
      );
    }

    if (path.startsWith("/dashboard/admin")) {
      if (session.user?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard/services", req.url));
      }
    }

    if (path.startsWith("/dashboard/status")) {
      if (!session.user?.canAccessStatus) {
        return NextResponse.redirect(new URL("/dashboard/services", req.url));
      }
    }
  }

  if (path === "/login" && session) {
    const target = session.user?.mustChangePassword
      ? "/dashboard/account/password?required=1"
      : "/dashboard/services";
    return NextResponse.redirect(new URL(target, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
