// Playwright global setup for the emulator-backed demo-flow specs. Seeds a
// class + join code into the Firestore emulator so the pupil-join / lesson
// specs have something to join. Runs in node; firebase-admin auto-targets
// the emulator via the FIRESTORE_EMULATOR_HOST env that `firebase
// emulators:exec` sets — no real credential, no real-pupil data.
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const E2E = {
  classId: "e2e-class-1",
  // Canonical dashed form — normaliseJoinCode() stores/looks up codes as
  // XXX-XXX, so the joinCodes doc id and the class's joinCode field must
  // both use the dash (a plain "ABCDEF" doc id is never matched).
  joinCode: "ABC-DEF",
  className: "E2E Biology",
  subject: "Biology",
  teacherId: "e2e-teacher",
};

export default async function globalSetup() {
  const app = getApps()[0] ?? initializeApp({ projectId: "bridewell-classroom" });
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
}
