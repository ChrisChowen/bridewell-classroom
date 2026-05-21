#!/usr/bin/env node
// Pull the live class's conversations + classifier snapshots + Reason events
// + interventions so we can grade the three demo scenarios honestly.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(
  readFileSync(resolve(__dirname, "../../secrets/firebase-admin.json"), "utf8")
);
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const CLASS_ID = "237nbCZ9hOdEmhQhIL1g";

const pupils = [
  { uid: "1FlrNBXtgGbmcna4Y0UJYOPoemi1", name: "Marcus Holt", scenario: "A (flowing)" },
  { uid: "DOn3QAIwxWVbwQiSjyZIR3CN23x2", name: "Priya Adesina", scenario: "C (productive_struggle)" },
  { uid: "DTSbgsQ0iWWjjWJMKfun2ViDb0Q2", name: "Tom Reeves", scenario: "B (wheel_spinning)" },
  { uid: "OvcVJY8kegOWGijMWoOGcA0HmE23", name: "Bertie Lawson", scenario: "B' (disengaged/wheel)" },
  { uid: "zTdcqpW5dcYTx7thOSfNkHGccxr1", name: "Jacob Pritchard", scenario: "off_task" },
];

console.log(`\n========== AUDIT · class ${CLASS_ID} ==========\n`);

// 1) global counts
const snaps = await db
  .collection("engagementSnapshots")
  .where("sessionId", "==", CLASS_ID)
  .get();
console.log(`engagementSnapshots total: ${snaps.size}`);

const interv = await db
  .collection("interventions")
  .where("classId", "==", CLASS_ID)
  .get()
  .catch(() => ({ size: 0, docs: [] }));
console.log(`interventions total: ${interv.size}`);

// reason events live where?
for (const coll of ["reasonEvents", "reasonInteractions"]) {
  try {
    const r = await db.collection(coll).where("classId", "==", CLASS_ID).get();
    console.log(`${coll} total: ${r.size}`);
    r.docs.slice(0, 3).forEach((d) => {
      const x = d.data();
      console.log(`  - pupil ${x.pupilDisplayName ?? x.pupilId} · branch=${x.branch} · conf=${x.confidence}`);
    });
  } catch (e) {
    console.log(`${coll}: ${e.message}`);
  }
}

for (const p of pupils) {
  console.log(`\n----- ${p.name} (${p.scenario}) -----`);
  const convoId = `${CLASS_ID}_${p.uid}`;
  const msgsRaw = await db
    .collection("conversations")
    .doc(convoId)
    .collection("messages")
    .get();
  // sort manually by any timestamp-ish field
  const sorted = msgsRaw.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const at = a.timestamp ?? a.createdAt ?? a.ts ?? a.id;
      const bt = b.timestamp ?? b.createdAt ?? b.ts ?? b.id;
      const av = typeof at === "object" && at?.toMillis ? at.toMillis() : Number(at) || String(at);
      const bv = typeof bt === "object" && bt?.toMillis ? bt.toMillis() : Number(bt) || String(bt);
      return av > bv ? 1 : av < bv ? -1 : 0;
    });
  console.log(`messages: ${sorted.length}`);
  sorted.forEach((x, i) => {
    const meta = [];
    if (x.meta?.scaffoldAction) meta.push(`SCAFFOLD:${x.meta.scaffoldAction}`);
    if (x.meta?.reasonEvent) meta.push(`REASON`);
    if (x.meta?.fallback) meta.push("FALLBACK");
    if (x.meta?.interventionId) meta.push("INTERVENTION");
    if (x.kind && x.kind !== "message") meta.push(`KIND:${x.kind}`);
    const m_ = meta.length ? ` [${meta.join(" ")}]` : "";
    console.log(
      `  ${i + 1}. ${x.role}${m_}: ${(x.content ?? "").slice(0, 180)}`
    );
  });

  // pupil's classifier snapshots
  const pSnaps = snaps.docs
    .map((d) => d.data())
    .filter((s) => s.pupilId === p.uid)
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  console.log(`  classifier snapshots: ${pSnaps.length}`);
  pSnaps.forEach((s, i) => {
    console.log(`    ${i + 1}. ${s.state} (${(s.confidence * 100).toFixed(0)}%) — ${(s.rationale ?? "").slice(0, 150)}`);
  });
}

console.log(`\n========== END AUDIT ==========\n`);
process.exit(0);
