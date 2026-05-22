import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { registerAuthProvider, verifyRequest, bearerToken } from "./index";
import type { AuthProvider, AuthUser } from "./types";

// Proves the auth seam is genuinely swappable: register a stub provider,
// point AUTH_PROVIDER at it, and verifyRequest flows through it unchanged —
// the same guarantee the model-seam swap test gives. No Firebase needed.

const ORIGINAL = process.env.AUTH_PROVIDER;

function reqWith(token?: string): Request {
  return new Request("http://x", token ? { headers: { authorization: `Bearer ${token}` } } : undefined);
}

class StubProvider implements AuthProvider {
  readonly name = "stub";
  constructor(private readonly resolve: (token: string) => AuthUser | null, private readonly fail = false) {}
  async verifyToken(token: string): Promise<AuthUser | null> {
    if (this.fail) throw new Error("backend down");
    return this.resolve(token);
  }
}

beforeEach(() => {
  process.env.AUTH_PROVIDER = "stub";
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.AUTH_PROVIDER;
  else process.env.AUTH_PROVIDER = ORIGINAL;
});

describe("bearerToken", () => {
  it("extracts the token and tolerates casing/whitespace", () => {
    expect(bearerToken(reqWith("abc"))).toBe("abc");
    expect(bearerToken(new Request("http://x", { headers: { authorization: "bearer  xyz " } }))).toBe("xyz");
    expect(bearerToken(new Request("http://x"))).toBeNull();
  });
});

describe("verifyRequest — provider swap", () => {
  it("401s when no token is present", async () => {
    registerAuthProvider("stub", () => new StubProvider(() => null));
    const r = await verifyRequest(reqWith());
    expect(r).toMatchObject({ ok: false, status: 401 });
  });

  it("flows through the swapped provider and returns its user", async () => {
    registerAuthProvider("stub", () => new StubProvider((t) => ({ uid: "u-" + t, role: "teacher", claims: {} })));
    const r = await verifyRequest(reqWith("tok123"));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.user.uid).toBe("u-tok123");
      expect(r.user.role).toBe("teacher");
    }
  });

  it("401s when the provider rejects the token (null)", async () => {
    registerAuthProvider("stub", () => new StubProvider(() => null));
    const r = await verifyRequest(reqWith("bad"));
    expect(r).toMatchObject({ ok: false, status: 401 });
  });

  it("enforces a required role with 403", async () => {
    registerAuthProvider("stub", () => new StubProvider(() => ({ uid: "u1", role: "pupil", claims: {} })));
    const r = await verifyRequest(reqWith("tok"), { role: "teacher" });
    expect(r).toMatchObject({ ok: false, status: 403 });
  });

  it("passes when the role matches", async () => {
    registerAuthProvider("stub", () => new StubProvider(() => ({ uid: "u1", role: "teacher", claims: {} })));
    const r = await verifyRequest(reqWith("tok"), { role: "teacher" });
    expect(r.ok).toBe(true);
  });

  it("maps a backend failure to 500 (not 401)", async () => {
    registerAuthProvider("stub", () => new StubProvider(() => null, true));
    const r = await verifyRequest(reqWith("tok"));
    expect(r).toMatchObject({ ok: false, status: 500 });
  });

  it("throws for an unregistered provider name", async () => {
    process.env.AUTH_PROVIDER = "does-not-exist";
    const r = await verifyRequest(reqWith("tok"));
    // resolveAuthProvider throws → mapped to 500 by verifyRequest.
    expect(r).toMatchObject({ ok: false, status: 500 });
  });
});
