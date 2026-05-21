"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Crest } from "@/components/shared/Crest";
import { ClassField } from "@/components/teacher/ClassField";
import { subscribeToLiveClass, type LiveClass } from "@/lib/firebase/live";
import { getFirebase } from "@/lib/firebase/client";
import { signInAnonymously } from "firebase/auth";

// Classroom display mode — the whiteboard / projector view. This is NOT
// the teacher's dashboard on a bigger screen. It is the pupils' view of
// themselves AS A CLASS: a collective progress vessel that fills as
// everyone moves through the lesson, a constellation of star points
// (one per pupil, NO names) coloured by engagement state, and a quiet
// ticker of shared moments ("the class is finding limiting factors
// tricky"). Designed to be glanceable from across the room and to make
// the room feel like a single working group — not a surveillance
// surface.
//
// URL contract:  /classroom?classId=<id>&title=<lesson title>&steps=<N>
// The class detail page generates this link with a one-click button.
//
// What is deliberately ABSENT:
//   - Pupil names (the teacher's dashboard has those; the room doesn't)
//   - Verbatim safeguarding text (we hint via a calm crimson pulse only)
//   - Hard alerts / red flashes (the whiteboard is a working surface,
//     not an incident display)

export default function ClassroomDisplay() {
  return (
    <Suspense fallback={<Loading />}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const params = useSearchParams();
  const classId = params.get("classId") ?? "";
  const title = params.get("title") ?? "Lesson in progress";
  const stepsParam = params.get("steps");
  const stepCount = stepsParam ? Math.max(1, parseInt(stepsParam, 10) || 1) : 4;
  const className = params.get("class") ?? "";

  const [live, setLive] = useState<LiveClass | null>(null);
  const [tickIndex, setTickIndex] = useState(0);

  useEffect(() => {
    if (!classId) return;
    // RTDB rules require auth != null. The whiteboard view is open in
    // the classroom (no teacher login), so we sign in anonymously
    // before subscribing. We only ever read pupil entries, never write.
    let unsub: (() => void) | undefined;
    (async () => {
      const fb = getFirebase();
      if (fb.ready && !fb.auth.currentUser) {
        try {
          await signInAnonymously(fb.auth);
        } catch {
          /* If anon sign-in is disabled the subscription will silently
             return empty — better than crashing the projector. */
        }
      }
      unsub = subscribeToLiveClass(classId, setLive);
    })();
    return () => {
      unsub?.();
    };
  }, [classId]);

  // Rotate the moment ticker on a slow cadence so it reads as a calm
  // background presence, not a notification feed.
  useEffect(() => {
    const id = setInterval(() => setTickIndex((i) => i + 1), 12_000);
    return () => clearInterval(id);
  }, []);

  const pupils = useMemo(() => Object.values(live?.pupils ?? {}), [live]);
  const totalCapacity = pupils.length * stepCount;
  const marbles = useMemo(
    () => pupils.reduce((acc, p) => acc + ((p.currentStepIndex ?? 0) + (isEngaged(p) ? 1 : 0)), 0),
    [pupils]
  );
  const fillRatio = totalCapacity > 0 ? Math.min(1, marbles / totalCapacity) : 0;

  const moments = useMemo(() => buildMoments(pupils), [pupils]);
  const moment = moments[tickIndex % Math.max(1, moments.length)] ?? defaultMoment(pupils);

  if (!classId) {
    return <NoClass />;
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "40px 56px",
        background: "var(--color-navy-900)",
        color: "var(--color-cream-50)",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: 24,
        overflow: "hidden",
      }}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crest size={36} />
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                opacity: 0.65,
                fontWeight: 600,
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                Bridewell Classroom · The Field
                <span
                  aria-hidden
                  title="Live"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: "var(--color-bridewell-red)",
                    boxShadow: "0 0 12px rgba(227, 6, 19, 0.55)",
                    animation: "bw-pulse 1.6s ease-in-out infinite",
                  }}
                />
              </span>
            </div>
            <div className="bw-display" style={{ fontSize: 28, lineHeight: 1.1 }}>
              {title}
            </div>
            {className && (
              <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>{className}</div>
            )}
          </div>
        </div>
        <ClassClock />
      </header>

      <ClassField
        pupils={pupils}
        fillRatio={fillRatio}
        marbles={marbles}
        capacity={totalCapacity}
        stepCount={stepCount}
      />

      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.12)",
          paddingTop: 18,
          display: "flex",
          alignItems: "center",
          gap: 16,
          minHeight: 56,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: "var(--color-gold-500)",
            animation: "bw-pulse 1.6s ease-in-out infinite",
            flexShrink: 0,
          }}
          aria-hidden
        />
        <div
          key={moment.text}
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 22,
            lineHeight: 1.3,
            animation: "bw-fade-in 600ms ease forwards",
          }}
        >
          {moment.text}
        </div>
      </footer>
    </main>
  );
}

