import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { classifyEngagement, type ClassifierInput } from "@/layers/classifier";
import type { EngagementSnapshot } from "@/types";

// POST /api/engagement/run
//
// Called by the pupil session every 5 messages or 60s (whichever first).
// Verifies the caller is the pupil, runs the classifier, persists an
// engagementSnapshot to Firestore, mirrors the latest state to
// RTDB liveSessions/{classId}/pupils/{pupilId} for the teacher
// dashboard, and raises a safeguardingEvent if severity is medium+.
//
// Body:
//   {
//     idToken: <pupil's Firebase ID token>,
//     turns: [{ role: 'tutor'|'pupil', content: string }, ...]  (oldest first)
//     signals: { windowSec, avgResponseTimeSec?, avgMessageLength?, ... }
//     lessonTitle?, lessonSubject?, criticalConcepts?, pupilProfile?
//     // Optional: the last pupil-message excerpt to display on the
//     // dashboard card (the server can't trust the client message
//     // store but a quick preview is acceptable since the pupil also
//     // wrote the message).
//     lastPupilExcerpt?: string
//   }

interface Body extends ClassifierInput {
  idToken: string;
  lastPupilExcerpt?: string;
}

const MAX_TRAJECTORY = 24; // last 20 minutes at 50s windows

export async function POST(req: Request) {
  const a = getAdmin();
  if (!a.ready) {
    return NextResponse.json({ error: `Admin not ready: ${a.reason}` }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.idToken || !Array.isArray(body.turns) || !body.signals) {
    return NextResponse.json({ error: "idToken, turns, signals required" }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await a.auth.verifyIdToken(body.idToken);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Look up the pupil's class.
  const pupilSnap = await a.db.collection("pupils").doc(decoded.uid).get();
  if (!pupilSnap.exists) {
    return NextResponse.json({ error: "No pupil record" }, { status: 404 });
  }
  const pupil = pupilSnap.data() as { classId: string; displayName: string };

  // Run the classifier.
  const result = await classifyEngagement({
    turns: body.turns,
    signals: body.signals,
    lessonTitle: body.lessonTitle,
    lessonSubject: body.lessonSubject,
    criticalConcepts: body.criticalConcepts,
    pupilProfile: body.pupilProfile,
  });

  const now = Date.now();

  // 1. Append a snapshot to Firestore.
  const snapshot: EngagementSnapshot & {
    pupilDisplayName: string;
    rationale: string;
    cues: string[];
  } = {
    pupilId: decoded.uid,
    pupilDisplayName: pupil.displayName,
    sessionId: pupil.classId, // for now, one session per class
    timestamp: now,
    state: result.state,
    confidence: result.confidence,
    signals: body.signals,
    rationale: result.rationale,
    cues: result.cues,
  };
  await a.db.collection("engagementSnapshots").add(snapshot);

  // 2. Mirror latest state + a short trajectory to RTDB so the dashboard
  //    re-renders without polling.
  const liveRef = a.rtdb.ref(`liveSessions/${pupil.classId}/pupils/${decoded.uid}`);
  const existing = (await liveRef.get()).val() as {
    trajectory?: Array<{ state: string; t: number; confidence: number }>;
  } | null;
  const nextTrajectory = [
    ...((existing?.trajectory ?? []) as Array<{ state: string; t: number; confidence: number }>),
    { state: result.state, t: now, confidence: result.confidence },
  ].slice(-MAX_TRAJECTORY);

  await liveRef.set({
    pupilId: decoded.uid,
    displayName: pupil.displayName,
    state: result.state,
    confidence: result.confidence,
    rationale: result.rationale,
    cues: result.cues,
    lastActive: now,
    trajectory: nextTrajectory,
    lastPupilExcerpt: body.lastPupilExcerpt?.slice(0, 240) ?? null,
    scaffoldUsesRecent: body.signals.scaffoldUseCount ?? 0,
    classifierFallback: result.fallbackUsed ?? false,
    safeguarding:
      result.safeguarding.severity !== "none"
        ? {
            severity: result.safeguarding.severity,
            summary: result.safeguarding.summary,
            pupilExcerpt: result.safeguarding.pupilExcerpt ?? null,
            ts: now,
          }
        : null,
  });

  // 3. If safeguarding fired at medium+, write a permanent event for the
  //    teacher record.
  if (result.safeguarding.severity === "medium" || result.safeguarding.severity === "high") {
    await a.db.collection("safeguardingEvents").add({
      pupilId: decoded.uid,
      pupilDisplayName: pupil.displayName,
      classId: pupil.classId,
      timestamp: now,
      severity: result.safeguarding.severity,
      summary: result.safeguarding.summary,
      pupilExcerpt: result.safeguarding.pupilExcerpt ?? null,
      reviewed: false,
    });
  }

  return NextResponse.json({
    state: result.state,
    confidence: result.confidence,
    safeguarding: result.safeguarding,
  });
}
