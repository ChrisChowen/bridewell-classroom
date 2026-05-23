import { describe, it, expect } from "vitest";
import {
  escapeCsvCell,
  toCsv,
  Pseudonymiser,
  buildResearchExport,
} from "./research-export";

describe("escapeCsvCell — CSV/formula-injection hardening", () => {
  it("prefixes a quote on the dangerous lead characters = + - @", () => {
    expect(escapeCsvCell("=1+1")).toBe("'=1+1");
    expect(escapeCsvCell("+44 7700")).toBe("'+44 7700");
    expect(escapeCsvCell("-2")).toBe("'-2");
    expect(escapeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("neutralises the classic command-injection formula payload", () => {
    const payload = "=cmd|'/c calc'!A1";
    const escaped = escapeCsvCell(payload);
    // Leading '=' is neutralised with a quote prefix. The payload has only
    // single quotes (no comma/double-quote/newline), so no RFC wrapping.
    expect(escaped).toBe("'=cmd|'/c calc'!A1");
    expect(escaped.startsWith("'=")).toBe(true);
  });

  it("prefixes a quote on a leading tab (a cell can start with one)", () => {
    // Tab triggers the formula-lead prefix but isn't an RFC-quote trigger.
    expect(escapeCsvCell("\t=evil")).toBe("'\t=evil");
  });

  it("RFC-quotes a payload containing a comma after neutralising", () => {
    expect(escapeCsvCell("=1,2")).toBe(`"'=1,2"`);
  });

  it("RFC-4180 quotes cells with commas, quotes, or newlines", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('she said "hi"')).toBe('"she said ""hi"""');
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("leaves safe cells untouched", () => {
    expect(escapeCsvCell("flowing")).toBe("flowing");
    expect(escapeCsvCell("P001")).toBe("P001");
    expect(escapeCsvCell(0.82)).toBe("0.82");
    expect(escapeCsvCell("")).toBe("");
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });
});

describe("toCsv", () => {
  it("builds a CRLF-terminated CSV and escapes every cell", () => {
    const csv = toCsv(["id", "note"], [["P001", "=danger"], ["P002", "ok"]]);
    expect(csv).toBe("id,note\r\nP001,'=danger\r\nP002,ok\r\n");
  });
});

describe("Pseudonymiser", () => {
  it("maps uids to stable insertion-ordered P-ids", () => {
    const ps = new Pseudonymiser();
    expect(ps.id("uid-a")).toBe("P001");
    expect(ps.id("uid-b")).toBe("P002");
    expect(ps.id("uid-a")).toBe("P001"); // stable
    expect(ps.size()).toBe(2);
  });

  it("maps empty/absent uid to P000 without consuming a slot", () => {
    const ps = new Pseudonymiser();
    expect(ps.id(null)).toBe("P000");
    expect(ps.id("")).toBe("P000");
    expect(ps.size()).toBe(0);
  });
});

describe("buildResearchExport", () => {
  const input = {
    classId: "class-1",
    generatedAt: Date.UTC(2026, 4, 23),
    participants: [
      { uid: "u1", yearGroup: 8, challengeLevel: "core", sessionsObserved: 2 },
      { uid: "u2", yearGroup: 8, challengeLevel: "stretch", sessionsObserved: 1 },
    ],
    engagement: [
      { uid: "u2", timestamp: 100, state: "flowing", confidence: 0.9, tier: "pro", fallback: false },
      { uid: "u1", timestamp: 50, state: "wheel_spinning", confidence: 0.3 },
    ],
    reason: [{ uid: "u1", timestamp: 60, promptType: "paraphrase", confidence: 0.7, branch: "accept" }],
    scaffolding: [{ uid: "u1", timestamp: 40, action: "hint" }],
    interventions: [
      { uid: "u1", timestamp: 70, type: "hint" },
      { uid: null, timestamp: 80, type: "wrap_up" },
    ],
  };

  it("produces all expected files", () => {
    const out = buildResearchExport(input);
    expect(Object.keys(out).sort()).toEqual(
      [
        "README.txt",
        "engagement.csv",
        "interventions.csv",
        "participants.csv",
        "reason.csv",
        "scaffolding.csv",
      ].sort()
    );
  });

  it("uses consistent P-ids across tables, seeded by participant order", () => {
    const out = buildResearchExport(input);
    // u1 is the first participant → P001 everywhere it appears.
    expect(out["participants.csv"]).toContain("P001,class-1,8,core,2");
    expect(out["engagement.csv"]).toContain("P001,1970-01-01T00:00:00.050Z,wheel_spinning,0.3");
    expect(out["reason.csv"]).toContain("P001,1970-01-01T00:00:00.060Z,paraphrase,0.7,accept");
    expect(out["scaffolding.csv"]).toContain("P001,");
    expect(out["interventions.csv"]).toContain("P001,");
    // class-wide intervention is marked, not pseudonymised to a pupil.
    expect(out["interventions.csv"]).toContain("CLASS,1970-01-01T00:00:00.080Z,wrap_up");
  });

  it("never leaks a raw uid or name", () => {
    const blob = Object.values(buildResearchExport(input)).join("\n");
    expect(blob).not.toContain("u1");
    expect(blob).not.toContain("u2");
  });
});
