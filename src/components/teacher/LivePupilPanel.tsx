"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, MessageSquare, Send, RefreshCcw, Users, Pause, Check, AlertTriangle, Sparkles, Download } from "lucide-react";
import { StatePill } from "@/components/shared/StatePill";
import { SkeletonLine } from "@/components/shared/Skeleton";
import { humaniseCue } from "@/lib/teacher-viz";
import { statePill, type EngagementState } from "@/lib/brand";
import type { LivePupil } from "@/lib/firebase/live";
import { getRecentConversation, type ConversationTurn } from "@/lib/firebase/conversation";
import { getFirebase } from "@/lib/firebase/client";
import { getCleanIdToken } from "@/lib/firebase/auth-fetch";
import type { ChallengeLevel, LearnerProfile } from "@/types";

// Drill-in panel for a single live pupil. Opens to the right of the
// pupil grid. Carries the context a teacher needs to act: full
// engagement trajectory, recent conversation, the AI's rationale for
// the current classification, and intervention buttons.

export function LivePupilPanel({
  pupil,
  classId,
  onClose,
}: {
  pupil: LivePupil;
  classId: string;
  onClose: () => void;
}) {
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [loadingTurns, setLoadingTurns] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingTurns(true);
      const recent = await getRecentConversation(classId, pupil.pupilId, 12);
      if (!cancelled) {
        setTurns(recent);
        setLoadingTurns(false);
      }
    }
    load();
    // Refresh every 5s while the panel is open so a teacher who's
    // watching sees the conversation move.
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pupil.pupilId, classId]);

  return (
    <aside
      className="bw-card"
      style={{
        position: "sticky",
        top: 24,
        padding: 0,
        overflow: "hidden",
        animation: "bw-fade-in 180ms ease-out",
      }}
      aria-label={`${pupil.displayName} detail panel`}
    >
      <header
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "var(--color-navy-900)",
              color: "var(--color-cream-50)",
              fontSize: 12,
              fontWeight: 600,
              display: "grid",
              placeItems: "center",
            }}
          >
            {initials(pupil.displayName)}
          </span>
          <div>
            <div className="bw-display" style={{ fontSize: 16 }}>{pupil.displayName}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {humanAge(Date.now() - pupil.lastActive)} ago · confidence {Math.round(pupil.confidence * 100)}%
            </div>
          </div>
        </div>
        <button onClick={onClose} className="bw-btn-secondary" aria-label="Close" style={{ padding: 6 }}>
          <X size={14} />
        </button>
      </header>

      <div style={{ padding: 16, display: "grid", gap: 14 }}>
        {pupil.safeguarding && (
          <div
            role="alert"
            style={{
              padding: 12,
              borderRadius: 8,
              background:
                pupil.safeguarding.severity === "high"
                  ? "rgba(142,42,42,0.10)"
                  : "rgba(216,154,47,0.12)",
              borderLeft: `3px solid ${
                pupil.safeguarding.severity === "high" ? "var(--color-crimson)" : "var(--color-gold-500)"
              }`,
              fontSize: 12,
            }}
          >
            <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
              <AlertTriangle
                size={12}
                color={pupil.safeguarding.severity === "high" ? "var(--color-crimson)" : "var(--color-gold-500)"}
              />
              <strong style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 10 }}>
                Safeguarding · {pupil.safeguarding.severity}
              </strong>
            </div>
            <div>{pupil.safeguarding.summary}</div>
            {pupil.safeguarding.pupilExcerpt && (
              <div style={{ fontStyle: "italic", color: "var(--text-muted)", marginTop: 6 }}>
                &ldquo;{pupil.safeguarding.pupilExcerpt}&rdquo;
              </div>
            )}
          </div>
        )}

        <div>
          <div className="bw-section-label" style={{ marginBottom: 6 }}>Right now</div>
          <div className="flex items-center gap-2">
            <StatePill state={pupil.state} />
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {Math.round(pupil.confidence * 100)}% sure
            </span>
          </div>
          {pupil.rationale && (
            <p style={{ fontSize: 13, color: "var(--text)", marginTop: 10, lineHeight: 1.5 }}>
              <Sparkles size={11} style={{ marginRight: 5, verticalAlign: "middle", color: "var(--color-gold-text)" }} />
              {pupil.rationale}
            </p>
          )}
          {/* Cues — rendered in plain English, never the raw classifier tokens */}
          {pupil.cues && pupil.cues.length > 0 && (
            <div className="flex items-center gap-2" style={{ flexWrap: "wrap", marginTop: 10 }}>
              {pupil.cues.map((c, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    padding: "3px 9px",
                    borderRadius: "var(--radius-pill)",
                    background: "var(--color-gold-tint-2)",
                    color: "var(--color-gold-text)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {humaniseCue(c)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="bw-section-label" style={{ marginBottom: 6 }}>Engagement · last 20 min</div>
          <TrajectoryChart trajectory={pupil.trajectory ?? []} />
        </div>

        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span className="bw-section-label">Their words</span>
            {loadingTurns && (
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>refreshing…</span>
            )}
          </div>
          <div
            style={{
              padding: 10,
              borderRadius: 8,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              maxHeight: 240,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {turns.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)", padding: 6 }}>
                <MessageSquare size={11} style={{ marginRight: 6, verticalAlign: "middle" }} />
                No conversation captured yet.
              </div>
            ) : (
              // New turns fade+rise in as the 5s poll picks them up; turns
              // already on screen keep their identity via key={t.id} so they
              // don't re-animate. (Previously the list snapped on every poll.)
              turns.map((t) => (
                <motion.div
                  key={t.id}
                  layout="position"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
                  style={{
                    alignSelf: t.role === "pupil" ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    padding: "6px 10px",
                    borderRadius: 8,
                    background:
                      t.role === "pupil"
                        ? "var(--color-navy-900)"
                        : "var(--surface-elev)",
                    color:
                      t.role === "pupil"
                        ? "var(--color-cream-50)"
                        : "var(--text)",
                    border:
                      t.role === "pupil"
                        ? "none"
                        : "1px solid var(--line)",
                    fontSize: 12,
                    lineHeight: 1.45,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {Boolean(t.meta?.scaffoldAction) && (
                    <div
                      style={{
                        fontSize: 9,
                        color:
                          t.role === "pupil" ? "rgba(250,246,238,0.7)" : "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginBottom: 2,
                      }}
                    >
                      Scaffold · {String(t.meta!.scaffoldAction)}
                    </div>
                  )}
                  {t.content}
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* What you can do — pitch, SEND, interventions and data, grouped
            under one heading rather than four stacked sections. */}
        <div
          style={{
            marginTop: 4,
            paddingTop: 14,
            borderTop: "1px solid var(--line)",
            display: "grid",
            gap: 14,
          }}
        >
          <span className="bw-section-label" style={{ color: "var(--color-gold-text)" }}>
            What you can do
          </span>
          <AdaptivePitch pupilId={pupil.pupilId} pupilName={pupil.displayName} />
          <SendEditor pupilId={pupil.pupilId} pupilName={pupil.displayName} />
          <InterventionActions classId={classId} pupilId={pupil.pupilId} pupilName={pupil.displayName} hasSafeguarding={!!pupil.safeguarding} />
          <GdprExport pupilId={pupil.pupilId} pupilName={pupil.displayName} />
        </div>
      </div>
    </aside>
  );
}

const CHALLENGE_LABELS: Record<ChallengeLevel, string> = {
  foundation: "Foundation",
  core: "Core",
  stretch: "Stretch",
};

// Adaptive difficulty + longitudinal profile, surfaced to the teacher.
// The pitch is AI-set on evidence and TEACHER-OVERRIDABLE. It is never
// labelled to the pupil. Shows the across-sessions trajectory so a teacher
// can see how a pupil's level has moved over time.
// Exported for component tests.
export function AdaptivePitch({ pupilId, pupilName }: { pupilId: string; pupilName: string }) {
  const [profile, setProfile] = useState<LearnerProfile | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fb = getFirebase();
      if (!fb.ready || !fb.auth.currentUser) {
        if (!cancelled) setProfile(null);
        return;
      }
      try {
        const token = await getCleanIdToken();
        const r = await fetch(`/api/pupils/${pupilId}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        if (!cancelled) setProfile(r.ok ? (d.profile as LearnerProfile | null) : null);
      } catch {
        if (!cancelled) setProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pupilId]);

  async function override(level: ChallengeLevel) {
    const fb = getFirebase();
    if (!fb.ready || !fb.auth.currentUser) return;
    setBusy(true);
    try {
      const token = await getCleanIdToken();
      const r = await fetch(`/api/pupils/${pupilId}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ challengeLevel: level }),
      });
      const d = await r.json();
      if (r.ok) setProfile(d.profile as LearnerProfile);
    } finally {
      setBusy(false);
    }
  }

  if (profile === undefined) {
    return (
      <div>
        <div className="bw-section-label" style={{ marginBottom: 6 }}>Pitch · across sessions</div>
        <div style={{ display: "grid", gap: 6 }}>
          <SkeletonLine width="48%" height={20} />
          <SkeletonLine width="70%" height={10} />
        </div>
      </div>
    );
  }

  const current: ChallengeLevel = profile?.challengeLevel ?? "core";
  const recent = (profile?.sessions ?? []).slice(-6);

  return (
    <div>
      <div className="bw-section-label" style={{ marginBottom: 6 }}>Pitch · across sessions</div>

      {!profile ? (
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45 }}>
          No history yet. After {pupilName.split(" ")[0]}&apos;s first completed lesson, the AI sets a
          per-pupil pitch from how they engaged — you can always override it.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 999,
                background: "var(--surface-elev)",
                border: "1px solid var(--line)",
              }}
            >
              {CHALLENGE_LABELS[current]}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {profile.sessionsObserved} {profile.sessionsObserved === 1 ? "session" : "sessions"}
              {profile.teacherOverride?.challengeLevel === current ? " · set by you" : " · AI-pitched"}
            </span>
          </div>

          {/* Across-sessions level trajectory */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
            {recent.map((s, i) => (
              <span
                key={i}
                title={`${s.lessonTitle}: ${CHALLENGE_LABELS[s.challengeBefore]} → ${CHALLENGE_LABELS[s.challengeAfter]}`}
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  color: s.challengeAfter === s.challengeBefore ? "var(--text-muted)" : "var(--text)",
                }}
              >
                {s.challengeAfter === s.challengeBefore
                  ? CHALLENGE_LABELS[s.challengeAfter]
                  : `${CHALLENGE_LABELS[s.challengeBefore]}→${CHALLENGE_LABELS[s.challengeAfter]}`}
              </span>
            ))}
          </div>

          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
            {profile.metrics.avgReasonConfidence !== null
              ? `Avg Reason ${Math.round(profile.metrics.avgReasonConfidence * 100)}%`
              : "No Reason data"}
            {profile.metrics.avgScaffoldPresses !== null
              ? ` · ${profile.metrics.avgScaffoldPresses} scaffolds/session`
              : ""}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {CHALLENGE_ORDER_UI.map((lvl) => (
              <button
                key={lvl}
                className="bw-btn-secondary"
                disabled={busy || lvl === current}
                onClick={() => override(lvl)}
                style={{ fontSize: 11, padding: "4px 10px", opacity: lvl === current ? 0.5 : 1 }}
              >
                {CHALLENGE_LABELS[lvl]}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.4 }}>
            Overriding sets the pitch until the next lesson is consolidated. Never shown to the pupil.
          </p>
        </>
      )}
    </div>
  );
}

