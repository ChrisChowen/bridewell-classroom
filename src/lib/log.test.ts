import { describe, it, expect } from "vitest";
import { formatLogLine } from "./log";

const FIXED = Date.UTC(2026, 4, 23, 12, 0, 0);

describe("formatLogLine", () => {
  it("emits a single JSON line with ts + level", () => {
    const line = formatLogLine("info", { route: "chat" }, FIXED);
    const o = JSON.parse(line);
    expect(o.level).toBe("info");
    expect(o.ts).toBe("2026-05-23T12:00:00.000Z");
    expect(o.route).toBe("chat");
    expect(line.includes("\n")).toBe(false);
  });

  it("passes allow-listed id/enum string fields through", () => {
    const o = JSON.parse(
      formatLogLine("info", {
        route: "engagement/run",
        classId: "c1",
        teacherUid: "t1",
        pupilUid: "p1",
        tier: "pro",
        state: "flowing",
      })
    );
    expect(o.classId).toBe("c1");
    expect(o.teacherUid).toBe("t1");
    expect(o.pupilUid).toBe("p1");
    expect(o.tier).toBe("pro");
    expect(o.state).toBe("flowing");
  });

  it("DROPS non-allow-listed string fields (PII guard)", () => {
    const o = JSON.parse(
      formatLogLine("info", {
        route: "chat",
        // These are exactly the shapes we must never log.
        pupilName: "Alex Smith",
        email: "alex@school.uk",
        message: "I feel really sad today",
      } as Record<string, string>)
    );
    expect(o.pupilName).toBe("[dropped:non-allowlisted-string]");
    expect(o.email).toBe("[dropped:non-allowlisted-string]");
    expect(o.message).toBe("[dropped:non-allowlisted-string]");
    // The whole serialized line must not contain the sensitive substrings.
    const line = JSON.stringify(o);
    expect(line).not.toContain("Alex Smith");
    expect(line).not.toContain("alex@school.uk");
    expect(line).not.toContain("really sad");
  });

  it("always allows numbers and booleans under any key", () => {
    const o = JSON.parse(
      formatLogLine("info", { durationMs: 42, status: 200, fallback: true, retries: 3 })
    );
    expect(o.durationMs).toBe(42);
    expect(o.status).toBe(200);
    expect(o.fallback).toBe(true);
    expect(o.retries).toBe(3);
  });

  it("caps over-long strings on allow-listed keys", () => {
    const long = "x".repeat(500);
    const o = JSON.parse(formatLogLine("warn", { reason: long }));
    expect(o.reason.length).toBe(200);
  });

  it("drops objects/arrays entirely", () => {
    const o = JSON.parse(
      formatLogLine("info", {
        route: "x",
        // @ts-expect-error — intentionally smuggling a non-primitive
        payload: { secret: "content" },
      })
    );
    expect(o.payload).toBe("[dropped:non-primitive]");
    expect(JSON.stringify(o)).not.toContain("content");
  });

  it("skips undefined/null fields", () => {
    const o = JSON.parse(formatLogLine("info", { route: "x", classId: undefined }));
    expect("classId" in o).toBe(false);
  });
});
