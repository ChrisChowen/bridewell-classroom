import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import type { School, TeacherRecord } from "@/types";

// POST /api/auth/teacher
//
// Called by the client right after createUserWithEmailAndPassword. We
// verify the freshly-minted ID token, set a custom claim (`role: 'teacher'`)
// so the Firestore + RTDB rules will accept this user as a teacher, and
// write the teacher document.
//
// Body: { idToken, displayName, school, role }

interface Body {
  idToken: string;
  displayName: string;
  school: School;
  role: string;
}

export async function POST(req: Request) {
  const a = getAdmin();
  if (!a.ready) {
    return NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 });
  }
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.idToken || !body.displayName || !body.school) {
    return NextResponse.json({ error: "idToken, displayName, school required" }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await a.auth.verifyIdToken(body.idToken);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid ID token: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 401 }
    );
  }

  // Email allowlist — only addresses on `allowedTeacherEmails` (managed
  // by the Bridewell admin out of band) can become teachers. Prevents
  // pupils from upgrading themselves to teacher accounts. The allowlist
  // is keyed by lower-cased email; the doc id IS the email.
  const email = (decoded.email ?? "").toLowerCase().trim();
  if (!email) {
    return NextResponse.json({ error: "No email on token" }, { status: 400 });
  }

  // Bootstrap exception: if the collection is empty, allow the very
  // first teacher to register (they become the founding admin). This
  // means the first deploy doesn't need manual setup. After that, every
  // new teacher must be added by an existing admin.
  //
  // The allowlist supports two entry shapes:
  //   1. Exact email — doc id IS the email (e.g. jane@kesw.org)
  //   2. Domain wildcard — doc id is "*@<domain>" (e.g. "*@kesw.org")
  //      letting a school whitelist its entire staff domain without
  //      enumerating every teacher.
  const allowlistSnap = await a.db.collection("allowedTeacherEmails").limit(1).get();
  if (!allowlistSnap.empty) {
    const exactDoc = await a.db.collection("allowedTeacherEmails").doc(email).get();
    let allowed = exactDoc.exists;
    if (!allowed) {
      // Try the domain wildcard.
      const at = email.lastIndexOf("@");
      if (at > 0) {
        const domain = email.slice(at + 1);
        const wildcardDoc = await a.db
          .collection("allowedTeacherEmails")
          .doc(`*@${domain}`)
          .get();
        allowed = wildcardDoc.exists;
      }
    }
    if (!allowed) {
      return NextResponse.json(
        {
          error:
            "This email is not on the teacher allowlist. Ask your Bridewell admin to add it.",
        },
        { status: 403 }
      );
    }
  } else {
    // First teacher — auto-add them to the allowlist and mark as admin.
    await a.db.collection("allowedTeacherEmails").doc(email).set({
      email,
      addedAt: Date.now(),
      addedBy: "bootstrap",
      isAdmin: true,
    });
  }

  try {
    await a.auth.setCustomUserClaims(decoded.uid, { role: "teacher" });

    const teacher: TeacherRecord = {
      id: decoded.uid,
      email: decoded.email ?? "",
      displayName: body.displayName,
      school: body.school,
      role: body.role || "Teacher",
      createdAt: Date.now(),
    };
    await a.db.collection("teachers").doc(decoded.uid).set(teacher);
    return NextResponse.json({ ok: true, teacher });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 500 }
    );
  }
}
