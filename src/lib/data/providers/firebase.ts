// Firestore adapter for the data seam. Wraps getAdmin().db so feature code
// reads entities through the store, not the raw collection API.

import { getAdmin } from "@/lib/firebase/admin";
import type { DataStore } from "../types";
import type { ClassRecord, PupilRecord, LearnerProfile } from "@/types";

function db() {
  const a = getAdmin();
  if (!a.ready) throw new Error(`Admin not ready: ${a.reason}`);
  return a.db;
}

export class FirebaseDataStore implements DataStore {
  readonly name = "firebase";

  async getClass(id: string): Promise<ClassRecord | null> {
    const snap = await db().collection("classes").doc(id).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as ClassRecord) : null;
  }

  async getPupil(id: string): Promise<PupilRecord | null> {
    const snap = await db().collection("pupils").doc(id).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as PupilRecord) : null;
  }

  async getLearnerProfile(pupilId: string): Promise<LearnerProfile | null> {
    const snap = await db().collection("learnerProfiles").doc(pupilId).get();
    return snap.exists ? (snap.data() as LearnerProfile) : null;
  }
}
