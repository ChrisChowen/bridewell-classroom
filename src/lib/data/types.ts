// Data seam — the interface for the domain reads/writes that feature code
// shares, so the datastore (Firestore + RTDB today) can be substituted
// behind one boundary. Mirrors the model + auth seams.
//
// Scope note: this starts with the highest-traffic, cross-route ENTITY
// operations (class + pupil lookups). The collection-specific analytics
// writes + the RTDB live mirror remain in their own modules for now; they
// fold in behind this interface as routes migrate (tracked in
// PILOT_READINESS.md). The point is that no NEW feature code should reach
// for getAdmin().db directly — it goes through the store.

import type { ClassRecord, PupilRecord, LearnerProfile } from "@/types";

export interface DataStore {
  readonly name: string;
  getClass(id: string): Promise<ClassRecord | null>;
  getPupil(id: string): Promise<PupilRecord | null>;
  getLearnerProfile(pupilId: string): Promise<LearnerProfile | null>;

  // Single-doc writes. `merge:true` patches the named fields (leaving the
  // rest untouched); `merge:false`/omitted overwrites the doc. Multi-doc
  // ATOMIC writes (e.g. class + join-code) are deliberately NOT modelled
  // here yet — those stay in the routes until the seam grows a
  // transaction primitive (tracked in PILOT_READINESS.md).
  savePupil(id: string, data: Partial<PupilRecord>, opts?: { merge?: boolean }): Promise<void>;
  saveLearnerProfile(
    pupilId: string,
    data: Partial<LearnerProfile>,
    opts?: { merge?: boolean },
  ): Promise<void>;
}
