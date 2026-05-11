/**
 * Secret JWT / cookies pour Auth.js.
 * En production, définir AUTH_SECRET (ou NEXTAUTH_SECRET) dans l’environnement.
 */
const DEV_FALLBACK =
  "luna-dev-only-insecure-secret-min-32-chars-set-AUTH_SECRET-in-env";

export function resolveAuthSecret(): string {
  const fromAuth = process.env.AUTH_SECRET?.trim();
  const fromLegacy = process.env.NEXTAUTH_SECRET?.trim();
  if (fromAuth) return fromAuth;
  if (fromLegacy) return fromLegacy;

  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[auth] AUTH_SECRET / NEXTAUTH_SECRET absents — utilisation du secret de développement. Copiez .env.example vers .env et générez une valeur (openssl rand -base64 32).",
    );
    return DEV_FALLBACK;
  }

  throw new Error(
    "AUTH_SECRET (ou NEXTAUTH_SECRET) est obligatoire en production. Voir .env.example",
  );
}
