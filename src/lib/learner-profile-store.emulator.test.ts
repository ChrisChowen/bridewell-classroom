import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { initializeApp, deleteApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { consolidateLearnerProfile, getEffectiveChallengeLevel } from "./learner-profile-store";
import type { LearnerProfile } from "@/types";

// Runs against the Firestore emulator (npm run test:emulator). Proves the
// adaptive-difficulty consolidation reads the persisted session evidence,
// drifts the per-pupil challenge level, and is a no-op when nothing new
// happened — the safety net before this writes real pupils' profiles.

const PROJECT = "bridewell-classroom";
const CLASS = "classLP";
const PID = "pupilLP";

let app: App;
let db: Firestore;

async function seedSession(opts: {
  pupilTurns: number;
  scaffoldPresses: number;
  state: string;
  reasonConfidences: number[];
  baseTs: number;
}) {
  const { pupilTurns, scaffoldPresses, state, reasonConfidences, baseTs } = opts;
  const msgs = db.collection("conversations").doc(`${CLASS}_${PID}`).collection("messages");
  for (let i = 0; i < pupilTurns; i++) {
    await msgs.add({ role: "pupil", content: "turn " + i, timestamp: baseTs + i });
  }
  for (let i = 0; i < scaffoldPresses; i++) {
    await msgs.add({ role: "tutor", content: "scaffold", timestamp: baseTs + 100 + i, meta: { scaffoldAction: "hint" } });
  }
  await db.collection("engagementSnapshots").add({ pupilId: PID, classId: CLASS, state, confidence: 0.8, timestamp: baseTs + 5, sessionId: CLASS });
  for (let i = 0; i < reasonConfidences.length; i++) {
    await db.collection("reasonEvents").add({ pupilId: PID, classId: CLASS, confidence: reasonConfidences[i], timestamp: baseTs + 10 + i, status: "answered" });
  }
}

beforeAll(async () => {
  app = initializeApp({ projectId: PROJECT }, "learner-profile-emulator-test");
  db = getFirestore(app);
});

afterAll(async () => {
  await deleteApp(app);
});

describe("consolidateLearnerProfile (adaptive difficulty)", () => {
  it("a strong first session drifts a core class up to stretch", async () => {
    await seedSession({
      pupilTurns: 8,
      scaffoldPresses: 0, // self-reliant (+1)
      state: "flowing", // up-state (+1)
      reasonConfidences: [0.85, 0.9], // strong Reason (+1)
      baseTs: 1000,
    });

    const res = await consolidateLearnerProfile(db, {
      pupilId: PID,
      classId: CLASS,
      lessonTitle: "Photosynthesis",
      lessonLevel: "core",
      now: 2000,
    });

    expect(res.written).toBe(true);
    const p = res.profile as LearnerProfile;
    expect(p.sessionsObserved).toBe(1);
    expect(p.challengeLevel).toBe("stretch"); // drifted up one step
    expect(p.sessions[0].challengeBefore).toBe("core");
    expect(p.sessions[0].challengeAfter).toBe("stretch");
    expect(p.sessions[0].scaffoldPresses).toBe(0);
    expect(p.metrics.dominantStates[0]).toBe("flowing");

    // The tutor seam now reads the drifted level, not the lesson default.
    const eff = await getEffectiveChallengeLevel(db, PID, "core");
    expect(eff).toBe("stretch");
  });

  it("a re-tap with no new activity is a no-op (does not pollute the trajectory)", async () => {
    const res = await consolidateLearnerProfile(db, {
      pupilId: PID,
      classId: CLASS,
      lessonTitle: "Photosynthesis",
      lessonLevel: "core",
      now: 3000,
    });
    expect(res.written).toBe(false);
    expect(res.profile?.sessionsObserved).toBe(1); // unchanged
  });

  it("a later weak session eases the pitch back down one step", async () => {
    // New activity strictly after the first consolidation (updatedAt=2000).
    await seedSession({
      pupilTurns: 6,
      scaffoldPresses: 5, // heavy reliance (-1)
      state: "wheel_spinning", // down-state (-1)
      reasonConfidences: [0.3], // thin Reason (-1)
      baseTs: 5000,
    });

    const res = await consolidateLearnerProfile(db, {
      pupilId: PID,
      classId: CLASS,
      lessonTitle: "Respiration",
      lessonLevel: "core",
      now: 6000,
    });

    expect(res.written).toBe(true);
    const p = res.profile as LearnerProfile;
    expect(p.sessionsObserved).toBe(2);
    expect(p.sessions[1].challengeBefore).toBe("stretch");
    expect(p.challengeLevel).toBe("core"); // eased one step down from stretch
  });
});
