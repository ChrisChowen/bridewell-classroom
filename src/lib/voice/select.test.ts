import { describe, it, expect } from "vitest";
import { pickBritishVoice, hasBritishVoice, type VoiceLike } from "./select";

const v = (name: string, lang: string, extra: Partial<VoiceLike> = {}): VoiceLike => ({
  name,
  lang,
  ...extra,
});

describe("pickBritishVoice — British-only constraint", () => {
  it("returns null when no en-GB voice exists (never an American one)", () => {
    const voices = [v("Samantha", "en-US"), v("Alex", "en-US", { default: true })];
    expect(pickBritishVoice(voices)).toBeNull();
    expect(hasBritishVoice(voices)).toBe(false);
  });

  it("never returns a non-GB voice even if it's the default", () => {
    const voices = [v("Samantha", "en-US", { default: true }), v("Daniel", "en-GB")];
    const picked = pickBritishVoice(voices)!;
    expect(picked.lang.toLowerCase()).toMatch(/en[-_]gb/);
    expect(picked.name).toBe("Daniel");
  });

  it("accepts en_GB and en-gb spellings", () => {
    expect(pickBritishVoice([v("X", "en_GB")])).not.toBeNull();
    expect(pickBritishVoice([v("Y", "EN-GB")])).not.toBeNull();
  });

  it("prefers a known high-quality GB name over an unknown GB voice", () => {
    const voices = [v("Random GB", "en-GB"), v("Google UK English Female", "en-GB")];
    expect(pickBritishVoice(voices)!.name).toBe("Google UK English Female");
  });

  it("prefers a remote GB voice when no named match", () => {
    const voices = [
      v("Local GB", "en-GB", { localService: true }),
      v("Remote GB", "en-GB", { localService: false }),
    ];
    expect(pickBritishVoice(voices)!.name).toBe("Remote GB");
  });

  it("falls back to the first GB voice when nothing else distinguishes them", () => {
    const voices = [v("GB One", "en-GB", { localService: true }), v("GB Two", "en-GB", { localService: true })];
    expect(pickBritishVoice(voices)!.name).toBe("GB One");
  });
});
