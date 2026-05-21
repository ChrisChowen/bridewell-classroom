import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebase/admin";
import { classifyEngagement, type ClassifierInput } from "@/layers/classifier";
import type { EngagementSnapshot, ClassRecord } from "@/types";

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

  // Audit #10: verify the class hasn't been deleted mid-session before
  // we write the live mirror — otherwise we'd resurrect a stale class.
  const classExists = (await a.db.collection("classes").doc(pupil.classId).get()).exists;
  if (!classExists) {
    return NextResponse.json({ error: "Class no longer exists" }, { status: 404 });
  }

  // Audit #14: whitelist client-supplied lesson metadata before it
  // reaches the LLM prompt. Long titles or non-printable characters
  // would otherwise be a prompt-injection vector.
  function clean(s: string | undefined, max = 200): string | undefined {
    if (!s) return undefined;
    const ascii = s.normalize("NFKC").replace(/[\x00-\x1f\x7f]/g, "").trim();
    return ascii.length > max ? ascii.slice(0, max) : ascii;
  }
  const sanitised = {
    lessonTitle: clean(body.lessonTitle, 160),
    lessonSubject: clean(body.lessonSubject, 80),
    criticalConcepts: body.criticalConcepts?.slice(0, 12).map((c) => clean(c, 120)!).filter(Boolean),
    pupilProfile: clean(body.pupilProfile, 600),
  };

  // Run the classifier with sanitised inputs.
  const result = await classifyEngagement({
    turns: body.turns,
    signals: body.signals,
    lessonTitle: sanitised.lessonTitle,
    lessonSubject: sanitised.lessonSubject,
    criticalConcepts: sanitised.criticalConcepts,
    pupilProfile: sanitised.pupilProfile,
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
  //    re-renders without polling. Also update the step-progression
  //    streak and (if the streak threshold is met) advance the pupil to
  //    the next step in their lesson plan.
  const liveRef = a.rtdb.ref(`liveSessions/${pupil.classId}/pupils/${decoded.uid}`);

  // Read the lesson plan's step count + whether it has an extension.
  // The pupil can advance one position past the last step IF there's
  // an extension defined — that's how the high attainer crosses over
  // into the above-syllabus brief without the teacher having to
  // promote them manually.
  let sequenceLength = 1;
  let hasExtension = false;
  try {
    const classSnap = await a.db.collection("classes").doc(pupil.classId).get();
    const cls = classSnap.data() as ClassRecord | undefined;
    sequenceLength = cls?.lessonPlan?.sequence?.length ?? 1;
    hasExtension = !!cls?.lessonPlan?.extension;
  } catch {
    /* keep default — we never block on this */
  }
  const maxStepIndex = hasExtension ? sequenceLength : sequenceLength - 1;
  const ENGAGED: ReadonlyArray<string> = ["flowing", "productive_struggle"];
  const HIGH_CONF = 0.7;
  const STREAK_TO_ADVANCE = 2;
  const isEngaged = ENGAGED.includes(result.state) && result.confidence > HIGH_CONF;

  // Audit #3: collapse the read-modify-write of the trajectory into a
  // single transaction so two near-simultaneous classifier calls can't
  // overwrite each other's snapshots. The transaction body is pure: it
  // reads the current value, computes the next one, and the RTDB
  // server retries until the commit lands without a conflict.
  let nextStepIndex = 0;
  let advanced = false;
  await liveRef.transaction((current) => {
    const c = (current ?? {}) as {
      trajectory?: Array<{ state: string; t: number; confidence: number }>;
      currentStepIndex?: number;
      sustainedHighStreak?: number;
    };
    const trajectory = [
      ...((c.trajectory ?? []) as Array<{ state: string; t: number; confidence: number }>),
      { state: result.state, t: now, confidence: result.confidence },
    ].slice(-MAX_TRAJECTORY);
    const prevStreak = c.sustainedHighStreak ?? 0;
    const nextStreak = isEngaged ? prevStreak + 1 : 0;
    const prevStepIndex = c.currentStepIndex ?? 0;
    let stepIndex = prevStepIndex;
    let didAdvance = false;
    if (nextStreak >= STREAK_TO_ADVANCE && prevStepIndex < maxStepIndex) {
      stepIndex = prevStepIndex + 1;
      didAdvance = true;
    }
    nextStepIndex = stepIndex;
    advanced = didAdvance;
    return {
      pupilId: decoded.uid,
      displayName: pupil.displayName,
      state: result.state,
      confidence: result.confidence,
      rationale: result.rationale,
      cues: result.cues,
      lastActive: now,
      trajectory,
      lastPupilExcerpt: body.lastPupilExcerpt?.slice(0, 240) ?? null,
      scaffoldUsesRecent: body.signals.scaffoldUseCount ?? 0,
      currentStepIndex: stepIndex,
      sustainedHighStreak: didAdvance ? 0 : nextStreak,
      // Reset the optimistic counters now that a full snapshot has
      // landed — they exist to fill the gap between classifications.
      liveMessageCount: 0,
      lastMessageAt: now,
      classifierFallback: result.fallbackUsed ?? false,
      classifierTier: result.tier ?? "pro",
      safeguarding:
        result.safeguarding.severity !== "none"
          ? {
              severity: result.safeguarding.severity,
              summary: result.safeguarding.summary,
              pupilExcerpt: result.safeguarding.pupilExcerpt ?? null,
              ts: now,
            }
          : null,
    };
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
    currentStepIndex: nextStepIndex,
    stepAdvanced: advanced,
    classifierTier: result.tier ?? "pro",
  });
}
