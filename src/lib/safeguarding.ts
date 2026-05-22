// Safeguarding audit trail. Server-only.
//
// Every medium/high disclosure writes a permanent safeguardingEvents doc
// (the audit record). When a teacher marks the pupil reviewed, we stamp
// the open events with WHO reviewed, WHEN, and any note — so the school
// can always account for how each disclosure was handled. This is the
// minimum an inspectable safeguarding process requires; the DSL-routing
// policy (who is escalated to) is an institutional decision drafted in
// docs/safeguarding-routing-policy.md, not encoded here.

import "server-only";
import type { Firestore } from "firebase-admin/firestore";

export interface SafeguardingReviewResult {
  reviewedCount: number;
}

/**
 * Stamp all OPEN safeguarding events for a pupil as reviewed, recording
 * the reviewer + timestamp + optional note. Returns how many events were
 * closed. Idempotent: re-running finds no open events and returns 0.
 */
export async function markSafeguardingReviewed(
  db: Firestore,
  pupilId: string,
  reviewerUid: string,
  note: string | null,
  now: number = Date.now()
): Promise<SafeguardingReviewResult> {
  const open = await db
    .collection("safeguardingEvents")
    .where("pupilId", "==", pupilId)
    .where("reviewed", "==", false)
    .get();
  if (open.empty) return { reviewedCount: 0 };

  const batch = db.batch();
  for (const d of open.docs) {
    batch.update(d.ref, {
      reviewed: true,
      reviewedBy: reviewerUid,
      reviewedAt: now,
      reviewNote: note,
    });
  }
  await batch.commit();
  return { reviewedCount: open.size };
}
