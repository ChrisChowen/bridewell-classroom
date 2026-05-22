import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { initializeApp, deleteApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { markSafeguardingReviewed } from "./safeguarding";

// Runs against the Firestore emulator (npm run test:emulator). Proves
// the safeguarding audit trail: marking a pupil reviewed stamps WHO +
// WHEN + note on their open events, closes only THAT pupil's events,
// and is idempotent.

const PROJECT = "bridewell-classroom";
let app: App;
let db: Firestore;

beforeAll(async () => {
  app = initializeApp({ projectId: PROJECT }, "safeguarding-emulator-test");
  db = getFirestore(app);
});
afterAll(async () => {
  await deleteApp(app);
});

describe("markSafeguardingReviewed (audit trail)", () => {
  it("stamps reviewer + timestamp + note on a pupil's open events, scoped to that pupil, idempotently", async () => {
    const target = `sg-target-${Date.now()}`;
    const other = `sg-other-${Date.now()}`;
    await db.collection("safeguardingEvents").add({ pupilId: target, severity: "high", reviewed: false });
    await db.collection("safeguardingEvents").add({ pupilId: target, severity: "medium", reviewed: false });
    await db.collection("safeguardingEvents").add({ pupilId: other, severity: "high", reviewed: false });

    const res = await markSafeguardingReviewed(db, target, "teacher-uid-1", "Spoke with pupil + logged on CPOMS", 1000);
    expect(res.reviewedCount).toBe(2);

    // Target events now carry the full audit stamp.
    const targetDocs = await db.collection("safeguardingEvents").where("pupilId", "==", target).get();
    for (const d of targetDocs.docs) {
      const data = d.data();
      expect(data.reviewed).toBe(true);
      expect(data.reviewedBy).toBe("teacher-uid-1");
      expect(data.reviewedAt).toBe(1000);
      expect(data.reviewNote).toContain("CPOMS");
    }

    // The other pupil's event is untouched.
    const otherDocs = await db.collection("safeguardingEvents").where("pupilId", "==", other).get();
    expect(otherDocs.docs[0].data().reviewed).toBe(false);

    // Idempotent: a second call finds nothing open.
    const again = await markSafeguardingReviewed(db, target, "teacher-uid-1", null);
    expect(again.reviewedCount).toBe(0);
  });
});
