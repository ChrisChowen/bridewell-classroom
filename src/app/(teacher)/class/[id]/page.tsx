"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Check, BookOpen, ChevronDown, ChevronRight, Pause, Play, Flag, StopCircle, MonitorPlay, Link2, Download } from "lucide-react";
import { TopBar } from "@/components/shared/TopBar";
import { useAuth } from "@/lib/firebase/auth-context";
import { getFirebase } from "@/lib/firebase/client";
import { getCleanIdToken } from "@/lib/firebase/auth-fetch";
import { useModalDialog } from "@/lib/useModalDialog";
import { ConnectionPill } from "@/components/shared/ConnectionPill";
import { subscribeToLiveClass, subscribeToSessionStatus, type LivePupil, type SessionStatus } from "@/lib/firebase/live";
import { PupilCard } from "@/components/teacher/PupilCard";
import { LivePupilPanel } from "@/components/teacher/LivePupilPanel";
import { AppraisalPanel } from "@/components/teacher/AppraisalPanel";
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
  const stateCounts = useMemo(() => countByState(merged), [merged]);
  const safeguardingCount = useMemo(
    () => Object.values(live).filter((p) => p.safeguarding).length,
    [live]
  );

  if (status === "loading" || status === "out" || status === "pupil") {
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
      </main>
    );
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

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 28px 56px" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 16, gap: 12 }}>
          <Link href="/dashboard" className="bw-btn-secondary" style={{ fontSize: 12 }}>
            <ArrowLeft size={13} style={{ marginRight: 6 }} /> All classes
          </Link>
          <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
            <ConnectionPill />
            {/* Class-wide controls */}
            {klass && sessionStatus?.value !== "ended" && (
              <>
                {!sessionStatus || sessionStatus.value === "not_started" ? (
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
                    <Pause size={12} /> Pause class
                  </button>
                )}
                {sessionStatus &&
                  (sessionStatus.value === "active" || sessionStatus.value === "wrap_up") && (
                    <button
                      onClick={() => fireClassControl("wrap_up", "Five minutes left — round off what you have.")}
                      disabled={classCtrlBusy === "wrap_up" || sessionStatus?.value === "wrap_up"}
                      className="bw-btn-secondary"
                      style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                      title="Call for the class to wrap up — pupils will be nudged to summarise"
                    >
                      <Flag size={12} /> Wrap-up
                    </button>
                  )}
                {sessionStatus && sessionStatus.value !== "not_started" && (
                  <button
                    onClick={() => setConfirmEnd(true)}
                    disabled={classCtrlBusy === "end"}
                    className="bw-btn-secondary"
                    style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, color: "var(--color-crimson)" }}
                    title="End the lesson for everyone"
                  >
                    <StopCircle size={12} /> End class
                  </button>
                )}
                {ctrlConfirm && (
                  <span
                    role="status"
                    style={{
                      fontSize: 12,
                      color: "var(--color-gold-500)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      animation: "bw-fade-in 200ms ease",
                    }}
                  >
                    <Check size={12} /> {ctrlConfirm}
                  </span>
                )}
              </>
            )}
            {klass && (
              <>
                <button
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
                  className="bw-btn-secondary"
                  style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                  title="Open the whiteboard / projector view in a new window"
                >
                  <MonitorPlay size={12} /> Whiteboard
                </button>
                <button
                  onClick={() => downloadResearchExport(klass.id)}
                  disabled={researchBusy}
                  className="bw-btn-secondary"
                  style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                  title="Download an anonymised (P001…) research export of this class — engagement, Reason, scaffolding and intervention events as CSVs"
                >
                  <Download size={12} /> {researchBusy ? "Preparing…" : "Research export"}
                </button>
                <button
                  onClick={async () => {
                    try {
                      const origin =
                        typeof window !== "undefined" ? window.location.origin : "";
                      await navigator.clipboard.writeText(
                        `${origin}/j/${encodeURIComponent(klass.joinCode)}`
                      );
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 1500);
                    } catch {
                      /* noop */
                    }
                  }}
                  className="bw-btn-secondary"
                  style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                  title="Copy a join link pupils can open in one tap"
                >
                  {linkCopied ? (
                    <>
                      <Check size={12} color="var(--color-gold-500)" /> Link copied
                    </>
                  ) : (
                    <>
                      <Link2 size={12} /> Copy join link
                    </>
                  )}
                </button>
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
                  title="Copy the six-character code"
                >
                  <span>{klass.joinCode}</span>
                  {copied ? <Check size={11} color="var(--color-gold-500)" /> : <Copy size={11} color="var(--text-muted)" />}
                </button>
              </>
            )}
            {/* Sign out lives in the UserMenu (top-right user chip) now. */}
          </div>
        </div>

        {/* Post-class appraisal panel — only appears once the lesson is ended. */}
        {sessionStatus?.value === "ended" && <AppraisalPanel classId={classId} />}

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
                          color: "var(--color-gold-500)",
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
                            <span style={{ fontSize: 10, color: "var(--color-gold-500)", background: "rgba(181,138,60,0.08)", borderRadius: 999, padding: "2px 8px" }}>
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
                              <span style={{ fontSize: 11, color: "var(--color-gold-500)", fontWeight: 600, marginRight: 4 }}>
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
                          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-gold-500)", fontWeight: 700 }}>
                            EXT.
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{klass.lessonPlan.extension.title}</span>
                          <span style={{ fontSize: 10, color: "var(--color-gold-500)", background: "var(--color-gold-tint-2)", borderRadius: 999, padding: "2px 8px" }}>
                            above syllabus
                          </span>
                        </div>
                        {inExt.length > 0 && (
                          <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                            <span style={{ fontSize: 11, color: "var(--color-gold-500)", fontWeight: 600, marginRight: 4 }}>
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

        {/* State strip */}
        {Object.keys(live).length > 0 && (
          <section className="bw-card" style={{ padding: 14, marginBottom: 18 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <span className="bw-section-label">Live class · {Object.keys(live).length} active</span>
              <SortControl value={sort} onChange={setSort} />
            </div>
            <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", background: "var(--surface)" }}>
              {(["flowing", "productive_struggle", "wheel_spinning", "disengaged", "off_task"] as const).map((s) => {
                const n = stateCounts[s] ?? 0;
                if (n === 0) return null;
                const pct = (n / Object.keys(live).length) * 100;
                return <div key={s} title={`${statePill[s].label} · ${n}`} style={{ width: `${pct}%`, background: statePill[s].colour }} />;
              })}
            </div>
          </section>
        )}

        {/* Pupil grid + drill panel. On tablet/mobile the drill panel
            stacks below the grid via bw-stack-md. */}
        <div
          className={selected ? "bw-stack-md" : undefined}
          style={{
            display: "grid",
            gridTemplateColumns: selected ? "minmax(0, 1fr) 380px" : "minmax(0, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div>
            {sorted.length === 0 ? (
              <div className="bw-card" style={{ padding: 28, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                No pupils have joined yet. Share the join code above.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {sorted.map((p) =>
                  p.isLive ? (
                    <PupilCard
                      key={p.id}
                      pupil={p.live}
                      selected={selectedId === p.id}
                      stepCount={klass?.lessonPlan?.sequence?.length}
                      onSelect={(id) => setSelectedId(selectedId === id ? null : id)}
                    />
                  ) : (
                    <DormantPupilCard key={p.id} name={p.name} />
                  )
                )}
              </div>
            )}
          </div>

          {selected && (
            <LivePupilPanel pupil={selected} classId={classId} onClose={() => setSelectedId(null)} />
          )}
        </div>
      </div>

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

function countByState(items: MergedPupil[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const it of items) {
    if (!it.isLive) continue;
    counts[it.live.state] = (counts[it.live.state] ?? 0) + 1;
  }
  return counts;
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
