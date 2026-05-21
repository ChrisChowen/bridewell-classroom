"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lightbulb, RefreshCw, Type as TypeIcon, Send, ExternalLink, Sparkles, Users, Pause as PauseIcon } from "lucide-react";
import type { ClassRecord, LessonPlan, Message, ReasonPromptType } from "@/types";
import { demoLesson, demoTutorOpening } from "@/lib/demo/data";
import { getFirebase } from "@/lib/firebase/client";
import {
  acknowledgeIntervention,
  subscribeToPupilInterventions,
  subscribeToSessionStatus,
  type SessionStatus,
} from "@/lib/firebase/live";

// Chat surface — calls /api/chat which fronts the Gemini tutor.
// Coach mode is the default; Expert mode (teacher-toggled in production)
// enables Google Search grounding so factual answers cite real sources.
//
// Citations are surfaced inline under the tutor turn. The Reason surface
// preview stays available for sense-checking the gold-accent treatment;
// Phase 2 wires the full four-layer module.

let idCounter = 0;
const nextId = () => `m_${Date.now()}_${idCounter++}`;

type Citation = { uri?: string; title?: string };

interface UIMessage extends Message {
  citations?: Citation[];
  searchQueries?: string[];
}

type ApiMessage = { role: "user" | "assistant"; content: string };

function toApiMessages(messages: UIMessage[]): ApiMessage[] {
  return messages
    .filter((m) => m.role === "tutor" || m.role === "pupil")
    .map((m) => ({ role: m.role === "pupil" ? "user" : "assistant", content: m.content }));
}

interface ChatSurfaceProps {
  // The class the pupil is in (with the approved lesson plan attached).
  // When undefined, the surface runs against the demo lesson so the
  // preview at /session keeps working without a real class.
  klass?: ClassRecord;
}

