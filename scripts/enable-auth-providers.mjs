#!/usr/bin/env node
// One-off setup: enable Email/Password + Anonymous sign-in providers on
// the Firebase project via the Identity Toolkit Admin REST API. Uses the
// service-account JSON to mint an OAuth2 token. Safe to re-run.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleAuth } from "google-auth-library";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SA_PATH = resolve(__dirname, "../secrets/firebase-admin.json");
const sa = JSON.parse(readFileSync(SA_PATH, "utf8"));

const auth = new GoogleAuth({
  credentials: sa,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});
const token = await auth.getAccessToken();
const projectId = sa.project_id;

async function patch(payload, mask) {
  const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config?updateMask=${encodeURIComponent(mask)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data, null, 2)}`);
  }
  return data;
}

async function getConfig() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.json();
}

console.log(`Project: ${projectId}`);

const before = await getConfig();
console.log("Before:", JSON.stringify({
  email: before.signIn?.email,
  anonymous: before.signIn?.anonymous,
}, null, 2));

await patch(
  {
    signIn: {
      email: { enabled: true, passwordRequired: true },
      anonymous: { enabled: true },
      allowDuplicateEmails: false,
    },
  },
  "signIn.email,signIn.anonymous,signIn.allowDuplicateEmails"
);

const after = await getConfig();
console.log("After:", JSON.stringify({
  email: after.signIn?.email,
  anonymous: after.signIn?.anonymous,
}, null, 2));
console.log("✓ Auth providers enabled.");
