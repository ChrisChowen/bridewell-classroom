// Playwright global setup for the emulator-backed demo-flow specs. Seeds a
// class + join code into the Firestore emulator so the pupil-join / lesson
// specs have something to join. Runs in node; firebase-admin auto-targets
// the emulator via the FIRESTORE_EMULATOR_HOST env that `firebase
// emulators:exec` sets — no real credential, no real-pupil data.
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";
import { getAuth } from "firebase-admin/auth";

const DATABASE_URL =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
  "https://bridewell-classroom-default-rtdb.europe-west1.firebasedatabase.app";

export const E2E = {
  classId: "e2e-class-1",
  // Canonical dashed form — normaliseJoinCode() stores/looks up codes as
  // XXX-XXX, so the joinCodes doc id and the class's joinCode field must
  // both use the dash (a plain "ABCDEF" doc id is never matched).
  joinCode: "ABC-DEF",
  className: "E2E Biology",
  subject: "Biology",
  teacherId: "e2e-teacher",
  teacherEmail: "teacher@e2e.test",
  teacherPassword: "e2e-password-123",
  teacherName: "E2E Teacher",
};

export default async function globalSetup() {
  const app =
    getApps()[0] ??
    initializeApp({ projectId: "bridewell-classroom", databaseURL: DATABASE_URL });
  const db = getFirestore(app);

  const lessonPlan = {
    id: "e2e-plan-1",
    title: "Photosynthesis",
    subject: "Biology",
    yearGroup: 8,
    objectives: ["Understand photosynthesis"],
    learningObjectives: ["Understand photosynthesis"],
    criticalConcepts: ["chlorophyll absorbs light"],
    keyVocabulary: [],
    tutorAddendum: "",
    scaffoldCeiling: 3,
    defaultMode: "coach",
    challengeLevel: "core",
    estimatedMinutes: 30,
    generatedAt: Date.now(),
    sequence: [
      {
        title: "Step 1",
        goal: "Explain photosynthesis",
        activityType: "socratic",
        openingPrompt: "What do plants need to make food?",
        criticalConcepts: ["chlorophyll absorbs light"],
        expectedMisconceptions: [],
        estimatedMinutes: 10,
      },
    ],
  };

  await db.collection("classes").doc(E2E.classId).set({
    id: E2E.classId,
    teacherId: E2E.teacherId,
    school: "KESW",
    name: E2E.className,
    subject: E2E.subject,
    joinCode: E2E.joinCode,
    createdAt: Date.now(),
    active: true,
    lessonPlan,
  });

  await db.collection("joinCodes").doc(E2E.joinCode).set({
    classId: E2E.classId,
    teacherId: E2E.teacherId,
    createdAt: Date.now(),
  });

  // Seed a teacher account in the Auth emulator (with the role claim the auth
  // seam checks) + a teachers/{uid} profile doc, so the teacher-flow spec can
  // sign in and see this class (its teacherId is E2E.teacherId).
  const auth = getAuth(app);
  await auth
    .createUser({
      uid: E2E.teacherId,
      email: E2E.teacherEmail,
      password: E2E.teacherPassword,
      displayName: E2E.teacherName,
    })
    .catch(() => {}); // idempotent across reruns
  await auth.setCustomUserClaims(E2E.teacherId, { role: "teacher" });
  await db.collection("teachers").doc(E2E.teacherId).set({
    displayName: E2E.teacherName,
    email: E2E.teacherEmail,
  });

  // Seed the live session as "active" so a joined pupil's chat is unlocked
  // (no separate teacher "start" step needed for the e2e), plus the owner
  // stamp the RTDB rules expect.
  const rtdb = getDatabase(app);
  await rtdb.ref(`liveSessions/${E2E.classId}/status`).set({ value: "active", ts: Date.now() });
  await rtdb.ref(`liveSessions/${E2E.classId}/meta/teacherId`).set(E2E.teacherId);

  // Seed two live pupils so the teacher's class view shows real signals:
  // one wheel-spinning, one with a safeguarding flag. Each needs a Firestore
  // pupils doc (roster) + an RTDB live-mirror entry (state). The pupil session
  // never changes — safeguarding surfaces ONLY to the teacher.
  const now = Date.now();
  await db.collection("pupils").doc("e2e-wheel").set({
    id: "e2e-wheel", classId: E2E.classId, displayName: "Wheel Pupil", joinedAt: now,
  });
  await db.collection("pupils").doc("e2e-safe").set({
    id: "e2e-safe", classId: E2E.classId, displayName: "Safe Pupil", joinedAt: now,
  });
  await rtdb.ref(`liveSessions/${E2E.classId}/pupils/e2e-wheel`).set({
    pupilId: "e2e-wheel", displayName: "Wheel Pupil", state: "wheel_spinning",
    confidence: 0.82, lastActive: now, scaffoldUsesRecent: 3, currentStepIndex: 0,
    trajectory: [
      { state: "productive_struggle", t: now - 120000, confidence: 0.6 },
      { state: "wheel_spinning", t: now - 60000, confidence: 0.7 },
      { state: "wheel_spinning", t: now, confidence: 0.82 },
    ],
  });
  await rtdb.ref(`liveSessions/${E2E.classId}/pupils/e2e-safe`).set({
    pupilId: "e2e-safe", displayName: "Safe Pupil", state: "productive_struggle",
    confidence: 0.7, lastActive: now, currentStepIndex: 0,
    safeguarding: { severity: "medium", summary: "Mentioned a difficult weekend at home.", ts: now },
  });
}
