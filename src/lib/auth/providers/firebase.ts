// Firebase Auth adapter for the auth seam. Wraps the admin SDK's
// verifyIdToken so feature code never calls it directly.

import { getAdmin } from "@/lib/firebase/admin";
import type { AuthProvider, AuthUser } from "../types";

export class FirebaseAuthProvider implements AuthProvider {
  readonly name = "firebase";

  async verifyToken(token: string): Promise<AuthUser | null> {
    const a = getAdmin();
    if (!a.ready) {
      // Infra/misconfiguration — throw so the helper returns 500, not 401.
      throw new Error(`Admin not ready: ${a.reason}`);
    }
    let decoded;
    try {
      decoded = await a.auth.verifyIdToken(token);
    } catch {
      // Genuinely invalid / expired token → 401 (null), not an error.
      return null;
    }
    return {
      uid: decoded.uid,
      email: decoded.email,
      role: typeof decoded.role === "string" ? decoded.role : undefined,
      claims: decoded as unknown as Record<string, unknown>,
    };
  }
}
