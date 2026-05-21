"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Check, BookOpen, ChevronDown, ChevronRight, Pause, Play, Flag, StopCircle } from "lucide-react";
import { TopBar } from "@/components/shared/TopBar";
import { useAuth } from "@/lib/firebase/auth-context";
import { getFirebase } from "@/lib/firebase/client";
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
  const { status, displayName, email, signOut } = useAuth();

  const [klass, setKlass] = useState<ClassRecord | null>(null);
  const [roster, setRoster] = useState<PupilRecord[]>([]);
  const [live, setLive] = useState<Record<string, LivePupil>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("attention");
  const [copied, setCopied] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [classCtrlBusy, setClassCtrlBusy] = useState<string | null>(null);

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
        const token = await fb.auth.currentUser.getIdToken();
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

  async function fireClassControl(type: "pause" | "resume" | "wrap_up" | "end", text?: string) {
    if (!classId || !klass) return;
    setClassCtrlBusy(type);
    try {
      const fb = getFirebase();
      if (!fb.ready || !fb.auth.currentUser) return;
      const token = await fb.auth.currentUser.getIdToken();
      await fetch("/api/interventions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ classId, type, text }),
      });
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
            {/* Class-wide controls */}
            {klass && sessionStatus?.value !== "ended" && (
              <>
                {sessionStatus?.value === "paused" ? (
                  <button
                    onClick={() => fireClassControl("resume")}
                    disabled={classCtrlBusy === "resume"}
                    className="bw-btn-secondary"
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
                <button
                  onClick={() => fireClassControl("wrap_up", "Five minutes left — round off what you have.")}
                  disabled={classCtrlBusy === "wrap_up" || sessionStatus?.value === "wrap_up"}
                  className="bw-btn-secondary"
                  style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                  title="Call for the class to wrap up — pupils will be nudged to summarise"
                >
                  <Flag size={12} /> Wrap-up
                </button>
                <button
                  onClick={() => {
                    if (confirm("End the class? Pupils will see a closing screen and can't reply further.")) {
                      fireClassControl("end");
                    }
                  }}
                  disabled={classCtrlBusy === "end"}
                  className="bw-btn-secondary"
                  style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, color: "var(--color-crimson)" }}
                  title="End the lesson for everyone"
                >
                  <StopCircle size={12} /> End class
                </button>
              </>
            )}
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
              >
                <span>{klass.joinCode}</span>
                {copied ? <Check size={11} color="var(--color-gold-500)" /> : <Copy size={11} color="var(--text-muted)" />}
              </button>
            )}
            <button onClick={signOut} className="bw-btn-secondary" style={{ fontSize: 12 }}>
              Sign out
            </button>
          </div>
        </div>

        {/* Post-class appraisal panel — only appears once the lesson is ended. */}
        {sessionStatus?.value === "ended" && <AppraisalPanel classId={classId} />}

        {/* Class status banner */}
        {sessionStatus && sessionStatus.value !== "active" && (
          <div
            style={{
              padding: "8px 14px",
              marginBottom: 16,
              borderRadius: 8,
              background:
                sessionStatus.value === "ended"
                  ? "rgba(142,42,42,0.08)"
                  : "rgba(216,154,47,0.10)",
              borderLeft: `3px solid ${
                sessionStatus.value === "ended" ? "var(--color-crimson)" : "var(--color-gold-500)"
              }`,
              fontSize: 12,
              color: "var(--text)",
            }}
          >
            {sessionStatus.value === "paused" && "Class paused. Pupils cannot reply until you resume."}
            {sessionStatus.value === "wrap_up" && (
              <>Wrap-up called. {sessionStatus.wrapUpNote && <em>&ldquo;{sessionStatus.wrapUpNote}&rdquo;</em>}</>
            )}
            {sessionStatus.value === "ended" && "Lesson ended. Pupils have seen the closing screen."}
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
            <h1 className="bw-display" style={{ fontSize: 24, lineHeight: 1.2 }}>
              {klass.lessonPlan?.title ?? klass.subject}
            </h1>
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
                          background: "rgba(181,138,60,0.10)",
                          color: "var(--color-gold-500)",
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                  {klass.lessonPlan.sequence.map((s, i) => (
                    <li
                      key={i}
                      style={{
                        padding: "10px 12px",
                        border: "1px solid var(--line)",
                        borderRadius: 8,
                        background: "var(--surface)",
                      }}
                    >
                      <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                          {i + 1}.
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</span>
                        <span style={{ fontSize: 10, color: "var(--color-gold-500)", background: "rgba(181,138,60,0.08)", borderRadius: 999, padding: "2px 8px" }}>
                          {ACTIVITIES[s.activityType]?.label ?? s.activityType}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45 }}>{s.goal}</div>
                    </li>
                  ))}
                </ol>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  Editing the lesson plan after pupils have joined is Phase 3 work; create a new class to change the plan.
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

        {/* Pupil grid + drill panel */}
        <div
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
    </main>
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
