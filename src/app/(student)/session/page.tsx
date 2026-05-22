"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crest } from "@/components/shared/Crest";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { ConnectionPill } from "@/components/shared/ConnectionPill";
import { ChatSurface } from "@/components/student/ChatSurface";
import { ClosingScreen } from "@/components/student/ClosingScreen";
import { AccessibilityMenu } from "@/components/student/AccessibilityMenu";
import { useAuth } from "@/lib/firebase/auth-context";
import { getFirebase } from "@/lib/firebase/client";
import { getCleanIdToken } from "@/lib/firebase/auth-fetch";
import { subscribeToSessionStatus, type SessionStatus } from "@/lib/firebase/live";
import { SessionOverlay } from "@/components/student/SessionOverlay";
import { demoLesson } from "@/lib/demo/data";
import type { ClassRecord, PupilRecord } from "@/types";

// Pupil session page.
// 1. If the pupil is signed in (anonymous Firebase Auth + has a pupil
//    record), fetch their class + lesson plan and feed it to the
//    ChatSurface. The tutor anchors to the approved plan.
// 2. If there's no pupil record (someone landed here directly, or
//    they're previewing), fall back to the demo lesson so the surface
//    stays exercisable.

export default function SessionPage() {
  const router = useRouter();
  const { user, status, displayName } = useAuth();
  const [klass, setKlass] = useState<ClassRecord | null>(null);
  const [pupil, setPupil] = useState<PupilRecord | null>(null);
  const [effectiveChallengeLevel, setEffectiveChallengeLevel] = useState<
    "foundation" | "core" | "stretch" | undefined
  >(undefined);
  const [pupilProfile, setPupilProfile] = useState<string | undefined>(undefined);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "preview" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);

  // Subscribe to the class session status so we can show the closing
  // screen the moment the teacher ends the lesson.
  useEffect(() => {
    if (!klass) return;
    const unsub = subscribeToSessionStatus(klass.id, setSessionStatus);
    return unsub;
  }, [klass]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (status === "loading") return;
      // Not signed in — this is the design-preview path (anyone landing
      // at /session without auth). Show the demo lesson, but clearly.
      if (!user) {
        setLoadState("preview");
        return;
      }
      // Teacher previewing — they get demo lesson too. Status "teacher"
      // shouldn't really land here but we tolerate it.
      if (status === "teacher") {
        setLoadState("preview");
        return;
      }
      const fb = getFirebase();
      if (!fb.ready) {
        setLoadState("preview");
        return;
      }
      setLoadState("loading");

      // Fast path: if we JUST joined (the join page stashed its result for THIS
      // uid), render straight from that payload. The deployed backend has a
      // read-after-write lag — the just-created pupil doc isn't readable via
      // pupils/me for a short window — so an immediate read 404s and bounced
      // the pupil back to /join. Trust the join response we already have.
      try {
        const raw = sessionStorage.getItem("bw-just-joined");
        if (raw) {
          const p = JSON.parse(raw) as {
            uid?: string;
            ts?: number;
            pupil?: PupilRecord;
            class?: ClassRecord;
          };
          if (p?.uid === user.uid && p.class && p.pupil && Date.now() - (p.ts ?? 0) < 120_000) {
            sessionStorage.removeItem("bw-just-joined");
            if (cancelled) return;
            setKlass(p.class);
            setPupil(p.pupil);
            // A brand-new pupil has no learner profile or SEND profile yet, so
            // the lesson-wide defaults are correct. pupils/me (with its richer
            // adaptive/SEND fields) takes over on the next visit, once the doc
            // is readable.
            setEffectiveChallengeLevel(
              (p.class.lessonPlan?.challengeLevel as
                | "foundation"
                | "core"
                | "stretch"
                | undefined) ?? "core"
            );
            setPupilProfile(undefined);
            setLoadState("ready");
            return;
          }
          // Stale or mismatched payload — drop it and fall through to pupils/me.
          sessionStorage.removeItem("bw-just-joined");
        }
      } catch {
        /* sessionStorage parse/availability issue — fall through to pupils/me */
      }

      try {
        // Right after a fresh anonymous join the auth state is still settling:
        // Firebase fires an immediate securetoken refresh (which briefly leaves
        // currentUser/token null), and the just-written pupil record can lag a
        // beat behind the join response. Bouncing to /join on the FIRST
        // transient null-token / 404 was the "join succeeds but returns to the
        // code screen" bug. Retry a few times before giving up; each attempt
        // re-reads the LIVE currentUser via getCleanIdToken (which also strips
        // control chars + is null-safe for the iOS-Safari header-pattern error).
        for (let attempt = 0; attempt < 5; attempt++) {
          if (cancelled) return;
          const token = await getCleanIdToken();
          if (token) {
            const res = await fetch("/api/pupils/me", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (cancelled) return;
            if (res.ok) {
              const data = await res.json();
              if (cancelled) return;
              setKlass(data.class as ClassRecord);
              setPupil(data.pupil as PupilRecord);
              setEffectiveChallengeLevel(data.effectiveChallengeLevel);
              setPupilProfile(data.pupilProfile);
              setLoadState("ready");
              return;
            }
            if (res.status !== 404) {
              // A real failure (not "no pupil record yet").
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error ?? "Failed to load class");
            }
            // 404 → record not visible yet; fall through to wait + retry.
          }
          // No token yet (auth settling) or a transient 404 — wait, then retry.
          await new Promise((r) => setTimeout(r, 500));
        }
        // Still nothing after ~2.5s of retries — genuinely not in a class.
        // Don't silently show the demo lesson (that caused the "photosynthesis
        // appeared then switched to IR" confusion); send them to join.
        if (!cancelled) router.replace("/join");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load");
        setLoadState("error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // Depend on the STABLE uid, not the user object: a token refresh swaps the
    // User reference without changing identity, and re-running this effect mid
    // refresh (transient null token) was bouncing a loaded session to /join.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, status, router]);

  // Live subscription to the class doc so mid-lesson plan edits
  // propagate to the pupil without a refresh. The classifier-driven
  // currentStepIndex stays where it is (no rewind); the tutor picks
  // up the new step content on the next turn.
  useEffect(() => {
    if (!klass?.id) return;
    let cancelled = false;
    // Hoist the unsubscribe so the EFFECT cleanup can call it. Previously the
    // cleanup was returned from the inner async IIFE (discarded), so the
    // Firestore listener was never detached on unmount/class-change — a leak
    // that compounded each time the pupil switched class.
    let unsub: (() => void) | undefined;
    (async () => {
      const fb = getFirebase();
      if (!fb.ready || !fb.db) return;
      const { doc, onSnapshot } = await import("firebase/firestore");
      if (cancelled) return; // unmounted during the dynamic import
      unsub = onSnapshot(doc(fb.db, "classes", klass.id), (snap) => {
        if (cancelled || !snap.exists()) return;
        const next = { id: snap.id, ...(snap.data() as Omit<ClassRecord, "id">) };
        setKlass(next);
      });
      if (cancelled) unsub(); // unmounted between import and subscribe
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [klass?.id]);

  const lessonTitle =
    klass?.lessonPlan?.title ?? klass?.subject ?? demoLesson.title;
  const className = klass?.name ?? demoLesson.className;
  const pupilName = pupil?.displayName ?? displayName ?? "you";

  return (
    <main style={{ height: "100dvh", minHeight: 0, display: "grid", gridTemplateRows: "auto 1fr" }}>
      <header
        className="bw-topbar"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
          alignItems: "center",
          gap: 10,
          padding: "12px clamp(12px, 4vw, 20px)",
          borderBottom: "1px solid var(--line)",
          background: "var(--surface)",
        }}
      >
        <Link href="/" aria-label="Bridewell Classroom home" className="flex items-center gap-2">
          <Crest size={28} />
          <span className="bw-display" style={{ fontSize: 15 }}>Bridewell</span>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              borderLeft: "1px solid var(--line)",
              paddingLeft: 10,
              marginLeft: 4,
            }}
          >
            Classroom
          </span>
        </Link>

        <div className="bw-topbar-centre" style={{ textAlign: "center", minWidth: 0 }}>
          <div className="bw-section-label" style={{ marginBottom: 2 }}>
            {className}
          </div>
          <div
            className="bw-display"
            style={{
              fontSize: 14,
              maxWidth: 480,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {lessonTitle}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <ConnectionPill />
          <AccessibilityMenu />
          <span className="bw-hide-sm"><ThemeToggle /></span>
          <Link
            href="/join"
            className="bw-btn-secondary"
            style={{ fontSize: 11 }}
          >
            Switch class
          </Link>
          <span
            className="bw-card"
            style={{
              padding: "6px 12px",
              fontSize: 12,
              color: "var(--text-muted)",
              maxWidth: "40vw",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <strong style={{ color: "var(--text)" }}>{pupilName}</strong>
          </span>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          maxWidth: 880,
          width: "100%",
          margin: "0 auto",
          height: "100%",
        }}
      >
        {loadState === "loading" && (
          <div style={{ display: "grid", placeItems: "center", color: "var(--text-muted)", fontSize: 13 }}>
            Loading your lesson…
          </div>
        )}
        {loadState === "error" && (
          <div style={{ display: "grid", placeItems: "center", padding: 24 }}>
            <div className="bw-card" style={{ padding: 20, maxWidth: 420 }}>
              <div className="bw-section-label" style={{ color: "var(--color-crimson)", marginBottom: 8 }}>
                Could not load your lesson
              </div>
              <p style={{ fontSize: 14, marginBottom: 12 }}>{error}</p>
              <Link href="/join" className="bw-btn-primary" style={{ fontSize: 13 }}>
                Re-join with a class code
              </Link>
            </div>
          </div>
        )}
        {(loadState === "ready" || loadState === "preview") && (
          sessionStatus?.value === "ended" ? (
            <ClosingScreen />
          ) : (
            <div style={{ position: "relative", display: "grid", gridTemplateRows: "1fr", height: "100%" }}>
              <ChatSurface
              klass={klass ?? undefined}
              effectiveChallengeLevel={effectiveChallengeLevel}
              pupilProfile={pupilProfile}
            />
              {/* Lobby / paused / wrap-up overlay. A missing status doc
                  is treated as "not_started" — the teacher hasn't hit
                  Start class yet, so the chat stays locked. Only in a REAL
                  session (loadState "ready"); the unauthenticated design
                  preview has no status doc and must stay exercisable. */}
              {loadState === "ready" && (
                <SessionOverlay
                  status={sessionStatus?.value ?? "not_started"}
                  teacherName={klass?.teacherName}
                  lessonTitle={lessonTitle}
                  wrapUpNote={sessionStatus?.wrapUpNote ?? undefined}
                />
              )}
            </div>
          )
        )}
      </div>
    </main>
  );
}
