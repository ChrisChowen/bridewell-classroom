import { describe, it, expect } from "vitest";
import { buildUsageIncrements, dayKey } from "./record";

const FIXED = Date.UTC(2026, 4, 23, 9, 0, 0); // 2026-05-23

describe("dayKey", () => {
  it("is the UTC YYYY-MM-DD", () => {
    expect(dayKey(FIXED)).toBe("2026-05-23");
  });
});

describe("buildUsageIncrements", () => {
  const usage = {
    use: "classifier" as const,
    model: "gemini-2.5-pro",
    inputTokens: 1000,
    outputTokens: 200,
  };

  it("always books the top-line + byUse totals", () => {
    const { setFields, increments } = buildUsageIncrements(usage, undefined, FIXED);
    expect(setFields.day).toBe("2026-05-23");
    expect(increments.calls).toBe(1);
    expect(increments.inputTokens).toBe(1000);
    expect(increments.outputTokens).toBe(200);
    expect(increments["byUse.classifier.calls"]).toBe(1);
    expect(typeof increments.costUSD).toBe("number");
    // No attribution → no per-class/teacher keys.
    expect(Object.keys(increments).some((k) => k.startsWith("byClass."))).toBe(false);
    expect(Object.keys(increments).some((k) => k.startsWith("byTeacher."))).toBe(false);
  });

  it("books byClass + byTeacher when attribution is supplied", () => {
    const { increments } = buildUsageIncrements(
      usage,
      { classId: "class-1", teacherUid: "teach-1" },
      FIXED
    );
    expect(increments["byClass.class-1.calls"]).toBe(1);
    expect(increments["byTeacher.teach-1.calls"]).toBe(1);
    // Class + teacher cost equal the top-line cost for a single call.
    expect(increments["byClass.class-1.costUSD"]).toBe(increments.costUSD);
    expect(increments["byTeacher.teach-1.costUSD"]).toBe(increments.costUSD);
  });

  it("sanitises ids that would corrupt a Firestore field path", () => {
    const { increments } = buildUsageIncrements(usage, { classId: "a.b/c[d]" }, FIXED);
    expect(increments["byClass.a_b_c_d_.calls"]).toBe(1);
    // No raw dot-bearing key leaked (which would nest unexpectedly).
    expect(Object.keys(increments)).not.toContain("byClass.a.b/c[d].calls");
  });
});