export function ChatSurface({ klass }: ChatSurfaceProps = {}) {
  const lessonPlan: LessonPlan | undefined = klass?.lessonPlan;
  const openingText =
    lessonPlan?.sequence?.[0]?.openingPrompt ?? demoTutorOpening;

  const [messages, setMessages] = useState<UIMessage[]>(() => [
    { id: nextId(), role: "tutor", content: openingText, timestamp: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasonCard, setReasonCard] = useState<{
    eventId: string;
    promptType: ReasonPromptType;
    promptText: string;
    concept: string;
  } | null>(null);
  const [reasonLastType, setReasonLastType] = useState<ReasonPromptType | undefined>(undefined);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [pairWith, setPairWith] = useState<string | null>(null);
  const [pausedByTeacher, setPausedByTeacher] = useState(false);
  const [expertNextTurn, setExpertNextTurn] = useState<string | null>(null); // rationale
  const scrollRef = useRef<HTMLDivElement>(null);

  // Signals tracked locally so the engagement classifier has real numbers
  // to work with. Reset only when the lesson changes.
  const signalsRef = useRef({
    pupilMsgCount: 0,
    pupilCharsTotal: 0,
    pupilQuestions: 0,
    scaffoldUseCount: 0,
    lastPupilTs: 0,
    pupilResponseTimes: [] as number[], // delta between previous tutor turn and this pupil reply
    lastClassifiedAt: 0,
    msgsSinceClassify: 0,
    lastPupilExcerpt: "",
  });

  // Mode is set by the lesson plan; the teacher can override for ONE
  // turn via the intervention panel (with a rationale). Pupils never
  // choose. Stops the "press Expert to get the answer" failure mode.
  const baseMode = lessonPlan?.defaultMode ?? "coach";
  const mode = expertNextTurn ? "expert" : baseMode;
  const sessionEnded = sessionStatus?.value === "ended";
  const sessionWrapUp = sessionStatus?.value === "wrap_up";
  const sessionPaused = sessionStatus?.value === "paused";
  const inputDisabled = pending || pausedByTeacher || sessionEnded || sessionPaused;

  // Reset the opening turn when the lesson plan changes (joining a
  // different class).
  useEffect(() => {
    setMessages([{ id: nextId(), role: "tutor", content: openingText, timestamp: Date.now() }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonPlan?.id]);

  // The pupil starts on step 0. Step progression is Phase 2 — the
  // classifier + lesson plan together will advance the pupil. For now,
  // the tutor stays anchored to step 0's activity, which is enough to
  // demo non-Socratic activities end-to-end.
  const activeStep = lessonPlan?.sequence?.[0];

  const lessonForApi = lessonPlan
    ? {
        title: lessonPlan.title,
        subject: lessonPlan.subject,
        criticalConcepts: lessonPlan.criticalConcepts,
        keyVocabulary: lessonPlan.keyVocabulary,
        tutorAddendum: lessonPlan.tutorAddendum,
      }
    : {
        title: demoLesson.title,
        subject: demoLesson.subject,
        criticalConcepts: demoLesson.criticalConcepts,
      };

  const stepForApi = activeStep
    ? {
        title: activeStep.title,
        goal: activeStep.goal,
        activityType: activeStep.activityType,
      }
    : undefined;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, reasonCard, pending]);

  // Reason auto-fire — when the pupil hits the scaffold ceiling on the
  // current step's first critical concept, the system fires the Reason
  // probing interaction. The gold inline card slides in.
  const fireReason = useCallback(
    async (trigger: "scaffolding_ceiling" | "topic_boundary" | "lesson_design") => {
      if (!klass || !activeStep) return;
      // Guard re-entry — if a Reason card is already pending (or
      // sessionStorage holds one from a recent refresh), do not fire a
      // second one.
      if (reasonCard) return;
      if (typeof window !== "undefined" && window.sessionStorage.getItem("bw-reason-card")) return;
      const fb = getFirebase();
      if (!fb.ready || !fb.auth.currentUser) return;
      const concept =
        activeStep.criticalConcepts?.[0] ??
        lessonPlan?.criticalConcepts?.[0] ??
        activeStep.title;
      const lastTutor = [...messages].reverse().find((m) => m.role === "tutor");
      try {
        const token = await fb.auth.currentUser.getIdToken();
        const res = await fetch("/api/reason/fire", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken: token,
            trigger,
            concept,
            subject: lessonPlan?.subject,
            priorTutorTurn: lastTutor?.content,
            lastType: reasonLastType,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          const card = {
            eventId: data.eventId,
            promptType: data.promptType,
            promptText: data.promptText,
            concept,
          };
          setReasonCard(card);
          setReasonLastType(data.promptType);
          // Persist so a page refresh doesn't lose the eventId binding
          // — without this, the evaluator call would create an orphan
          // pending event and a duplicate answered event.
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem("bw-reason-card", JSON.stringify(card));
          }
        }
      } catch {
        /* non-fatal */
      }
    },
    [klass, activeStep, lessonPlan, messages, reasonLastType, reasonCard]
  );

  // Rehydrate a pending Reason card from sessionStorage on mount so a
  // refreshed pupil session resumes against the same event id.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (reasonCard) return;
    const raw = window.sessionStorage.getItem("bw-reason-card");
    if (!raw) return;
    try {
      const card = JSON.parse(raw);
      if (card?.eventId && card?.promptType) setReasonCard(card);
    } catch {
      window.sessionStorage.removeItem("bw-reason-card");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fireReasonRef = useRef(fireReason);
  useEffect(() => {
    fireReasonRef.current = fireReason;
  }, [fireReason]);

  // Conversation persistence — append each turn (pupil + tutor) so the
  // teacher's drill panel can read history. Best-effort: failures are
  // logged but never block the chat.
  const appendTurn = useCallback(
    async (role: "pupil" | "tutor", content: string, meta?: Record<string, unknown>) => {
      if (!klass) return;
      const fb = getFirebase();
      if (!fb.ready || !fb.auth.currentUser) return;
      try {
        const token = await fb.auth.currentUser.getIdToken();
        await fetch("/api/conversation/append", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token, role, content, meta }),
        });
      } catch {
        /* non-fatal */
      }
    },
    [klass]
  );

  // Engagement classifier — fires every CLASSIFY_EVERY_N pupil messages
  // OR CLASSIFY_EVERY_MS, whichever is first. Server writes to Firestore
  // + RTDB; teacher dashboard subscribes to RTDB and updates live.
  const runClassifier = useCallback(async () => {
    if (!klass) return; // preview mode, no real pupil
    const fb = getFirebase();
    if (!fb.ready || !fb.auth.currentUser) return;
    const s = signalsRef.current;
    const recent = messages.slice(-10).map((m) => ({
      role: (m.role === "pupil" ? "pupil" : "tutor") as "pupil" | "tutor",
      content: m.content,
    }));
    if (recent.length < 2) return;
    try {
      const token = await fb.auth.currentUser.getIdToken();
      const windowSec = Math.max(
        15,
        Math.round((Date.now() - (s.lastClassifiedAt || Date.now() - 60_000)) / 1000)
      );
      const avgResponseTimeSec =
        s.pupilResponseTimes.length > 0
          ? s.pupilResponseTimes.reduce((a, b) => a + b, 0) / s.pupilResponseTimes.length / 1000
          : undefined;
      const avgMessageLength =
        s.pupilMsgCount > 0 ? s.pupilCharsTotal / s.pupilMsgCount : undefined;
      const questionRatio =
        s.pupilMsgCount > 0 ? s.pupilQuestions / s.pupilMsgCount : undefined;
      await fetch("/api/engagement/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: token,
          turns: recent,
          signals: {
            windowSec,
            avgResponseTimeSec,
            avgMessageLength,
            questionRatio,
            scaffoldUseCount: s.scaffoldUseCount,
            scaffoldCeilingHit:
              s.scaffoldUseCount >= (lessonPlan?.scaffoldCeiling ?? 3),
          },
          lessonTitle: lessonPlan?.title,
          lessonSubject: lessonPlan?.subject,
          criticalConcepts: lessonPlan?.criticalConcepts,
          lastPupilExcerpt: s.lastPupilExcerpt,
        }),
      });
      s.lastClassifiedAt = Date.now();
      s.msgsSinceClassify = 0;
    } catch {
      // Classifier failures don't break the chat. We try again on the
      // next cadence tick.
    }
  }, [klass, messages, lessonPlan]);

  const runClassifierRef = useRef(runClassifier);
  useEffect(() => {
    runClassifierRef.current = runClassifier;
  }, [runClassifier]);

  // Time-based fallback: if no classification has run in 60s and at
  // least one pupil message exists, fire one.
  useEffect(() => {
    if (!klass) return;
    const id = setInterval(() => {
      const s = signalsRef.current;
      if (s.pupilMsgCount === 0) return;
      if (Date.now() - s.lastClassifiedAt < 60_000) return;
      runClassifierRef.current();
    }, 15_000);
    return () => clearInterval(id);
  }, [klass]);

  // Session-status subscription (pause / wrap_up / ended).
  useEffect(() => {
    if (!klass) return;
    const unsub = subscribeToSessionStatus(klass.id, (status) => {
      setSessionStatus(status);
    });
    return unsub;
  }, [klass]);

  // Per-pupil intervention subscription.
  useEffect(() => {
    if (!klass) return;
    const fb = getFirebase();
    if (!fb.ready || !fb.auth.currentUser) return;
    const uid = fb.auth.currentUser.uid;
    const unsub = subscribeToPupilInterventions(klass.id, uid, (intervention) => {
      // Render in the chat as appropriate.
      if (intervention.type === "hint" && intervention.text) {
        setMessages((m) => [
          ...m,
          {
            id: nextId(),
            role: "tutor",
            content: intervention.text!,
            timestamp: Date.now(),
            meta: { teacherHint: true },
          },
        ]);
        void appendTurn("tutor", intervention.text, { teacherHint: true });
      } else if (intervention.type === "mode_one_turn") {
        setExpertNextTurn(intervention.rationale ?? "Your teacher has asked the tutor to give a direct answer on the next turn.");
      } else if (intervention.type === "pair_up") {
        setPairWith(intervention.pairWith ?? "another pupil");
      } else if (intervention.type === "pause") {
        setPausedByTeacher(true);
      }
      // Acknowledge so the intervention doesn't replay on reload.
      void acknowledgeIntervention(klass.id, uid, intervention.id);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klass]);

  async function send() {
    const text = input.trim();
    if (!text || inputDisabled) return;
    // After one Expert-mode turn, drop back to the baseline mode.
    const usedExpertOverride = !!expertNextTurn;
    const now = Date.now();
    const pupilMsg: UIMessage = { id: nextId(), role: "pupil", content: text, timestamp: now };
    const optimistic = [...messages, pupilMsg];
    setMessages(optimistic);
    setInput("");
    setPending(true);
    setError(null);

    // Signal capture for the engagement classifier.
    const s = signalsRef.current;
    const lastTutor = [...messages].reverse().find((m) => m.role === "tutor");
    if (lastTutor && s.lastPupilTs >= 0) {
      s.pupilResponseTimes.push(now - lastTutor.timestamp);
      if (s.pupilResponseTimes.length > 20) s.pupilResponseTimes.shift();
    }
    s.pupilMsgCount += 1;
    s.pupilCharsTotal += text.length;
    if (text.includes("?")) s.pupilQuestions += 1;
    s.lastPupilTs = now;
    s.lastPupilExcerpt = text.slice(0, 240);
    s.msgsSinceClassify += 1;

    // Persist the pupil turn.
    void appendTurn("pupil", text);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: toApiMessages(optimistic),
          mode,
          lesson: lessonForApi,
          step: stepForApi,
        }),
      });
      const data = (await res.json()) as {
        text: string;
        fallbackUsed: boolean;
        citations?: Citation[];
        searchQueries?: string[];
      };
      const tutorText = data.text || "(no reply)";
      setMessages((m) => [
        ...m,
        {
          id: nextId(),
          role: "tutor",
          content: tutorText,
          timestamp: Date.now(),
          citations: data.citations,
          searchQueries: data.searchQueries,
          meta: { fallback: data.fallbackUsed },
        },
      ]);
      void appendTurn("tutor", tutorText, {
        fallback: data.fallbackUsed,
        citationCount: data.citations?.length,
      });
    } catch (e) {
      // Roll back the optimistic pupil message — otherwise it sits in
      // the UI without a tutor reply and the teacher's drill panel
      // shows an incomplete conversation.
      setMessages((m) => m.filter((msg) => msg.id !== pupilMsg.id));
      setInput(text); // restore the input so the pupil can try again
      setError(e instanceof Error ? `Couldn't send — ${e.message}. Try again.` : "Couldn't send. Try again.");
    } finally {
      setPending(false);
      // Drop the one-turn Expert override after the turn.
      if (usedExpertOverride) setExpertNextTurn(null);
      // Fire the classifier after every 5 pupil messages.
      if (signalsRef.current.msgsSinceClassify >= 5) {
        runClassifierRef.current();
      }
    }
  }

  async function scaffold(kind: "hint" | "rephrase" | "simplify") {
    if (pending) return;
    signalsRef.current.scaffoldUseCount += 1;
    signalsRef.current.msgsSinceClassify += 1;
    setPending(true);
    setError(null);

    // If the pupil just hit the scaffold ceiling, fire the classifier
    // immediately — wheel-spinning patterns produce few pupil messages,
    // so the standard 5-message cadence would miss them. Also fire
    // Reason — the brief's prescription for the scaffolding-ceiling
    // trigger.
    const ceiling = lessonPlan?.scaffoldCeiling ?? 3;
    if (signalsRef.current.scaffoldUseCount >= ceiling) {
      runClassifierRef.current?.();
      // Only fire Reason once per ceiling event; further presses are
      // already disabled in the UI by the counter.
      if (signalsRef.current.scaffoldUseCount === ceiling) {
        fireReasonRef.current?.("scaffolding_ceiling");
      }
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: toApiMessages(messages),
          scaffold: kind,
        }),
      });
      const data = (await res.json()) as { text: string; fallbackUsed: boolean };
      const tutorText = data.text || "(no reply)";
      setMessages((m) => [
        ...m,
        {
          id: nextId(),
          role: "tutor",
          content: tutorText,
          timestamp: Date.now(),
          meta: { scaffoldAction: kind, fallback: data.fallbackUsed },
        },
      ]);
      void appendTurn("tutor", tutorText, { scaffoldAction: kind, fallback: data.fallbackUsed });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "100%" }}>
      {/* Live banners — teacher actions visible to the pupil */}
      {(sessionStatus || pairWith || expertNextTurn || pausedByTeacher) && (
        <div
          style={{
            padding: "8px 24px",
            borderBottom: "1px solid var(--line)",
            background: "var(--surface-elev)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {sessionWrapUp && (
            <Banner tone="gold" icon={<Sparkles size={12} />} title="Your teacher has called for a wrap-up">
              {sessionStatus?.wrapUpNote ?? "Round off what you have so far — the tutor will help you summarise."}
            </Banner>
          )}
          {sessionEnded && (
            <Banner tone="gold" icon={<Sparkles size={12} />} title="Lesson ended">
              Well done. Your teacher has ended this lesson.
            </Banner>
          )}
          {sessionPaused && (
            <Banner tone="muted" icon={<PauseIcon size={12} />} title="Lesson paused by your teacher">
              The chat is paused for a moment. Wait for your teacher to resume.
            </Banner>
          )}
          {pausedByTeacher && !sessionPaused && (
            <Banner tone="muted" icon={<PauseIcon size={12} />} title="Paused">
              Your teacher has asked you to wait. They will be with you shortly.
            </Banner>
          )}
          {pairWith && (
            <Banner tone="gold" icon={<Users size={12} />} title={`Pair up with ${pairWith}`}>
              Your teacher has paired you with {pairWith} — compare your answers before sending your next reply.
            </Banner>
          )}
          {expertNextTurn && (
            <Banner tone="gold" icon={<Sparkles size={12} />} title="One direct-answer turn">
              {expertNextTurn} The next tutor reply will be more direct than usual.
            </Banner>
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        style={{
          overflowY: "auto",
          padding: "28px 32px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {messages.map((m) => (
          <Bubble key={m.id} message={m} />
        ))}

        {pending && <TypingIndicator />}

        {reasonCard && (
          <ReasonInline
            promptType={reasonCard.promptType}
            promptText={reasonCard.promptText}
            onClose={() => {
              setReasonCard(null);
              if (typeof window !== "undefined") {
                window.sessionStorage.removeItem("bw-reason-card");
              }
            }}
            onSubmit={async (text) => {
              const fb = getFirebase();
              if (!fb.ready || !fb.auth.currentUser) {
                setReasonCard(null);
                return;
              }
              // Render the pupil's response inline as a normal message.
              setMessages((m) => [
                ...m,
                { id: nextId(), role: "pupil", content: text, timestamp: Date.now() },
              ]);
              void appendTurn("pupil", text, { reasonResponse: true });

              // Send to the evaluator. Persist the resulting follow-up
              // tutor turn into the chat.
              try {
                const token = await fb.auth.currentUser.getIdToken();
                const res = await fetch("/api/reason/evaluate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    idToken: token,
                    eventId: reasonCard.eventId,
                    concept: reasonCard.concept,
                    subject: lessonPlan?.subject,
                    promptType: reasonCard.promptType,
                    promptText: reasonCard.promptText,
                    pupilResponse: text,
                    priorTutorTurn: [...messages].reverse().find((m) => m.role === "tutor")?.content,
                  }),
                });
                const data = await res.json();
                if (res.ok && data.response?.tutorTurn) {
                  setMessages((m) => [
                    ...m,
                    {
                      id: nextId(),
                      role: "tutor",
                      content: data.response.tutorTurn,
                      timestamp: Date.now(),
                      meta: { reasonBranch: data.response.branch },
                    },
                  ]);
                  void appendTurn("tutor", data.response.tutorTurn, {
                    reasonBranch: data.response.branch,
                  });
                }
              } catch {
                /* non-fatal */
              }
              setReasonCard(null);
              if (typeof window !== "undefined") {
                window.sessionStorage.removeItem("bw-reason-card");
              }
              // After a Reason answer, reset the scaffold counter for
              // this concept — the pupil has shown what they have, so
              // they get a fresh allowance for the next step.
              signalsRef.current.scaffoldUseCount = 0;
            }}
          />
        )}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: "8px 14px",
            background: "rgba(142,42,42,0.08)",
            color: "var(--color-crimson)",
            fontSize: 12,
            borderTop: "1px solid var(--line)",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          borderTop: "1px solid var(--line)",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: "var(--surface-elev)",
        }}
      >
        <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
          {(() => {
            const ceiling = lessonPlan?.scaffoldCeiling ?? 3;
            const used = signalsRef.current.scaffoldUseCount;
            const remaining = Math.max(0, ceiling - used);
            return (
              <>
                <ScaffoldButton
                  icon={<Lightbulb size={14} />}
                  label="I need a hint"
                  onClick={() => scaffold("hint")}
                  disabled={pending || remaining === 0}
                />
                <ScaffoldButton
                  icon={<RefreshCw size={14} />}
                  label="Say that differently"
                  onClick={() => scaffold("rephrase")}
                  disabled={pending || remaining === 0}
                />
                <ScaffoldButton
                  icon={<TypeIcon size={14} />}
                  label="Use simpler words"
                  onClick={() => scaffold("simplify")}
                  disabled={pending || remaining === 0}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: remaining === 0 ? "var(--color-gold-500)" : "var(--text-muted)",
                    fontWeight: remaining === 0 ? 600 : 400,
                    marginLeft: 4,
                  }}
                  title="Scaffold ceiling per concept — when you run out, the tutor will pause to check what you have understood so far."
                >
                  {remaining} of {ceiling} left
                </span>
                <div style={{ flex: 1 }} />
              </>
            );
          })()}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              sessionEnded
                ? "Lesson ended"
                : sessionPaused
                ? "Lesson paused…"
                : pausedByTeacher
                ? "Paused by your teacher…"
                : pending
                ? "Tutor is thinking…"
                : "Reply to the tutor…"
            }
            disabled={inputDisabled}
            aria-label="Your reply"
            style={{
              flex: 1,
              padding: "10px 14px",
              border: "1px solid var(--line)",
              borderRadius: 6,
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: 15,
              fontFamily: "var(--font-sans)",
              opacity: inputDisabled ? 0.6 : 1,
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || inputDisabled}
            className="bw-btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Send size={14} /> Send
          </button>
        </div>
      </div>
    </div>
  );
}

