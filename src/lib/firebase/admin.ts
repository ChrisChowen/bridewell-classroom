// Firebase Admin — server-only. Used by API routes to write engagement
// snapshots, Reason events, mint custom claims (teacher role), and
// generally make privileged writes that bypass Firestore/RTDB rules.
//
// Credential resolution order:
//   1. FIREBASE_SERVICE_ACCOUNT_JSON env var (preferred — works on any
//      host, raw JSON or base64).
//   2. FIREBASE_SERVICE_ACCOUNT_PATH file (gitignored local dev path).
//   3. Application Default Credentials — used automatically when the
//      function is running on GCP (Cloud Functions / Cloud Run). The
//      service account attached to the function has Firebase access
//      out of the box, so no explicit credential is needed.
//
// Previously, missing env-var + missing file path produced a
// `ready: false` return, but the deployed Cloud Function fell back to
// `initializeApp()` with no credential anyway when ADC was available.
// We now make that explicit: if no env credential is found, try ADC
// and only fail if that fails too.

import "server-only";
import { readFileSync } from "fs";
import { resolve } from "path";
import { cert, getApps, initializeApp, applicationDefault, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getDatabase, type Database } from "firebase-admin/database";
import { getAuth, type Auth } from "firebase-admin/auth";

let app: App | null = null;

export type AdminBundle =
  | { ready: true; app: App; db: Firestore; rtdb: Database; auth: Auth }
  | { ready: false; reason: string };

export function getAdmin(): AdminBundle {
  if (app) {
    return { ready: true, app, db: getFirestore(app), rtdb: getDatabase(app), auth: getAuth(app) };
  }

  // If another part of the codebase already initialised the default app
  // (e.g. firebase-functions framework), reuse it.
  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return { ready: true, app, db: getFirestore(app), rtdb: getDatabase(app), auth: getAuth(app) };
  }

  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    process.env.GCLOUD_PROJECT ??
    process.env.GOOGLE_CLOUD_PROJECT;

  let credential: ReturnType<typeof cert> | null = null;
  try {
    if (inlineJson) {
      const decoded = inlineJson.startsWith("{")
        ? inlineJson
        : Buffer.from(inlineJson, "base64").toString("utf8");
      credential = cert(JSON.parse(decoded));
    } else if (filePath) {
      const abs = resolve(process.cwd(), filePath);
      const sa = JSON.parse(readFileSync(abs, "utf8"));
      credential = cert(sa);
    }
  } catch (err) {
    return {
      ready: false,
      reason: `Failed to load service account: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  try {
    app = initializeApp({
      credential: credential ?? applicationDefault(),
      databaseURL,
      projectId,
    });
  } catch (err) {
    return {
      ready: false,
      reason: `Failed to initialise Firebase Admin: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  return { ready: true, app, db: getFirestore(app), rtdb: getDatabase(app), auth: getAuth(app) };
}
