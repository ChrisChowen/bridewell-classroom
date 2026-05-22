// Validation for an allowlist entry — exact email "jane@kesw.org" or
// domain wildcard "*@kesw.org". Shared by the single-add + bulk-import
// routes. Pure, unit-testable.

export type EntryKind = "email" | "domain";

export function classify(raw: string): { ok: true; kind: EntryKind } | { ok: false } {
  const v = raw.toLowerCase().trim();
  if (!v || !v.includes("@")) return { ok: false };
  if (v.startsWith("*@")) {
    const domain = v.slice(2);
    if (!domain || domain.includes("@") || !domain.includes(".")) return { ok: false };
    return { ok: true, kind: "domain" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { ok: false };
  return { ok: true, kind: "email" };
}
