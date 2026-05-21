"use client";

import { useEffect, useState } from "react";
import { X, MessageSquare, Send, RefreshCcw, Users, Pause, Check, AlertTriangle, Sparkles } from "lucide-react";
import { StatePill } from "@/components/shared/StatePill";
import { statePill, type EngagementState } from "@/lib/brand";
import type { LivePupil } from "@/lib/firebase/live";
import { getRecentConversation, type ConversationTurn } from "@/lib/firebase/conversation";
import { getFirebase } from "@/lib/firebase/client";

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
          <div className="bw-section-label" style={{ marginBottom: 6 }}>Current state</div>
          <div className="flex items-center gap-2">
            <StatePill state={pupil.state} />
          </div>
          {pupil.rationale && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.4 }}>
              <Sparkles size={10} style={{ marginRight: 4, verticalAlign: "middle", color: "var(--color-gold-500)" }} />
              {pupil.rationale}
            </p>
          )}
          {pupil.cues && pupil.cues.length > 0 && (
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 11, color: "var(--text-muted)" }}>
              {pupil.cues.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="bw-section-label" style={{ marginBottom: 6 }}>Trajectory · last 20 min</div>
          <TrajectoryChart trajectory={pupil.trajectory ?? []} />
        </div>

        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span className="bw-section-label">Recent conversation</span>
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
              turns.map((t) => (
                <div
                  key={t.id}
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
                </div>
              ))
            )}
          </div>
        </div>

        <InterventionActions classId={classId} pupilId={pupil.pupilId} pupilName={pupil.displayName} hasSafeguarding={!!pupil.safeguarding} />

        {loadingTurns && (
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading conversation…</div>
        )}
      </div>
    </aside>
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
      const token = await fb.auth.currentUser.getIdToken();
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
        <div style={{ fontSize: 11, color: "var(--color-gold-500)", marginTop: 8 }}>
          ✓ {confirmation}
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

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 90, display: "block" }}>
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
        <circle key={i} cx={p.x} cy={p.y} r="2.4" fill={statePill[p.state].colour} />
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
