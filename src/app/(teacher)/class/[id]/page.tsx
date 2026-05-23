"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Check, BookOpen, ChevronDown, ChevronRight, Pause, Play, Flag, StopCircle, MonitorPlay, Link2, Download, MoreHorizontal, Sparkles } from "lucide-react";
import { TopBar } from "@/components/shared/TopBar";
import { ClassPulse } from "@/components/teacher/ClassPulse";
import { useAuth } from "@/lib/firebase/auth-context";
import { getFirebase } from "@/lib/firebase/client";
import { getCleanIdToken } from "@/lib/firebase/auth-fetch";
import { useModalDialog } from "@/lib/useModalDialog";
import { ConnectionPill } from "@/components/shared/ConnectionPill";
import { subscribeToLiveClass, subscribeToSessionStatus, type LivePupil, type SessionStatus } from "@/lib/firebase/live";
import { PupilCard } from "@/components/teacher/PupilCard";
import { PageSkeleton } from "@/components/shared/Skeleton";
import { LivePupilPanel } from "@/components/teacher/LivePupilPanel";
import { AppraisalPanel } from "@/components/teacher/AppraisalPanel";
import { useIsMobile } from "@/lib/useIsMobile";
import { ACTIVITIES } from "@/lib/ai/activities";
import { statePill } from "@/lib/brand";
import type { ClassRecord, PupilRecord, School } from "@/types";

type SortKey = "attention" | "alpha" | "recent";

const ATTENTION_RANK: Record<string, number> = {
  wheel_spinning: 0,
  off_task: 1,
  disengaged: 2,
  productive_struggle: 3,
  flowing: 4,
};

