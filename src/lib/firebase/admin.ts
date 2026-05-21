// Firebase Admin — server-only. Used by API routes to write engagement
// snapshots, Reason events, mint custom claims (teacher role), and
// generally make privileged writes that bypass Firestore/RTDB rules.
//
// Reads the service account from FIREBASE_SERVICE_ACCOUNT_PATH (a local
// JSON file under ./secrets/, gitignored). If you ever deploy to Vercel,
// switch to FIREBASE_SERVICE_ACCOUNT_JSON (base64'd JSON in the env).

import "server-only";
import { readFileSync } from "fs";
import { resolve } from "path";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
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

  // Prefer the env-as-JSON path (works in Vercel); fall back to the local
  // service-account file under ./secrets/.
  let credential: ReturnType<typeof cert> | null = null;
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
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
    } else {
      return { ready: false, reason: "Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON in .env.local" };
    }
  } catch (err) {
    return {
      ready: false,
      reason: `Failed to load service account: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  app = getApps()[0] ?? initializeApp({ credential, databaseURL });

  return { ready: true, app, db: getFirestore(app), rtdb: getDatabase(app), auth: getAuth(app) };
}
