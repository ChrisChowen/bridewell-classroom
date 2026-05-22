// Auth seam — registry + the verifyRequest helper every route uses.
//
// HANDOVER: to point Bridewell Classroom at a different identity backend
// (e.g. Microsoft Entra / SAML / OIDC for the schools),
//   1. write an adapter implementing AuthProvider (see ./providers/firebase.ts),
//   2. registerAuthProvider("yourname", () => new YourProvider()),
//   3. set AUTH_PROVIDER=yourname in the environment.
// No route changes — routes call verifyRequest(req) only.

import "server-only";
import type { AuthProvider, AuthUser } from "./types";
import { FirebaseAuthProvider } from "./providers/firebase";

type ProviderFactory = () => AuthProvider;

const registry = new Map<string, ProviderFactory>();
const instances = new Map<string, AuthProvider>();

export function registerAuthProvider(name: string, factory: ProviderFactory): void {
  registry.set(name.toLowerCase(), factory);
  instances.delete(name.toLowerCase());
}

// Built-in: Firebase (the current backend).
registerAuthProvider("firebase", () => new FirebaseAuthProvider());

export function resolveAuthProvider(): AuthProvider {
  const name = (process.env.AUTH_PROVIDER || "firebase").toLowerCase();
  const cached = instances.get(name);
  if (cached) return cached;
  const factory = registry.get(name);
  if (!factory) {
    throw new Error(
      `Unknown AUTH_PROVIDER "${name}". Registered: ${[...registry.keys()].join(", ") || "(none)"}`,
    );
  }
  const instance = factory();
  instances.set(name, instance);
  return instance;
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

export type VerifyResult =
  | { ok: true; user: AuthUser }
  | { ok: false; status: number; error: string };

// Verify a RAW token string through the active provider, with an optional
// role gate. This is the seam's core; both entry points below delegate to
// it. Routes that carry the token in the JSON body (the older pupil/teacher
// routes use `{ idToken }`) call this directly; routes that use the
// Authorization header call verifyRequest. Either way the identity backend
// is the swappable seam — no route touches Firebase directly.
export async function verifyAuthToken(
  token: string | null | undefined,
  opts?: { role?: string },
): Promise<VerifyResult> {
  if (!token) return { ok: false, status: 401, error: "Missing token" };

  let user: AuthUser | null;
  try {
    user = await resolveAuthProvider().verifyToken(token);
  } catch (e) {
    return { ok: false, status: 500, error: e instanceof Error ? e.message : "Auth backend error" };
  }
  if (!user) return { ok: false, status: 401, error: "Invalid token" };
  if (opts?.role && user.role !== opts.role) {
    return { ok: false, status: 403, error: `${opts.role} role required` };
  }
  return { ok: true, user };
}

// The header-based entry point. Extracts the bearer token, then delegates
// to verifyAuthToken. Returns a tagged result with the right HTTP status so
// routes stay uniform.
export async function verifyRequest(
  req: Request,
  opts?: { role?: string },
): Promise<VerifyResult> {
  const token = bearerToken(req);
  if (!token) return { ok: false, status: 401, error: "Missing Authorization bearer token" };
  return verifyAuthToken(token, opts);
}

export type { AuthProvider, AuthUser } from "./types";