const CHALLENGE_ORDER_UI: ChallengeLevel[] = ["foundation", "core", "stretch"];

type SendProfile = {
  outputFormat?: "short" | "bullets" | "structured" | "visual";
  scaffoldingLevel?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
};

const OUTPUT_FORMAT_OPTIONS: Array<{ value: SendProfile["outputFormat"]; label: string }> = [
  { value: undefined, label: "Default" },
  { value: "short", label: "Short replies" },
  { value: "bullets", label: "Bulleted" },
  { value: "structured", label: "Structured / signposted" },
  { value: "visual", label: "Visual / concrete" },
];

// Teacher-set SEND profile. Adapts HOW the tutor communicates (output
// shape, pace, support) — never what counts as understanding, never shown
// to the pupil. Feeds the tutor via buildSendAdaptationBlock.
// Exported for component tests.
export function SendEditor({ pupilId, pupilName }: { pupilId: string; pupilName: string }) {
  const [send, setSend] = useState<SendProfile | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fb = getFirebase();
      if (!fb.ready || !fb.auth.currentUser) {
        if (!cancelled) setSend(null);
        return;
      }
      try {
        const token = await getCleanIdToken();
        const r = await fetch(`/api/pupils/${pupilId}/send`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        if (!cancelled) setSend(r.ok ? (d.send as SendProfile | null) : null);
      } catch {
        if (!cancelled) setSend(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pupilId]);

  async function save(next: SendProfile) {
    const fb = getFirebase();
    if (!fb.ready || !fb.auth.currentUser) return;
    setBusy(true);
    setSaved(false);
    try {
      const token = await getCleanIdToken();
      const r = await fetch(`/api/pupils/${pupilId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(next),
      });
      const d = await r.json();
      if (r.ok) {
        setSend(d.send as SendProfile);
        setSaved(true);
        setTimeout(() => setSaved(false), 2200);
      }
    } finally {
      setBusy(false);
    }
  }

  const current = send ?? {};
  const summary = describeSend(current);

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <span className="bw-section-label">SEND adaptation</span>
        <button
          className="bw-btn-secondary"
          style={{ fontSize: 11, padding: "3px 8px" }}
          onClick={() => setOpen((o) => !o)}
          disabled={send === undefined}
        >
          {open ? "Done" : summary ? "Edit" : "Set up"}
        </button>
      </div>

      {send === undefined ? (
        <SkeletonLine width="60%" height={14} />
      ) : !open ? (
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45 }}>
          {summary ?? `No adaptation set. The tutor coaches ${pupilName.split(" ")[0]} with the default register.`}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--text-muted)" }}>
            Output style
            <select
              value={current.outputFormat ?? ""}
              onChange={(e) => save({ ...current, outputFormat: (e.target.value || undefined) as SendProfile["outputFormat"] })}
              disabled={busy}
              style={selectStyle}
            >
              {OUTPUT_FORMAT_OPTIONS.map((o) => (
                <option key={o.label} value={o.value ?? ""}>{o.label}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--text-muted)" }}>
            Scaffolding level {current.scaffoldingLevel ? `· ${current.scaffoldingLevel}/5` : "· default"}
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={current.scaffoldingLevel ?? 0}
              onChange={(e) => {
                const v = Number(e.target.value);
                save({ ...current, scaffoldingLevel: (v === 0 ? undefined : v) as SendProfile["scaffoldingLevel"] });
              }}
              disabled={busy}
            />
          </label>

          <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--text-muted)" }}>
            Note for the tutor (not shown to the pupil)
            <textarea
              defaultValue={current.notes ?? ""}
              rows={2}
              maxLength={400}
              placeholder="e.g. processes language slowly — give thinking time"
              onBlur={(e) => {
                const note = e.target.value.trim();
                if (note !== (current.notes ?? "")) save({ ...current, notes: note });
              }}
              disabled={busy}
              style={{
                padding: 8,
                border: "1px solid var(--line)",
                borderRadius: 4,
                background: "var(--surface-elev)",
                fontSize: 12,
                fontFamily: "var(--font-sans)",
                resize: "vertical",
              }}
            />
          </label>
          <p style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.4 }}>
            Adapts how the tutor communicates, not what counts as understanding. Applies from the pupil&apos;s next turn.
          </p>
        </div>
      )}
      {saved && (
        <div style={{ fontSize: 11, color: "var(--color-gold-text)", marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Check size={11} /> Saved
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "6px 8px",
  border: "1px solid var(--line)",
  borderRadius: 4,
  background: "var(--surface-elev)",
  fontSize: 12,
  fontFamily: "var(--font-sans)",
};

function describeSend(s: SendProfile): string | null {
  const parts: string[] = [];
  if (s.outputFormat) {
    const map: Record<string, string> = { short: "short replies", bullets: "bulleted", structured: "structured", visual: "visual/concrete" };
    parts.push(map[s.outputFormat]);
  }
  if (s.scaffoldingLevel) parts.push(`scaffolding ${s.scaffoldingLevel}/5`);
  if (s.notes) parts.push("teacher note");
  return parts.length ? parts.join(" · ") : null;
}

// GDPR subject-access (Art. 15) — teacher-facing download of everything held
// about this pupil, fulfilling the export engine's "teacher button" follow-up.
// Read-only: fetches the teacher-scoped export endpoint with the auth token
// and saves the JSON locally. (Erasure/Art. 17 is a separate, deliberately
// guarded confirm-modal action — tracked as a follow-up.)
function GdprExport({ pupilId, pupilName }: { pupilId: string; pupilName: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function download() {
    const fb = getFirebase();
    if (!fb.ready || !fb.auth.currentUser) return;
    setBusy(true);
    setMsg(null);
    try {
      const token = await getCleanIdToken();
      const r = await fetch(`/api/pupils/${pupilId}/export`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `Export failed (${r.status})`);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Fixed, non-identifying filename (matches the server's
      // Content-Disposition) — don't bake the raw UID into a file that may be
      // forwarded to fulfil a subject-access request.
      a.download = "subject-access-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg("Downloaded.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="bw-section-label" style={{ marginBottom: 6 }}>Data (GDPR)</div>
      <Action
        icon={busy ? <Sparkles size={12} /> : <Download size={12} />}
        label={busy ? "Preparing…" : "Download this pupil's data (JSON)"}
        busy={busy}
        onClick={download}
      />
      <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.4 }}>
        Subject-access (Art. 15) for {pupilName.split(" ")[0]} — everything held about them,
        for a data-subject request. {msg && <strong style={{ color: "var(--color-gold-text)" }}>{msg}</strong>}
      </p>
    </div>
  );
}

function InterventionActions({
  classId,
  pupilId,
  pupilName,
  hasSafeguarding,
}: {
  classId: string;
  pupilId: string;
  pupilName: string;
  hasSafeguarding: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [hintText, setHintText] = useState("");
  const [rationale, setRationale] = useState("");
  const [pairWith, setPairWith] = useState("");
  const [openForm, setOpenForm] = useState<"hint" | "expert" | "pair" | null>(null);

  async function fire(payload: Record<string, unknown>, label: string) {
    const fb = getFirebase();
    if (!fb.ready || !fb.auth.currentUser) return;
    setBusy(label);
    setConfirmation(null);
    try {
      const token = await getCleanIdToken();
      const r = await fetch("/api/interventions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ classId, pupilId, ...payload }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setConfirmation(label);
      setTimeout(() => setConfirmation(null), 2200);
    } catch (e) {
      setConfirmation(`Failed: ${e instanceof Error ? e.message : "unknown"}`);
      setTimeout(() => setConfirmation(null), 3000);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="bw-section-label" style={{ marginBottom: 8 }}>Intervene</div>
      <div style={{ display: "grid", gap: 6 }}>
        <Action
          icon={<Send size={12} />}
          label="Send a teacher hint"
          busy={busy === "hint" || openForm === "hint"}
          onClick={() => setOpenForm(openForm === "hint" ? null : "hint")}
        />
        {openForm === "hint" && (
          <InlineForm
            placeholder={`Type a hint for ${pupilName.split(" ")[0]}…`}
            value={hintText}
            setValue={setHintText}
            cta="Send hint"
            disabled={!hintText.trim() || busy === "hint"}
            onSubmit={async () => {
              await fire({ type: "hint", text: hintText.trim() }, "Hint sent");
              setHintText("");
              setOpenForm(null);
            }}
          />
        )}

        <Action
          icon={<RefreshCcw size={12} />}
          label="Switch to Expert for one turn"
          busy={busy === "expert" || openForm === "expert"}
          onClick={() => setOpenForm(openForm === "expert" ? null : "expert")}
        />
        {openForm === "expert" && (
          <InlineForm
            placeholder="Why does this pupil need a direct answer right now?"
            value={rationale}
            setValue={setRationale}
            cta="Switch for one turn"
            disabled={!rationale.trim() || busy === "expert"}
            onSubmit={async () => {
              await fire({ type: "mode_one_turn", rationale: rationale.trim() }, "Expert turn fired");
              setRationale("");
              setOpenForm(null);
            }}
          />
        )}

        <Action
          icon={<Users size={12} />}
          label="Pair with a flowing pupil"
          busy={busy === "pair" || openForm === "pair"}
          onClick={() => setOpenForm(openForm === "pair" ? null : "pair")}
        />
        {openForm === "pair" && (
          <InlineForm
            placeholder="Pupil name to pair with"
            value={pairWith}
            setValue={setPairWith}
            cta="Send pair-up"
            disabled={!pairWith.trim() || busy === "pair"}
            onSubmit={async () => {
              await fire({ type: "pair_up", pairWith: pairWith.trim() }, "Pair-up sent");
              setPairWith("");
              setOpenForm(null);
            }}
          />
        )}

        <Action
          icon={<Pause size={12} />}
          label="Pause this pupil"
          busy={busy === "pause"}
          onClick={() => fire({ type: "pause" }, "Pupil paused")}
        />
        <Action
          icon={<Check size={12} />}
          label={hasSafeguarding ? "Mark safeguarding reviewed" : "Mark reviewed"}
          busy={busy === "review"}
          onClick={() => fire({ type: "mark_reviewed" }, "Marked reviewed")}
        />
      </div>
      {confirmation && (
        <div style={{ fontSize: 11, color: "var(--color-gold-text)", marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Check size={11} /> {confirmation}
        </div>
      )}
    </div>
  );
}

function Action({
  icon,
  label,
  onClick,
  busy,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  busy?: boolean;
}) {
  return (
    <button
      className="bw-btn-secondary"
      onClick={onClick}
      disabled={busy}
      style={{
        justifyContent: "flex-start",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        opacity: busy ? 0.7 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function InlineForm({
  placeholder,
  value,
  setValue,
  cta,
  disabled,
  onSubmit,
}: {
  placeholder: string;
  value: string;
  setValue: (v: string) => void;
  cta: string;
  disabled: boolean;
  onSubmit: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: 6, padding: 8, background: "var(--surface)", borderRadius: 6, border: "1px solid var(--line)" }}>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        placeholder={placeholder}
        style={{
          padding: 8,
          border: "1px solid var(--line)",
          borderRadius: 4,
          background: "var(--surface-elev)",
          fontSize: 12,
          fontFamily: "var(--font-sans)",
          resize: "vertical",
        }}
      />
      <button onClick={onSubmit} disabled={disabled} className="bw-btn-emphasis" style={{ fontSize: 11, padding: "5px 10px" }}>
        {cta}
      </button>
    </div>
  );
}

function TrajectoryChart({
  trajectory,
}: {
  trajectory: Array<{ state: EngagementState; t: number; confidence: number }>;
}) {
  if (!trajectory.length) {
    return (
      <div
        style={{
          height: 80,
          border: "1px dashed var(--line)",
          borderRadius: 8,
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        No classifications yet — fires every 5 messages or 60s.
      </div>
    );
  }

  const W = 320;
  const H = 90;
  const PAD = 6;
  const stateY: Record<EngagementState, number> = {
    off_task: 0,
    disengaged: 1,
    wheel_spinning: 2,
    productive_struggle: 3,
    flowing: 4,
  };
  const stepX = trajectory.length > 1 ? (W - PAD * 2) / (trajectory.length - 1) : 0;
  const pts = trajectory.map((e, i) => ({
    x: PAD + i * stepX,
    y: PAD + (4 - stateY[e.state]) * ((H - PAD * 2) / 4),
    state: e.state,
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  // Text alternative — state is encoded by vertical position (not colour
  // alone), but the SVG still needs a name + per-point titles so a screen
  // reader / colour-blind teacher gets the same reading the chart shows.
  const label = (s: EngagementState) => statePill[s].label;
  const latest = trajectory[trajectory.length - 1];
  const summary = `Engagement trajectory, ${trajectory.length} reading${trajectory.length === 1 ? "" : "s"}, most recent: ${label(latest.state)}.`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: 90, display: "block" }}
      role="img"
      aria-label={summary}
    >
      <title>{summary}</title>
      {/* gridlines per state band */}
      {[0, 1, 2, 3, 4].map((k) => (
        <line
          key={k}
          x1={PAD}
          x2={W - PAD}
          y1={PAD + (4 - k) * ((H - PAD * 2) / 4)}
          y2={PAD + (4 - k) * ((H - PAD * 2) / 4)}
          stroke="var(--line)"
          strokeWidth="0.5"
          opacity="0.6"
        />
      ))}
      <path d={line} stroke="var(--text)" strokeWidth="1.4" fill="none" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.4" fill={statePill[p.state].colour}>
          <title>{label(p.state)}</title>
        </circle>
      ))}
    </svg>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
}

function humanAge(ms: number): string {
  if (ms < 5000) return "just now";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}
