"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crest } from "@/components/shared/Crest";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { ChatSurface } from "@/components/student/ChatSurface";
import { ClosingScreen } from "@/components/student/ClosingScreen";
import { AccessibilityMenu } from "@/components/student/AccessibilityMenu";
import { useAuth } from "@/lib/firebase/auth-context";
import { getFirebase } from "@/lib/firebase/client";
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
      try {
        const token = await fb.auth.currentUser!.getIdToken();
        const res = await fetch("/api/pupils/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 404) {
          // Signed in as anonymous pupil but no Firestore pupil record
          // yet — they need to join a class. Don't silently show the
          // demo lesson (that's what caused the "photosynthesis appeared
          // then switched to IR" confusion).
          if (!cancelled) {
            router.replace("/join");
          }
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load class");
        if (cancelled) return;
        setKlass(data.class as ClassRecord);
        setPupil(data.pupil as PupilRecord);
        setEffectiveChallengeLevel(data.effectiveChallengeLevel);
        setPupilProfile(data.pupilProfile);
        setLoadState("ready");
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
  }, [user, status, router]);

  // Live subscription to the class doc so mid-lesson plan edits
  // propagate to the pupil without a refresh. The classifier-driven
  // currentStepIndex stays where it is (no rewind); the tutor picks
  // up the new step content on the next turn.
  useEffect(() => {
    if (!klass?.id) return;
    let cancelled = false;
    (async () => {
      const fb = getFirebase();
      if (!fb.ready || !fb.db) return;
      const { doc, onSnapshot } = await import("firebase/firestore");
      const unsub = onSnapshot(doc(fb.db, "classes", klass.id), (snap) => {
        if (cancelled || !snap.exists()) return;
        const next = { id: snap.id, ...(snap.data() as Omit<ClassRecord, "id">) };
        setKlass(next);
      });
      return () => {
        cancelled = true;
        unsub();
      };
    })();
    return () => {
      cancelled = true;
    };
  }, [klass?.id]);

  const lessonTitle =
    klass?.lessonPlan?.title ?? klass?.subject ?? demoLesson.title;
  const className = klass?.name ?? demoLesson.className;
  const pupilName = pupil?.displayName ?? displayName ?? "you";

  return (
    <main style={{ minHeight: "100dvh", display: "grid", gridTemplateRows: "auto 1fr" }}>
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
          <AccessibilityMenu />
          <span className="bw-hide-sm"><ThemeToggle /></span>
          <Link
            href="/join"
            className="bw-btn-secondary bw-hide-sm"
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
                  Start class yet, so the chat stays locked. */}
              <SessionOverlay
                status={sessionStatus?.value ?? "not_started"}
                lessonTitle={lessonTitle}
                wrapUpNote={sessionStatus?.wrapUpNote ?? undefined}
              />
            </div>
          )
        )}
      </div>
    </main>
  );
}
