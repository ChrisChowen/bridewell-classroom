// Firebase client — initialises once on the browser side. Server routes
// should use src/lib/firebase/admin.ts for privileged writes.
//
// Phase 1 connects the auth flows (teacher email/password, anonymous pupil
// join with class code), the Firestore reads, and the RTDB live-state
// channel. Phase 0 already has the SDK loaded so component code can land
// against this surface incrementally.

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getDatabase, connectDatabaseEmulator, type Database } from "firebase/database";

// e2e/local-only: when NEXT_PUBLIC_FIREBASE_EMULATOR=1 the client talks to the
// local Firebase emulator suite (auth 9099 / firestore 8080 / database 9000)
// instead of the live project. Strictly opt-in via env — never active in a
// real build — so the Playwright e2e harness can drive a seeded, isolated
// backend with no risk to production or real-pupil data.
const USE_EMULATOR = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "1";
let emulatorWired = false;

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let rtdb: Database | null = null;

export function getFirebase() {
  if (!config.apiKey) {
    return { ready: false as const, reason: "Firebase env not set" };
  }
  if (!app) {
    app = getApps()[0] ?? initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
    if (USE_EMULATOR && !emulatorWired) {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
    }
  }
  // Ensure RTDB lazily whenever the URL is configured — not only on the very
  // first init. If the app singleton was created elsewhere (getApps()[0])
  // without rtdb, the live dashboard would otherwise silently no-op forever.
  if (!rtdb && config.databaseURL && app) {
    rtdb = getDatabase(app);
    if (USE_EMULATOR && !emulatorWired) connectDatabaseEmulator(rtdb, "127.0.0.1", 9000);
  }
  if (USE_EMULATOR) emulatorWired = true;
  return { ready: true as const, app, auth: auth!, db: db!, rtdb };
}
