import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { normaliseJoinCode } from "@/lib/joinCode";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import type { PupilRecord } from "@/types";
import { createHash } from "crypto";

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

  let decoded;
  try {
    decoded = await a.auth.verifyIdToken(body.idToken);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const code = normaliseJoinCode(body.joinCode);
  const codeDoc = await a.db.collection("joinCodes").doc(code).get();
  if (!codeDoc.exists) {
    return NextResponse.json({ error: "Unknown class code" }, { status: 404 });
  }
  const { classId } = codeDoc.data() as { classId: string };

  const classDoc = await a.db.collection("classes").doc(classId).get();
  if (!classDoc.exists) {
    return NextResponse.json({ error: "Class no longer exists" }, { status: 404 });
  }
  const cls = classDoc.data();

  // If the pupil is switching classes, clear their old RTDB live entry
  // so the previous teacher's dashboard doesn't keep showing them.
  const existing = await a.db.collection("pupils").doc(decoded.uid).get();
  if (existing.exists) {
    const prev = existing.data() as { classId?: string };
    if (prev.classId && prev.classId !== classId) {
      await a.rtdb.ref(`liveSessions/${prev.classId}/pupils/${decoded.uid}`).remove().catch(() => {});
    }
  }

  const pupil: PupilRecord = {
    id: decoded.uid,
    classId,
    displayName: body.displayName.trim().slice(0, 64),
    joinedAt: Date.now(),
    ...(body.pin && /^\d{4}$/.test(body.pin)
      ? { pinHash: createHash("sha256").update(`bw-${classId}-${body.pin}`).digest("hex") }
      : {}),
  };

  await a.db.collection("pupils").doc(decoded.uid).set(pupil, { merge: true });

  return NextResponse.json({ ok: true, pupil, class: cls });
}