export default function ClassDetailPage() {
  const params = useParams<{ id: string }>();
  const classId = params.id;
  const router = useRouter();
  const { status, displayName, email } = useAuth();

  const [klass, setKlass] = useState<ClassRecord | null>(null);
  const [roster, setRoster] = useState<PupilRecord[]>([]);
  const [live, setLive] = useState<Record<string, LivePupil>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("attention");
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [classCtrlBusy, setClassCtrlBusy] = useState<string | null>(null);
  // Transient "✓ Wrap-up called" confirmation — the per-pupil panel already
  // confirms its actions, so the class-level controls shouldn't fire silently.
  const [ctrlConfirm, setCtrlConfirm] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [researchBusy, setResearchBusy] = useState(false);
  // Post-lesson appraisal is collapsed by default — a quiet affordance, not the
  // giant panel that used to dominate the top of the ended-lesson view.
  const [appraisalOpen, setAppraisalOpen] = useState(false);
  // Below 880px the two-column layout can't hold, so the drill panel becomes a
  // bottom sheet instead of stacking off-screen below the grid.
  const isMobile = useIsMobile();
  // On mobile we split the roster into "needs a look" (always shown) and a
  // collapsible "working well" group so a teacher isn't scrolling 30 cards.
  const [workingOpen, setWorkingOpen] = useState(false);

  // Anonymised research export (brief item N) — pseudonymised, CSV-injection
  // -safe ZIP of the class's analytic events. Teacher-scoped server-side.
  async function downloadResearchExport(classId: string) {
    setResearchBusy(true);
    try {
      const token = await getCleanIdToken();
      const r = await fetch(`/api/classes/${classId}/research-export`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(String(r.status));
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "research-export.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't prepare the research export. Try again.");
    } finally {
      setResearchBusy(false);
    }
  }

  // Auth guard
  useEffect(() => {
    if (status === "out") router.replace("/login");
    else if (status === "pupil") router.replace("/session");
  }, [status, router]);

  // Fetch class + roster via the admin-gated API.
  useEffect(() => {
    if (status !== "teacher" || !classId) return;
    let cancelled = false;
    async function load() {
      const fb = getFirebase();
      if (!fb.ready || !fb.auth.currentUser) return;
      try {
        // getCleanIdToken strips any non-ASCII chars from the token —
        // defends against the iOS-Safari "Headers: the string did not
        // match the expected pattern" error when constructing the
        // Authorization header.
        const token = await getCleanIdToken();
        if (!token) {
          if (!cancelled) setError("Sign-in token unavailable. Please sign out and back in.");
          return;
        }
        const res = await fetch(`/api/classes/${classId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 403 || res.status === 404) {
          // Not this teacher's class (or doesn't exist). Bounce them
          // back to their own dashboard with a clear message — silently
          // showing the class detail page with no roster is confusing.
          if (!cancelled) {
            setError(
              res.status === 404
                ? "That class no longer exists."
                : "That class belongs to a different teacher. You can only open your own classes."
            );
            setTimeout(() => {
              if (!cancelled) router.replace("/dashboard");
            }, 2400);
          }
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load class");
        if (cancelled) return;
        setKlass(data.class as ClassRecord);
        setRoster(data.pupils as PupilRecord[]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [status, classId, router]);

  // Live RTDB subscription.
  useEffect(() => {
    if (!classId) return;
    const unsub = subscribeToLiveClass(classId, (live) => {
      setLive(live.pupils);
    });
    return unsub;
  }, [classId]);

  // Session-status subscription.
  useEffect(() => {
    if (!classId) return;
    const unsub = subscribeToSessionStatus(classId, setSessionStatus);
    return unsub;
  }, [classId]);

  async function fireClassControl(type: "start" | "pause" | "resume" | "wrap_up" | "end", text?: string) {
    if (!classId || !klass) return;
    setClassCtrlBusy(type);
    try {
      const token = await getCleanIdToken();
      if (!token) return;
      const res = await fetch("/api/interventions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ classId, type, text }),
      });
      // Confirm the controls that don't otherwise produce an obvious banner
      // change (Wrap-up is a one-shot nudge; the others flip the status pill).
      if (res.ok) {
        const labels: Record<string, string> = {
          start: "Class started",
          pause: "Class paused",
          resume: "Class resumed",
          wrap_up: "Wrap-up called",
          end: "Class ended",
        };
        setCtrlConfirm(labels[type] ?? "Done");
        window.setTimeout(() => setCtrlConfirm(null), 2500);
      }
    } finally {
      setClassCtrlBusy(null);
    }
  }

  const merged = useMemo(() => mergeRosterWithLive(roster, live), [roster, live]);
  const sorted = useMemo(() => sortPupils(merged, sort), [merged, sort]);
  const safeguardingCount = useMemo(
    () => Object.values(live).filter((p) => p.safeguarding).length,
    [live]
  );
  // Mobile triage split (computed from the already attention-sorted list).
  // A pupil "needs a look" if they're live and not in a working state, or have
  // a safeguarding flag; everyone else (working live + not-yet-active) sits in
  // the collapsible group.
  const needLookList = useMemo(
    () =>
      sorted.filter(
        (p) =>
          p.isLive &&
          (p.live.state === "wheel_spinning" ||
            p.live.state === "off_task" ||
            p.live.state === "disengaged" ||
            !!p.live.safeguarding)
      ),
    [sorted]
  );
  const workingList = useMemo(
    () => sorted.filter((p) => !needLookList.includes(p)),
    [sorted, needLookList]
  );
  const liveActive = useMemo(() => Object.values(live), [live]);
  // Pupils whose pattern could use a teacher's eye — anything that isn't one of
  // the two working states (drives the calm attention strip, not an alert).
  const needLook = useMemo(
    () =>
      liveActive.filter(
        (p) => p.state !== "flowing" && p.state !== "productive_struggle"
      ).length,
    [liveActive]
  );

  if (status === "loading" || status === "out" || status === "pupil") {
    return <PageSkeleton cards={3} maxWidth={1400} />;
  }

  // Initial data load — the class + roster fetch hasn't resolved yet. Keep
  // the same branded skeleton rather than flashing an empty header + bare
  // "No pupils joined" grid before the real data lands.
  if (!klass && !error) {
    return <PageSkeleton cards={3} maxWidth={1400} />;
  }

  const teacherName = displayName ?? email ?? "Teacher";
  const selected = selectedId ? live[selectedId] : null;

  return (
    <main style={{ minHeight: "100dvh" }}>
      <TopBar
        lessonContext={klass ? `${klass.name} · ${klass.subject}` : undefined}
        lessonTitle={klass?.lessonPlan?.title}
        teacher={teacherName}
        school={(klass?.school as School) ?? "KESW"}
        role="Teacher"
      />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px clamp(14px, 4vw, 28px) 56px" }}>
        {/* Slim command bar — back link on the left; status, the single
            state-appropriate primary action, the join code, and everything
            else folded into a quiet overflow on the right. */}
        <div className="flex items-center justify-between" style={{ marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
          <Link href="/dashboard" className="bw-btn-secondary" style={{ fontSize: 12 }}>
            <ArrowLeft size={13} style={{ marginRight: 6 }} /> All classes
          </Link>
          <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
            <ConnectionPill />
            {ctrlConfirm && (
              <span
                role="status"
                style={{
                  fontSize: 12,
                  color: "var(--color-gold-text)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  animation: "bw-fade-in 200ms ease",
                }}
              >
                <Check size={12} /> {ctrlConfirm}
              </span>
            )}
            <StatusPill value={sessionStatus?.value ?? "not_started"} />

            {/* Primary action — exactly one, chosen by session state */}
            {klass && sessionStatus?.value !== "ended" && (
              !sessionStatus || sessionStatus.value === "not_started" ? (
                <button
                  onClick={() => fireClassControl("start")}
                  disabled={classCtrlBusy === "start"}
                  className="bw-btn-emphasis"
                  style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                  title="Unlock pupils' chat and start the lesson"
                >
                  <Play size={12} /> Start class
                </button>
              ) : sessionStatus.value === "paused" ? (
                <button
                  onClick={() => fireClassControl("resume")}
                  disabled={classCtrlBusy === "resume"}
                  className="bw-btn-emphasis"
                  style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                  title="Resume the class"
                >
                  <Play size={12} /> Resume
                </button>
              ) : (
                <button
                  onClick={() => fireClassControl("pause")}
                  disabled={classCtrlBusy === "pause"}
                  className="bw-btn-secondary"
                  style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                  title="Pause everyone's chat"
                >
                  <Pause size={12} /> Pause
                </button>
              )
            )}

            {/* Join code — kept visible; teachers read it out to the room */}
            {klass && (
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(klass.joinCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {
                    /* noop */
                  }
                }}
                className="bw-card"
                style={{
                  padding: "6px 10px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  letterSpacing: "0.1em",
                  background: "var(--surface)",
                }}
                title="Copy the six-character join code"
              >
                <span>{klass.joinCode}</span>
                {copied ? <Check size={11} color="var(--color-gold-500)" /> : <Copy size={11} color="var(--text-muted)" />}
              </button>
            )}

            {/* Everything else — quiet overflow so the bar stays calm */}
            {klass && (
              <OverflowMenu>
                {sessionStatus &&
                  (sessionStatus.value === "active" || sessionStatus.value === "wrap_up") && (
                    <OverflowItem
                      icon={<Flag size={13} />}
                      label="Call wrap-up"
                      disabled={classCtrlBusy === "wrap_up" || sessionStatus.value === "wrap_up"}
                      onClick={() => fireClassControl("wrap_up", "Five minutes left — round off what you have.")}
                    />
                  )}
                <OverflowItem
                  icon={<MonitorPlay size={13} />}
                  label="Open whiteboard"
                  onClick={() => {
                    const params = new URLSearchParams({
                      classId: klass.id,
                      title: klass.lessonPlan?.title ?? klass.subject,
                      steps: String(klass.lessonPlan?.sequence?.length ?? 1),
                      class: klass.name,
                      code: klass.joinCode,
                    });
                    window.open(`/classroom?${params.toString()}`, "bw-whiteboard", "noopener");
                  }}
                />
                <OverflowItem
                  icon={<Link2 size={13} />}
                  label={linkCopied ? "Link copied" : "Copy join link"}
                  onClick={async () => {
                    try {
                      const origin = typeof window !== "undefined" ? window.location.origin : "";
                      await navigator.clipboard.writeText(`${origin}/j/${encodeURIComponent(klass.joinCode)}`);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 1500);
                    } catch {
                      /* noop */
                    }
                  }}
                />
                <OverflowItem
                  icon={<Download size={13} />}
                  label={researchBusy ? "Preparing export…" : "Research export"}
                  disabled={researchBusy}
                  onClick={() => downloadResearchExport(klass.id)}
                />
                {sessionStatus &&
                  sessionStatus.value !== "not_started" &&
                  sessionStatus.value !== "ended" && (
                    <OverflowItem
                      icon={<StopCircle size={13} />}
                      label="End class"
                      danger
                      onClick={() => setConfirmEnd(true)}
                    />
                  )}
              </OverflowMenu>
            )}
          </div>
        </div>

        {/* Class status banner */}
        {(!sessionStatus || sessionStatus.value !== "active") && (
          <div
            style={{
              padding: "8px 14px",
              marginBottom: 16,
              borderRadius: 8,
              background:
                sessionStatus?.value === "ended"
                  ? "rgba(142,42,42,0.08)"
                  : "rgba(216,154,47,0.10)",
              borderLeft: `3px solid ${
                sessionStatus?.value === "ended" ? "var(--color-crimson)" : "var(--color-gold-500)"
              }`,
              fontSize: 12,
              color: "var(--text)",
            }}
          >
            {(!sessionStatus || sessionStatus.value === "not_started") &&
              "Class is in the lobby — pupils can join but the chat is locked until you press Start class."}
            {sessionStatus?.value === "paused" && "Class paused. Pupils' chat is locked until you resume."}
            {sessionStatus?.value === "wrap_up" && (
              <>Wrap-up called. {sessionStatus.wrapUpNote && <em>&ldquo;{sessionStatus.wrapUpNote}&rdquo;</em>}</>
            )}
            {sessionStatus?.value === "ended" && "Lesson ended. Pupils have seen the closing screen."}
          </div>
        )}

        {error && (
          <div role="alert" style={{ padding: 12, background: "rgba(142,42,42,0.08)", color: "var(--color-crimson)", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Class header */}
        {klass && (
          <section style={{ marginBottom: 18 }}>
            <div className="flex items-center" style={{ gap: 12, flexWrap: "wrap" }}>
              <h1 className="bw-display" style={{ fontSize: 24, lineHeight: 1.2 }}>
                {klass.lessonPlan?.title ?? klass.subject}
              </h1>
              {sessionStatus?.value === "active" && <LiveBadge />}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              {klass.name} · {roster.length} pupil{roster.length === 1 ? "" : "s"} joined ·{" "}
              {Object.keys(live).length} currently active
              {safeguardingCount > 0 && (
                <span style={{ marginLeft: 8, color: "var(--color-crimson)", fontWeight: 600 }}>
                  · {safeguardingCount} safeguarding flag{safeguardingCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </section>
        )}

        {/* Lesson plan accordion */}
        {klass?.lessonPlan && (
          <section className="bw-card" style={{ padding: 0, marginBottom: 18, overflow: "hidden" }}>
            <button
              onClick={() => setPlanOpen(!planOpen)}
              style={{
                width: "100%",
                padding: "12px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text)",
              }}
            >
              <span className="flex items-center gap-2">
                <BookOpen size={14} color="var(--color-gold-500)" />
                <span className="bw-section-label">Lesson plan</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {klass.lessonPlan.sequence.length} steps · ~{klass.lessonPlan.estimatedMinutes}m · {klass.lessonPlan.criticalConcepts.length} critical concepts
                </span>
              </span>
              {planOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {planOpen && (
              <div style={{ padding: "0 18px 16px", display: "grid", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                    Critical concepts
                  </div>
                  <div className="flex items-center gap-1" style={{ flexWrap: "wrap" }}>
                    {klass.lessonPlan.criticalConcepts.map((c, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 11,
                          padding: "3px 8px",
                          borderRadius: 999,
                          background: "var(--color-gold-tint-2)",
                          color: "var(--color-gold-text)",
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                  {klass.lessonPlan.sequence.map((s, i) => {
                    const onStep = Object.values(live).filter(
                      (p) => (p.currentStepIndex ?? 0) === i
                    );
                    return (
                      <li
                        key={i}
                        style={{
                          padding: "10px 12px",
                          border: "1px solid var(--line)",
                          borderRadius: 8,
                          background: "var(--surface)",
                        }}
                      >
                        <div className="flex items-center justify-between" style={{ gap: 8 }}>
                          <div className="flex items-center gap-2" style={{ flexWrap: "wrap", minWidth: 0 }}>
                            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                              {i + 1}.
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</span>
                            <span style={{ fontSize: 10, color: "var(--color-gold-text)", background: "rgba(181,138,60,0.08)", borderRadius: 999, padding: "2px 8px" }}>
                              {ACTIVITIES[s.activityType]?.label ?? s.activityType}
                            </span>
                          </div>
                          {/* Per-step pupil tokens — the token row IS the
                              live-progress signal, so we don't need a
                              separate timeline panel. Dots are coloured
                              by engagement state; no names exposed in
                              the cluster (the cards below the plan
                              carry names + drill detail). */}
                          {onStep.length > 0 && (
                            <div
                              className="flex items-center gap-1"
                              style={{ flexShrink: 0 }}
                              aria-label={`${onStep.length} pupil${onStep.length === 1 ? "" : "s"} on this step`}
                            >
                              <span style={{ fontSize: 11, color: "var(--color-gold-text)", fontWeight: 600, marginRight: 4 }}>
                                {onStep.length}
                              </span>
                              {onStep.slice(0, 10).map((p) => (
                                <span
                                  key={p.pupilId}
                                  title={`${p.displayName} · ${p.state}`}
                                  style={{
                                    width: 9,
                                    height: 9,
                                    borderRadius: 999,
                                    background: statePill[p.state]?.colour ?? "var(--text-muted)",
                                    opacity: 0.9,
                                  }}
                                />
                              ))}
                              {onStep.length > 10 && (
                                <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 4 }}>
                                  +{onStep.length - 10}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45, marginTop: 4 }}>{s.goal}</div>
                      </li>
                    );
                  })}
                </ol>

                {/* Extension brief — the above-syllabus run for early
                    finishers. The pupil enters this when their step
                    index has advanced one past the last step. */}
                {klass.lessonPlan.extension && (() => {
                  const inExt = Object.values(live).filter(
                    (p) => (p.currentStepIndex ?? 0) >= klass.lessonPlan!.sequence.length
                  );
                  return (
                    <div
                      style={{
                        padding: "10px 12px",
                        border: "1px solid var(--color-gold-500)",
                        borderRadius: 8,
                        background: "var(--color-gold-tint-1)",
                        marginTop: 8,
                      }}
                    >
                      <div className="flex items-center justify-between" style={{ gap: 8 }}>
                        <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-gold-text)", fontWeight: 700 }}>
                            EXT.
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{klass.lessonPlan.extension.title}</span>
                          <span style={{ fontSize: 10, color: "var(--color-gold-text)", background: "var(--color-gold-tint-2)", borderRadius: 999, padding: "2px 8px" }}>
                            above syllabus
                          </span>
                        </div>
                        {inExt.length > 0 && (
                          <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                            <span style={{ fontSize: 11, color: "var(--color-gold-text)", fontWeight: 600, marginRight: 4 }}>
                              {inExt.length}
                            </span>
                            {inExt.slice(0, 10).map((p) => (
                              <span
                                key={p.pupilId}
                                title={`${p.displayName} · on the extension`}
                                style={{
                                  width: 9,
                                  height: 9,
                                  borderRadius: 999,
                                  background: statePill[p.state]?.colour ?? "var(--text-muted)",
                                  opacity: 0.9,
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45, marginTop: 4 }}>
                        {klass.lessonPlan.extension.brief}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, fontStyle: "italic" }}>
                        Stretch: {klass.lessonPlan.extension.stretchHint}
                      </div>
                    </div>
                  );
                })()}

                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  Dots on each step are pupils currently inside it — coloured by engagement state.
                  Edits to the lesson plan propagate to pupils on their next tutor turn; pupils
                  already past a step are not rewound.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Collective pulse — the answer to "how is my class doing right now" */}
        {liveActive.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <ClassPulse pupils={liveActive} stepCount={klass?.lessonPlan?.sequence?.length} />
          </div>
        )}

        {/* Pupils — attention-sorted; the cards needing a look ride to the top */}
        {liveActive.length > 0 && (
          <div className="flex items-center justify-between" style={{ marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
            <span className="flex items-center gap-2">
              <span className="bw-section-label">Pupils</span>
              {needLook > 0 ? (
                <span style={{ fontSize: 12, color: "var(--color-gold-text)", fontWeight: 600 }}>
                  {needLook} could use a look — sorted to the top
                </span>
              ) : (
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>all working right now</span>
              )}
            </span>
            <SortControl value={sort} onChange={setSort} />
          </div>
        )}

        {/* Pupil grid + drill panel. Desktop (>880): two columns with a sticky
            side panel. Mobile (≤880): full-width grid split into a triage
            group + a collapsible "working well" group; the drill opens as a
            bottom sheet (rendered below, outside this grid). */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: selected && !isMobile ? "minmax(0, 1fr) 380px" : "minmax(0, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div>
            {sorted.length === 0 ? (
              <div className="bw-card" style={{ padding: 28, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                No pupils have joined yet. Share the join code above.
              </div>
            ) : isMobile ? (
              <div style={{ display: "grid", gap: 16 }}>
                {needLookList.length > 0 && (
                  <div>
                    <div className="bw-section-label" style={{ marginBottom: 8 }}>
                      Could use a look · {needLookList.length}
                    </div>
                    <PupilGrid
                      items={needLookList}
                      selectedId={selectedId}
                      stepCount={klass?.lessonPlan?.sequence?.length}
                      onSelect={(id) => setSelectedId(selectedId === id ? null : id)}
                    />
                  </div>
                )}
                {workingList.length > 0 && (
                  <div>
                    <button
                      onClick={() => setWorkingOpen((o) => !o)}
                      aria-expanded={workingOpen}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "8px 0",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text)",
                        textAlign: "left",
                      }}
                    >
                      <span className="bw-section-label">Working well · {workingList.length}</span>
                      {workingOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                    <AnimatePresence initial={false}>
                      {workingOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
                          style={{ overflow: "hidden" }}
                        >
                          <div style={{ paddingTop: 8 }}>
                            <PupilGrid
                              items={workingList}
                              selectedId={selectedId}
                              stepCount={klass?.lessonPlan?.sequence?.length}
                              onSelect={(id) => setSelectedId(selectedId === id ? null : id)}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            ) : (
              <PupilGrid
                items={sorted}
                selectedId={selectedId}
                stepCount={klass?.lessonPlan?.sequence?.length}
                onSelect={(id) => setSelectedId(selectedId === id ? null : id)}
              />
            )}
          </div>

          {selected && !isMobile && (
            <LivePupilPanel pupil={selected} classId={classId} onClose={() => setSelectedId(null)} variant="side" />
          )}
        </div>

        {/* After the lesson — a quiet, collapsed affordance (not the giant
            gold panel that used to dominate the ended-lesson view). */}
        {sessionStatus?.value === "ended" && (
          <section style={{ marginTop: 22 }}>
            <button
              onClick={() => setAppraisalOpen((o) => !o)}
              className="bw-card"
              aria-expanded={appraisalOpen}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "12px 16px",
                cursor: "pointer",
                textAlign: "left",
                background: "var(--surface-elev)",
              }}
            >
              <span className="flex items-center gap-2">
                <Sparkles size={14} color="var(--color-gold-500)" />
                <span className="bw-section-label">After the lesson</span>
                <span style={{ fontSize: 13, color: "var(--text)" }}>Appraise this lesson plan</span>
              </span>
              {appraisalOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <AnimatePresence>
              {appraisalOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ marginTop: 12 }}>
                    <AppraisalPanel classId={classId} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}
      </div>

      {/* Mobile drill — a slide-up bottom sheet so tapping a pupil shows their
          detail immediately, instead of stacking off-screen below the grid. */}
      <AnimatePresence>
        {selected && isMobile && (
          <>
            <motion.div
              key="sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedId(null)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 70,
                background: "rgba(15,26,46,0.45)",
                backdropFilter: "blur(2px)",
                WebkitBackdropFilter: "blur(2px)",
              }}
            />
            <motion.div
              key="sheet"
              role="dialog"
              aria-modal="true"
              aria-label={`${selected.displayName} detail`}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.32, ease: [0, 0, 0.2, 1] }}
              style={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 71,
                maxHeight: "88vh",
                overflowY: "auto",
                background: "var(--surface-elev)",
                borderTopLeftRadius: "var(--radius-lg)",
                borderTopRightRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-xl)",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {/* grab handle */}
              <div
                aria-hidden
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: "var(--radius-pill)",
                  background: "var(--line)",
                  margin: "10px auto 2px",
                }}
              />
              <LivePupilPanel
                pupil={selected}
                classId={classId}
                onClose={() => setSelectedId(null)}
                variant="sheet"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {confirmEnd && (
        <EndClassModal
          onCancel={() => setConfirmEnd(false)}
          onConfirm={() => {
            setConfirmEnd(false);
            fireClassControl("end");
          }}
        />
      )}
    </main>
  );
}

// End-class confirmation. Its own component so useModalDialog's focus trap /
// Escape / focus-restore run on mount and unmount.
function EndClassModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const dialogRef = useModalDialog<HTMLDivElement>(onCancel);
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "rgba(15,26,46,0.45)",
        backdropFilter: "blur(2px)",
        animation: "bw-fade-in 160ms ease",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="End the class"
        className="bw-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 420, width: "100%", padding: 24 }}
      >
        <div className="bw-display" style={{ fontSize: 20, marginBottom: 8 }}>End the class?</div>
        <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 20 }}>
          Pupils will see a closing screen and won&apos;t be able to reply further. You can&apos;t
          undo this for the current session.
        </p>
        <div className="flex items-center" style={{ gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} className="bw-btn-secondary" style={{ fontSize: 13 }}>
            Keep going
          </button>
          <button
            onClick={onConfirm}
            className="bw-btn-secondary"
            style={{ fontSize: 13, color: "var(--color-crimson)", borderColor: "var(--color-crimson)" }}
          >
            End class
          </button>
        </div>
      </div>
    </div>
  );
}

function PupilGrid({
  items,
  selectedId,
  stepCount,
  onSelect,
}: {
  items: MergedPupil[];
  selectedId: string | null;
  stepCount?: number;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
      {items.map((p) =>
        p.isLive ? (
          <PupilCard
            key={p.id}
            pupil={p.live}
            selected={selectedId === p.id}
            stepCount={stepCount}
            onSelect={onSelect}
          />
        ) : (
          <DormantPupilCard key={p.id} name={p.name} />
        )
      )}
    </div>
  );
}

function DormantPupilCard({ name }: { name: string }) {
  return (
    <div
      className="bw-card"
      style={{
        padding: 14,
        background: "var(--surface)",
        opacity: 0.7,
        minHeight: 168,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          Joined but not yet active in this session
        </div>
      </div>
    </div>
  );
}

function SortControl({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <div className="flex items-center gap-1" style={{ fontSize: 11 }}>
      <span style={{ color: "var(--text-muted)" }}>Sort</span>
      {(["attention", "recent", "alpha"] as const).map((k) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          style={{
            padding: "3px 8px",
            borderRadius: 999,
            border: `1px solid ${value === k ? "var(--color-gold-500)" : "var(--line)"}`,
            background: value === k ? "rgba(181,138,60,0.08)" : "transparent",
            color: value === k ? "var(--color-gold-500)" : "var(--text-muted)",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {k === "attention" ? "Attention" : k === "recent" ? "Recent" : "A–Z"}
        </button>
      ))}
    </div>
  );
}

interface MergedPupil {
  id: string;
  name: string;
  isLive: boolean;
  live: LivePupil;
  rosterRecord: PupilRecord;
}

function mergeRosterWithLive(roster: PupilRecord[], live: Record<string, LivePupil>): MergedPupil[] {
  return roster.map((r) => {
    const l = live[r.id];
    return {
      id: r.id,
      name: r.displayName,
      isLive: !!l,
      live:
        l ??
        ({
          pupilId: r.id,
          displayName: r.displayName,
          state: "flowing",
          confidence: 0,
          lastActive: r.joinedAt,
          trajectory: [],
        } as LivePupil),
      rosterRecord: r,
    };
  });
}

function sortPupils(items: MergedPupil[], sort: SortKey): MergedPupil[] {
  const sorted = [...items];
  if (sort === "alpha") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === "recent") {
    sorted.sort((a, b) => (b.live.lastActive ?? 0) - (a.live.lastActive ?? 0));
  } else {
    sorted.sort((a, b) => {
      // live first; then attention rank; then alphabetical
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      const ra = ATTENTION_RANK[a.live.state] ?? 5;
      const rb = ATTENTION_RANK[b.live.state] ?? 5;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
  }
  return sorted;
}

// Session status pill — one calm read of where the lesson is, with the
// heraldic-red pulse reserved for "live right now".
function StatusPill({ value }: { value: SessionStatus["value"] }) {
  const map: Record<SessionStatus["value"], { label: string; live?: boolean; ended?: boolean }> = {
    not_started: { label: "Lobby" },
    active: { label: "Live", live: true },
    paused: { label: "Paused" },
    wrap_up: { label: "Wrapping up" },
    ended: { label: "Ended", ended: true },
  };
  const s = map[value];
  return (
    <span
      role="status"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: "var(--radius-pill)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        border: "1px solid var(--line)",
        background: s.live ? "rgba(227, 6, 19, 0.06)" : "var(--surface)",
        color: s.ended ? "var(--text-muted)" : "var(--text)",
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: "var(--radius-pill)",
          background: s.live
            ? "var(--color-bridewell-red)"
            : s.ended
            ? "var(--text-muted)"
            : "var(--color-gold-500)",
          animation: s.live ? "bw-pulse 1.6s ease-in-out infinite" : undefined,
        }}
      />
      {s.label}
    </span>
  );
}

// Quiet overflow menu for the secondary class controls — keeps the command
// bar calm. Same enter/exit + outside-click pattern as the account menu.
function OverflowMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="bw-btn-secondary"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        style={{ padding: 8, display: "inline-flex", alignItems: "center" }}
      >
        <MoreHorizontal size={14} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0, 0, 0.2, 1] }}
            onClick={() => setOpen(false)}
            style={{
              transformOrigin: "top right",
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              minWidth: 220,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
              padding: 6,
              zIndex: 50,
              display: "grid",
              gap: 2,
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OverflowItem({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="bw-menu-item"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: "var(--radius-md)",
        fontSize: 13,
        color: danger ? "var(--color-crimson)" : "var(--text)",
        background: "transparent",
        border: "none",
        textAlign: "left",
        width: "100%",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background var(--dur-fast) var(--ease-standard)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// LIVE badge — heraldic-red broadcast-style indicator. Visible only
// when the class is active. The red comes from the school crest and
// is reserved for "this class is live right now" + small heraldic
// marks; it's never used for alerts or errors.
function LiveBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 9px",
        borderRadius: 999,
        background: "rgba(227, 6, 19, 0.06)",
        border: "1px solid rgba(227, 6, 19, 0.30)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "var(--color-bridewell-red)",
        fontFamily: "var(--font-mono)",
      }}
      aria-label="Lesson is currently live"
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: "var(--color-bridewell-red)",
          animation: "bw-pulse 1.4s ease-in-out infinite",
        }}
      />
      Live
    </span>
  );
}
