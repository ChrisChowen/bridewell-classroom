// Firebase client — initialises once on the browser side. Server routes
// should use src/lib/firebase/admin.ts for privileged writes.
//
// Phase 1 connects the auth flows (teacher email/password, anonymous pupil
// join with class code), the Firestore reads, and the RTDB live-state
// channel. Phase 0 already has the SDK loaded so component code can land
// against this surface incrementally.

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getDatabase, type Database } from "firebase/database";

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
    // Only initialise RTDB once the URL is set (Phase 1 enables RTDB in console).
    if (config.databaseURL) {
      rtdb = getDatabase(app);
    }
  }
  return { ready: true as const, app, auth: auth!, db: db!, rtdb };
}
