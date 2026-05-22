import { describe, it, expect } from "vitest";
import { generateJoinCode, normaliseJoinCode } from "./joinCode";

describe("generateJoinCode", () => {
  it("produces an XXX-XXX shape", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateJoinCode()).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
    }
  });

  it("never uses confusable characters (0, O, I, 1, L)", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode().replace("-", "");
      expect(code).not.toMatch(/[0OI1L]/);
    }
  });
});

describe("normaliseJoinCode", () => {
  it("upper-cases and inserts the hyphen", () => {
    expect(normaliseJoinCode("abcdef")).toBe("ABC-DEF");
  });

  it("strips non-alphanumerics and whitespace", () => {
    expect(normaliseJoinCode(" a b-c d e f ")).toBe("ABC-DEF");
  });

  it("caps at six characters", () => {
    expect(normaliseJoinCode("ABCDEFGHIJ")).toBe("ABC-DEF");
  });

  it("handles a partial code without crashing", () => {
    // 4 chars -> "ABC-D"
    expect(normaliseJoinCode("abcd")).toBe("ABC-D");
  });

  it("is idempotent on an already-normalised code", () => {
    expect(normaliseJoinCode("ABC-DEF")).toBe("ABC-DEF");
  });
});
