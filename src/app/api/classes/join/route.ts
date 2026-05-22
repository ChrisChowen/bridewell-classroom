import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { verifyAuthToken } from "@/lib/auth";
import { resolveDataStore } from "@/lib/data";
import { normaliseJoinCode } from "@/lib/joinCode";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { anonKey } from "@/lib/live-keys";
import type { PupilRecord } from "@/types";
import { createHash } from "crypto";

// Clean a pupil-supplied display name: NFKC-normalise, strip control and
// zero-width characters (which would otherwise corrupt the teacher
// dashboard layout / CSV export), collapse whitespace, and cap length.
function cleanDisplayName(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64);
}

// POST /api/classes/join
//
// Called once the pupil has signed in anonymously and has an ID token.
// Validates the join code, creates the pupil document, and returns the
// class metadata so the session UI can render.

interface Body {
  idToken: string;
  joinCode: string;
  displayName: string;
  pin?: string; // optional 4-digit PIN
}

export async function POST(req: Request) {
  // Enumeration guard: cap join-code lookups by source IP. Anonymous
  // sign-in means UID-based limiting is trivially bypassed (mint a new
  // UID per guess), so we anchor to the network origin instead.
  const limited = await enforceRateLimit(req, RATE_LIMITS.join, { byIp: true });
  if (limited) return limited;

  const a = getAdmin();
  if (!a.ready) return NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.idToken || !body.joinCode || !body.displayName) {
    return NextResponse.json({ error: "idToken, joinCode, displayName required" }, { status: 400 });
  }

  const authed = await verifyAuthToken(body.idToken);
  if (!authed.ok) return NextResponse.json({ error: authed.error }, { status: authed.status });
  const uid = authed.user.uid;

  const code = normaliseJoinCode(body.joinCode);
  const codeDoc = await a.db.collection("joinCodes").doc(code).get();
  if (!codeDoc.exists) {
    return NextResponse.json({ error: "Unknown class code" }, { status: 404 });
  }
  const { classId } = codeDoc.data() as { classId: string };

  const store = resolveDataStore();
  const cls = await store.getClass(classId);
  if (!cls) {
    return NextResponse.json({ error: "Class no longer exists" }, { status: 404 });
  }

  // If the pupil is switching classes, clear their old RTDB live entry
  // so the previous teacher's dashboard doesn't keep showing them.
  const existing = await store.getPupil(uid);
  if (existing && existing.classId && existing.classId !== classId) {
    // Clear both the teacher-scoped live entry AND the public projector
    // aggregate slot so the previous class's dashboard and whiteboard
    // don't keep a ghost of this pupil.
    await a.rtdb.ref(`liveSessions/${existing.classId}/pupils/${uid}`).remove().catch(() => {});
    await a.rtdb.ref(`liveSessions/${existing.classId}/aggregate/${anonKey(uid)}`).remove().catch(() => {});
  }

  const displayName = cleanDisplayName(body.displayName);
  if (!displayName) {
    return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
  }

  const pupil: PupilRecord = {
    id: uid,
    classId,
    displayName,
    joinedAt: Date.now(),
    ...(body.pin && /^\d{4}$/.test(body.pin)
      ? { pinHash: createHash("sha256").update(`bw-${classId}-${body.pin}`).digest("hex") }
      : {}),
  };

  await store.savePupil(uid, pupil, { merge: true });

  return NextResponse.json({ ok: true, pupil, class: cls });
}
