import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { registerDataStore, resolveDataStore } from "./index";
import type { DataStore } from "./types";
import type { ClassRecord, PupilRecord, LearnerProfile } from "@/types";

// Proves the data seam is swappable: register a stub store, point
// DATA_PROVIDER at it, and resolveDataStore returns it — the same guarantee
// the model + auth seams give. No Firestore needed.

const ORIGINAL = process.env.DATA_PROVIDER;

class StubStore implements DataStore {
  readonly name = "stub";
  // Capture writes so the swap test can assert they flow through the seam.
  readonly writes: Array<{ kind: string; id: string; data: unknown; merge?: boolean }> = [];
  async getClass(id: string) {
    return { id, name: "Stub Class" } as ClassRecord;
  }
  async getPupil(id: string) {
    return { id, classId: "c1", displayName: "Stub" } as PupilRecord;
  }
  async getLearnerProfile(): Promise<LearnerProfile | null> {
    return null;
  }
  async savePupil(id: string, data: Partial<PupilRecord>, opts?: { merge?: boolean }) {
    this.writes.push({ kind: "pupil", id, data, merge: opts?.merge });
  }
  async saveLearnerProfile(pupilId: string, data: Partial<LearnerProfile>, opts?: { merge?: boolean }) {
    this.writes.push({ kind: "profile", id: pupilId, data, merge: opts?.merge });
  }
}

beforeEach(() => {
  process.env.DATA_PROVIDER = "stub";
  registerDataStore("stub", () => new StubStore());
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.DATA_PROVIDER;
  else process.env.DATA_PROVIDER = ORIGINAL;
});

describe("data seam — store swap", () => {
  it("resolves the swapped store and reads through it", async () => {
    const store = resolveDataStore();
    expect(store.name).toBe("stub");
    const cls = await store.getClass("c42");
    expect(cls?.id).toBe("c42");
    const pupil = await store.getPupil("p7");
    expect(pupil?.id).toBe("p7");
    expect(await store.getLearnerProfile("p7")).toBeNull();
  });

  it("memoises the instance per provider name", () => {
    expect(resolveDataStore()).toBe(resolveDataStore());
  });

  it("throws for an unregistered provider", () => {
    process.env.DATA_PROVIDER = "nope";
    expect(() => resolveDataStore()).toThrow(/Unknown DATA_PROVIDER/);
  });

  it("routes single-doc writes through the swapped store", async () => {
    const stub = new StubStore();
    registerDataStore("stub", () => stub);
    const store = resolveDataStore();
    await store.savePupil("p1", { displayName: "Ada" }, { merge: true });
    await store.saveLearnerProfile("p1", { challengeLevel: "stretch" }, { merge: true });
    expect(stub.writes).toEqual([
      { kind: "pupil", id: "p1", data: { displayName: "Ada" }, merge: true },
      { kind: "profile", id: "p1", data: { challengeLevel: "stretch" }, merge: true },
    ]);
  });
});
