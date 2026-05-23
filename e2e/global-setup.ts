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
}
