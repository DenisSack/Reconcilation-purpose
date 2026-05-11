import { headers } from "next/headers";

export async function serverFetch(path: string, init?: RequestInit) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const url = `${proto}://${host}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      cookie: h.get("cookie") ?? "",
    },
    cache: "no-store",
  });
}