function Banner({
  tone,
  icon,
  title,
  children,
}: {
  tone: "gold" | "muted";
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const bg = tone === "gold" ? "rgba(181,138,60,0.10)" : "rgba(15,26,46,0.04)";
  const border = tone === "gold" ? "var(--color-gold-500)" : "var(--text-muted)";
  const colour = tone === "gold" ? "var(--color-gold-500)" : "var(--text-muted)";
  return (
    <div
      style={{
        padding: "8px 12px",
        background: bg,
        borderLeft: `3px solid ${border}`,
        borderRadius: 6,
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      <div className="flex items-center gap-2" style={{ color: colour, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", marginBottom: 2 }}>
        {icon}
        <span>{title}</span>
      </div>
      <div style={{ color: "var(--text)" }}>{children}</div>
    </div>
  );
}

function ScaffoldButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bw-btn-secondary"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        padding: "7px 12px",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function Bubble({ message }: { message: UIMessage }) {
  if (message.role === "tutor") {
    // Teacher hint — visually distinct from the AI tutor.
    if (message.meta?.teacherHint) {
      return (
        <div style={{ maxWidth: 660 }}>
          <span className="bw-section-label" style={{ display: "block", marginBottom: 6, color: "var(--color-gold-500)" }}>
            From your teacher
          </span>
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(181,138,60,0.12)",
              borderLeft: "3px solid var(--color-gold-500)",
              fontSize: 15,
              lineHeight: 1.5,
              color: "var(--text)",
              whiteSpace: "pre-wrap",
            }}
          >
            {message.content}
          </div>
        </div>
      );
    }
    return (
      <div style={{ maxWidth: 660 }}>
        <span className="bw-section-label" style={{ display: "block", marginBottom: 6 }}>
          Tutor
          {message.meta?.scaffoldAction && ` · ${message.meta.scaffoldAction}`}
          {message.meta?.reasonBranch && ` · reason ${message.meta.reasonBranch}`}
          {message.meta?.fallback && " · fallback"}
        </span>
        <p className="bw-tutor" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
          {message.content}
        </p>
        {message.citations && message.citations.length > 0 && (
          <Citations citations={message.citations} queries={message.searchQueries} />
        )}
      </div>
    );
  }
  if (message.role === "pupil") {
    return (
      <div style={{ alignSelf: "flex-end", maxWidth: 520 }}>
        <div
          style={{
            background: "var(--color-navy-900)",
            color: "var(--color-cream-50)",
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 15,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }
  return null;
}

function Citations({ citations, queries }: { citations: Citation[]; queries?: string[] }) {
  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: "1px dashed var(--line)",
        fontSize: 11,
      }}
    >
      <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
        <Sparkles size={11} color="var(--color-gold-500)" />
        <span
          style={{
            color: "var(--color-gold-500)",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Verified · {citations.length} source{citations.length === 1 ? "" : "s"}
        </span>
        {queries && queries.length > 0 && (
          <span style={{ color: "var(--text-muted)" }}>· {queries.slice(0, 2).join(", ")}</span>
        )}
      </div>
      <ol style={{ margin: 0, paddingLeft: 18, color: "var(--text-muted)", display: "grid", gap: 3 }}>
        {citations.slice(0, 5).map((c, i) => (
          <li key={i}>
            <a
              href={c.uri}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--text)", textDecoration: "none" }}
            >
              {c.title || c.uri}
              <ExternalLink size={9} style={{ marginLeft: 4, verticalAlign: "middle" }} />
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ maxWidth: 660, opacity: 0.7 }}>
      <span className="bw-section-label" style={{ display: "block", marginBottom: 6 }}>
        Tutor
      </span>
      <div className="flex items-center gap-1.5" aria-label="Tutor is thinking">
        <Dot delay={0} />
        <Dot delay={120} />
        <Dot delay={240} />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: "var(--text-muted)",
        display: "inline-block",
        animation: `bw-pulse 1100ms ${delay}ms infinite ease-in-out`,
      }}
    />
  );
}

const REASON_TYPE_LABEL: Record<ReasonPromptType, string> = {
  paraphrase: "Paraphrase",
  novel_example: "Your own example",
  counterfactual: "What if",
  teach_back: "Teach it back",
};

function ReasonInline({
  promptType,
  promptText,
  onSubmit,
  onClose,
}: {
  promptType: ReasonPromptType;
  promptText: string;
  onSubmit: (text: string) => Promise<void>;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="bw-reason-surface" style={{ maxWidth: 660 }}>
      <div className="bw-reason-label">Reason · {REASON_TYPE_LABEL[promptType]}</div>
      <p className="bw-tutor" style={{ margin: 0, marginBottom: 12, fontSize: 16 }}>
        {promptText}
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        placeholder="A sentence or two in your own words is plenty."
        aria-label="Your response"
        style={{
          width: "100%",
          padding: 10,
          border: "1px solid var(--line)",
          borderRadius: 6,
          background: "var(--surface)",
          color: "var(--text)",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          resize: "vertical",
        }}
      />
      <div className="flex items-center justify-end gap-2" style={{ marginTop: 10 }}>
        <button
          className="bw-btn-secondary"
          style={{ fontSize: 12 }}
          onClick={onClose}
          disabled={busy}
        >
          Skip for now
        </button>
        <button
          className="bw-btn-emphasis"
          style={{ fontSize: 12 }}
          disabled={!value.trim() || busy}
          onClick={async () => {
            setBusy(true);
            await onSubmit(value.trim());
            setBusy(false);
          }}
        >
          {busy ? "Sending…" : "Submit"}
        </button>
      </div>
    </div>
  );
}
