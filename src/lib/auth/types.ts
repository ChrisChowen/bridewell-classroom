// Auth seam — the single interface every server route uses to identify a
// caller, so the identity backend (Firebase today; Microsoft Entra / SAML /
// OIDC for the schools tomorrow) is a config + adapter swap with ZERO route
// changes. Mirrors the model seam in src/lib/ai/providers/.

// The identity a verified request resolves to. Deliberately minimal +
// backend-agnostic: uid + optional email + a role claim + the raw claims
// bag for anything backend-specific a caller genuinely needs.
export interface AuthUser {
  uid: string;
  email?: string;
  // App role from a custom claim ("teacher", "admin", …). Pupils are
  // anonymous and have no role.
  role?: string;
  claims: Record<string, unknown>;
}

export interface AuthProvider {
  readonly name: string;
  // Verify a bearer token. Return the AuthUser on success, null if the
  // token is simply invalid/expired. THROW only on a backend/infra failure
  // (misconfiguration, backend unreachable) — the helper maps that to 500,
  // whereas null maps to 401.
  verifyToken(token: string): Promise<AuthUser | null>;
}