function Loading() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--color-navy-900)",
        color: "var(--color-cream-50)",
        display: "grid",
        placeItems: "center",
      }}
    >
      <div style={{ opacity: 0.6 }}>Loading the class field…</div>
    </main>
  );
}

function NoClass() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--color-navy-900)",
        color: "var(--color-cream-50)",
        display: "grid",
        placeItems: "center",
        padding: 40,
      }}
    >
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <Crest size={48} />
        <h1 className="bw-display" style={{ fontSize: 32, marginTop: 18 }}>
          The Field
        </h1>
        <p style={{ marginTop: 10, opacity: 0.7, lineHeight: 1.55 }}>
          The whiteboard view for a live class. Open it from the class detail
          page — there is a “Whiteboard” button that hands the right class id
          to this surface.
        </p>
      </div>
    </main>
  );
}

function ClassClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const t = new Date(now);
  const hh = t.getHours().toString().padStart(2, "0");
  const mm = t.getMinutes().toString().padStart(2, "0");
  return (
    <div style={{ textAlign: "right" }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 26,
          letterSpacing: "0.05em",
          opacity: 0.9,
        }}
      >
        {hh}:{mm}
      </div>
      <div style={{ fontSize: 11, opacity: 0.5, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 2 }}>
        Lesson clock
      </div>
    </div>
  );
}

// --- Moments engine -----------------------------------------------------
//
// We derive a small set of class-wide observations from the live state.
// Order matters — the ticker rotates through whichever apply, falling
// through to a default when nothing notable is happening.

type Moment = { id: string; text: string };

import type { LivePupil } from "@/lib/firebase/live";

function isEngaged(p: LivePupil): boolean {
  return p.state === "flowing" || p.state === "productive_struggle";
}

function buildMoments(pupils: LivePupil[]): Moment[] {
  if (pupils.length === 0) return [];
  const out: Moment[] = [];

  // 1. The class is finding X tricky — when ≥30% of pupils are stuck on
  //    a recognisable shared concept (we proxy via "wheel_spinning"
  //    state and shared step index).
  const stuck = pupils.filter((p) => p.state === "wheel_spinning");
  if (stuck.length >= Math.max(2, Math.ceil(pupils.length * 0.3))) {
    out.push({
      id: "stuck",
      text: "The class is finding this part tricky — your teacher has the room.",
    });
  }

  // 2. Lovely focus — most of the class engaged with high confidence.
  const focused = pupils.filter(
    (p) => isEngaged(p) && p.confidence > 0.7
  );
  if (focused.length >= Math.ceil(pupils.length * 0.7)) {
    out.push({
      id: "focus",
      text: "Lovely focus across the room — keep going.",
    });
  }

  // 3. Step movement — call out when most of the class has advanced.
  const onLaterStep = pupils.filter((p) => (p.currentStepIndex ?? 0) >= 1);
  if (onLaterStep.length >= Math.ceil(pupils.length * 0.5)) {
    out.push({
      id: "moving",
      text: "Most of the class has moved on to the next step.",
    });
  }

  // 4. Safeguarding raised — calm, generic. No detail surfaced here.
  if (pupils.some((p) => p.safeguarding && p.safeguarding.severity !== "low")) {
    out.push({
      id: "safe",
      text: "Your teacher has been alerted to a private message — they will follow up.",
    });
  }

  // 5. Quiet — at least one pupil hasn't spoken in a while.
  const veryQuiet = pupils.filter(
    (p) => Date.now() - (p.lastActive ?? 0) > 120_000
  );
  if (veryQuiet.length >= 2) {
    out.push({
      id: "quiet",
      text: "A couple of pupils are taking their time — that's fine, thinking counts.",
    });
  }

  return out;
}

function defaultMoment(pupils: LivePupil[]): Moment {
  if (pupils.length === 0) {
    return { id: "wait", text: "Waiting for pupils to join the lesson…" };
  }
  return { id: "calm", text: "The room is working. Take your time." };
}
