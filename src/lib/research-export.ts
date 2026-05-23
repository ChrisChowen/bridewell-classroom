// Anonymised research export (brief item N). Produces a pseudonymised,
// CSV-injection-safe bundle of a class's analytic events for research use
// (engagement trajectories, scaffolding, Reason interactions, interventions).
//
// Privacy stance (guardrail: most-privacy-preserving by default):
//   - Pupils are pseudonymised P001…; no display names, emails, or UIDs
//     leave this module.
//   - Only analytic fields are exported (states, confidences, counts,
//     branches, timestamps, enums). Raw chat/Reason free-text is NOT
//     included — its inclusion is a research-ethics decision for the DPO,
//     not a default, and free-text carries re-identification risk.
//
// This module is pure (no Firestore, no I/O) so the escaping + pseudonym
// scheme can be pinned by tests. The route gathers the data and calls in.

// ── CSV-injection escaping ───────────────────────────────────────────────
// A spreadsheet treats a cell beginning with = + - @ (or a tab / carriage
// return that a cell can start with) as a FORMULA. A pupil who types
// `=cmd|...` into the tutor could otherwise execute on a teacher's machine
// when they open the export. We neutralise by prefixing a single quote, then
// apply RFC-4180 quoting. MANDATORY — see the goal spec.
const FORMULA_LEAD = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (FORMULA_LEAD.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(","));
  // CRLF line endings — the RFC-4180 default and what Excel expects.
  return lines.join("\r\n") + "\r\n";
}

// ── Pseudonymisation ─────────────────────────────────────────────────────
// Stable, insertion-ordered uid → P00N map. The same uid always maps to the
// same participant id within one export; the map itself never leaves the
// server (it would be the re-identification key).
export class Pseudonymiser {
  private map = new Map<string, string>();
  private n = 0;

  id(uid: string | null | undefined): string {
    if (!uid) return "P000";
    const existing = this.map.get(uid);
    if (existing) return existing;
    this.n += 1;
    const pid = `P${String(this.n).padStart(3, "0")}`;
    this.map.set(uid, pid);
    return pid;
  }

  size(): number {
    return this.map.size;
  }
}

// ── Table builders ───────────────────────────────────────────────────────
export interface ResearchExportInput {
  classId: string;
  generatedAt: number;
  participants: Array<{
    uid: string;
    yearGroup?: string | number;
    challengeLevel?: string;
    sessionsObserved?: number;
  }>;
  engagement: Array<{
    uid: string;
    timestamp: number;
    state: string;
    confidence: number;
    tier?: string;
    fallback?: boolean;
  }>;
  reason: Array<{
    uid: string;
    timestamp: number;
    promptType: string;
    confidence: number;
    branch: string;
  }>;
  scaffolding: Array<{
    uid: string;
    timestamp: number;
    action: string;
  }>;
  interventions: Array<{
    uid?: string | null;
    timestamp: number;
    type: string;
  }>;
}

function iso(ts: number): string {
  return Number.isFinite(ts) ? new Date(ts).toISOString() : "";
}

// Returns a map of filename → file contents (CSV strings + a README).
export function buildResearchExport(
  input: ResearchExportInput
): Record<string, string> {
  const ps = new Pseudonymiser();
  // Seed the pseudonym map in participant order so P-ids are deterministic
  // and stable regardless of which event table is iterated first.
  for (const p of input.participants) ps.id(p.uid);

  const participantsCsv = toCsv(
    ["participantId", "classId", "yearGroup", "challengeLevel", "sessionsObserved"],
    input.participants.map((p) => [
      ps.id(p.uid),
      input.classId,
      p.yearGroup ?? "",
      p.challengeLevel ?? "",
      p.sessionsObserved ?? "",
    ])
  );

  const engagementCsv = toCsv(
    ["participantId", "timestamp", "state", "confidence", "classifierTier", "fallback"],
    input.engagement.map((e) => [
      ps.id(e.uid),
      iso(e.timestamp),
      e.state,
      e.confidence,
      e.tier ?? "",
      e.fallback ? "true" : "false",
    ])
  );

  const reasonCsv = toCsv(
    ["participantId", "timestamp", "promptType", "confidence", "branch"],
    input.reason.map((r) => [
      ps.id(r.uid),
      iso(r.timestamp),
      r.promptType,
      r.confidence,
      r.branch,
    ])
  );

  const scaffoldingCsv = toCsv(
    ["participantId", "timestamp", "action"],
    input.scaffolding.map((s) => [ps.id(s.uid), iso(s.timestamp), s.action])
  );

  const interventionsCsv = toCsv(
    ["participantId", "timestamp", "type"],
    input.interventions.map((i) => [
      // Class-wide interventions (no pupil) export as a non-participant marker.
      i.uid ? ps.id(i.uid) : "CLASS",
      iso(i.timestamp),
      i.type,
    ])
  );

  const readme = [
    "Bridewell Classroom — anonymised research export",
    "",
    `Class: ${input.classId}`,
    `Generated: ${iso(input.generatedAt)}`,
    `Participants: ${ps.size()}`,
    "",
    "Files:",
    "  participants.csv  — one row per pupil (pseudonymised P-ids)",
    "  engagement.csv    — classifier snapshots over time",
    "  reason.csv        — Reason interaction outcomes",
    "  scaffolding.csv   — Hint/Rephrase/Simplify presses",
    "  interventions.csv — teacher interventions",
    "",
    "Pseudonymisation: pupils are identified only as P001, P002, … The map",
    "from participant id to real identity is NOT included in this export and",
    "is never written to disk; it lives only in server memory at generation",
    "time. No names, emails, UIDs, or raw chat/Reason free-text are included.",
    "All cells are escaped against CSV/formula injection before writing.",
    "",
  ].join("\n");

  return {
    "README.txt": readme,
    "participants.csv": participantsCsv,
    "engagement.csv": engagementCsv,
    "reason.csv": reasonCsv,
    "scaffolding.csv": scaffoldingCsv,
    "interventions.csv": interventionsCsv,
  };
}
