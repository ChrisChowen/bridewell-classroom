// Shared authorisation for pupil-data routes: verify the caller is a
// teacher who OWNS the class the pupil belongs to. Mirrors the
// firestore.rules scoping (classOwner) on the server side, so the GDPR
// export/erasure routes can never touch a pupil outside the caller's
// own class.

import "server-only";
import { getAdmin, type AdminBundle } from "@/lib/firebase/admin";

export type PupilAuthResult =
  | { ok: true; admin: Extract<AdminBundle, { ready: true }>; classId: string; teacherUid: string }
  | { ok: false; status: number; error: string };

export async function authorisePupilAccess(
  req: Request,
  pupilId: string
): Promise<PupilAuthResult> {
  const admin = getAdmin();
  if (!admin.ready) return { ok: false, status: 500, error: `Admin not ready: ${admin.reason}` };

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, status: 401, error: "Missing bearer token" };

  let decoded;
  try {
    decoded = await admin.auth.verifyIdToken(token);
  } catch {
    return { ok: false, status: 401, error: "Invalid token" };
  }
  if (decoded.role !== "teacher") return { ok: false, status: 403, error: "Teacher role required" };

  const pupilSnap = await admin.db.collection("pupils").doc(pupilId).get();
  if (!pupilSnap.exists) return { ok: false, status: 404, error: "Pupil not found" };
  const classId = (pupilSnap.data()?.classId as string) ?? "";
  if (!classId) return { ok: false, status: 409, error: "Pupil has no class" };

  const classSnap = await admin.db.collection("classes").doc(classId).get();
  if (!classSnap.exists || classSnap.data()?.teacherId !== decoded.uid) {
    return { ok: false, status: 403, error: "You can only access pupils in your own classes" };
  }

  return { ok: true, admin, classId, teacherUid: decoded.uid };
}
