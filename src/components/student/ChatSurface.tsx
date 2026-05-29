"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lightbulb, RefreshCw, Type as TypeIcon, Send, ExternalLink, Sparkles, Users, Pause as PauseIcon, Mic, Square } from "lucide-react";
import { speak, startBritishDictation, speechInputAvailable, type Dictation } from "@/lib/voice";
import { VOICE_OUTPUT_KEY } from "@/components/student/AccessibilityMenu";
import type { ClassRecord, LessonPlan, Message, ReasonPromptType } from "@/types";
import { demoLesson, demoTutorOpening } from "@/lib/demo/data";
import { getFirebase } from "@/lib/firebase/client";
import { getCleanIdToken } from "@/lib/firebase/auth-fetch";
import {
  acknowledgeIntervention,
  bumpPupilLiveMessage,
  subscribeToPupilInterventions,
  subscribeToPupilSelf,
  subscribeToSessionStatus,
  type SessionStatus,
} from "@/lib/firebase/live";

// Chat surface — calls /api/chat which fronts the tutor LLM.
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
  // The pupil's effective, per-pupil challenge level (adaptive difficulty,
  // drifted across sessions). Overrides the lesson-wide default so the
  // tutor pitches per pupil. Falls back to the lesson plan's level.
  effectiveChallengeLevel?: "foundation" | "core" | "stretch";
  // SEND adaptation block, derived server-side from the pupil's structured
  // SEND profile. Fed to the tutor as pupilProfile so it adapts HOW it
  // communicates. Absent when the pupil has no SEND profile.
  pupilProfile?: string;
}

export function ChatSurface({ klass, effectiveChallengeLevel, pupilProfile }: ChatSurfaceProps = {}) {
  const lessonPlan: LessonPlan | undefined = klass?.lessonPlan;
  const openingText =
    lessonPlan?.sequence?.[0]?.openingPrompt ?? demoTutorOpening;

  const [messages, setMessages] = useState<UIMessage[]>(() => [
    { id: nextId(), role: "tutor", content: openingText, timestamp: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [dictating, setDictating] = useState(false);
  const [micAvailable, setMicAvailable] = useState(false);
  const dictationRef = useRef<Dictation | null>(null);
  // Ref to the composer so we can return focus after each turn — on a shared
  // iPad, re-tapping the field every message is a real per-turn tax.
  const inputRef = useRef<HTMLInputElement | null>(null);
  // The scaffold-use count lives in signalsRef (read every turn for triggers),
  // but the "N of N left" pill + disabled state are UI and must re-render when
  // it changes. Mirror it into state so the pill is never stale.
  const [scaffoldUsed, setScaffoldUsed] = useState(0);

  useEffect(() => {
    setMicAvailable(speechInputAvailable());
    return () => dictationRef.current?.stop();
  }, []);

  function toggleDictation() {
    if (dictating) {
      dictationRef.current?.stop();
      return;
    }
    const d = startBritishDictation({
      onText: (text) => setInput((prev) => (prev ? `${prev} ${text}` : text)),
      onEnd: () => {
        setDictating(false);
        dictationRef.current = null;
      },
      onError: () => {
        setDictating(false);
        dictationRef.current = null;
      },
    });
    if (d) {
      dictationRef.current = d;
      setDictating(true);
    }
  }
  const [pending, setPending] = useState(false);
  // The id of the tutor message currently streaming in, so its bubble can
  // show a live caret while tokens arrive (otherwise text just accretes with
  // no signal that the tutor is "writing").
  const [streamingId, setStreamingId] = useState<string | null>(null);
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
  // Current step the pupil is inside — mirrored from RTDB by the
  // engagement-run route as the classifier sustains a high-confidence
  // read. Starts at 0 and only ever moves forward.
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
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
    // ── Reason trigger book-keeping ──────────────────────────────────
    // The two non-scaffold triggers (topic_boundary, lesson_design)
    // need their own counters so they fire at the right cadence rather
    // than on every turn.
    //
    // substantiveFlowingTurnsSinceReason: number of pupil replies that
    // were both classified `flowing` (or assumed-flowing while we wait
    // for the next classifier tick) AND substantive (≥ 30 chars or
    // contains a clause-marker). When this hits 4 we fire a
    // topic_boundary Reason — gives the high attainer a natural moment
    // to be probed.
    substantiveFlowingTurnsSinceReason: 0,
    // criticalConceptExplained: classes of critical-concept that the
    // tutor has just named in its turn. When the lesson plan marks
    // these as critical AND the tutor mentions one, the next pupil
    // turn triggers a `lesson_design` Reason — letting the system
    // probe whether the explanation landed.
    criticalConceptJustExplained: null as string | null,
    pupilTurnsSinceCriticalMention: 0,
  });

  // Mode is set by the lesson plan; the teacher can override for ONE
  // turn via the intervention panel (with a rationale). Pupils never
  // choose. Stops the "press Expert to get the answer" failure mode.
  const baseMode = lessonPlan?.defaultMode ?? "coach";
  const mode = expertNextTurn ? "expert" : baseMode;
  const sessionEnded = sessionStatus?.value === "ended";
  const sessionWrapUp = sessionStatus?.value === "wrap_up";
  const sessionPaused = sessionStatus?.value === "paused";
  // A missing status doc means the teacher hasn't started the class yet —
  // pupils are in the lobby, chat locked until they do. BUT only when there
  // is a real class: in the unauthenticated design-preview (`klass` is
  // undefined) the status subscription never runs, so `sessionStatus` stays
  // null forever — we must NOT treat that as a locked lobby, or the preview
  // (which is meant to stay exercisable) is permanently disabled.
  const sessionNotStarted =
    klass != null && (!sessionStatus || sessionStatus.value === "not_started");
  // While a Reason prompt is open the pupil answers IN the gold card, which
  // has its own input. Lock the main reply box so there aren't two places to
  // type — otherwise pupils start typing here and their answer never reaches
  // the Reason evaluator.
  const reasonActive = reasonCard != null;
  const inputDisabled =
    pending || pausedByTeacher || sessionEnded || sessionPaused || sessionNotStarted || reasonActive;
  // Whether any teacher-driven banner is currently showing — drives the
  // banner bar's enter/exit so it slides in/out rather than popping (and
  // never renders as an empty bordered strip when the class is merely active).
  const anyBanner =
    sessionWrapUp ||
    sessionEnded ||
    sessionPaused ||
    (pausedByTeacher && !sessionPaused) ||
    !!pairWith ||
    !!expertNextTurn;

  // Reset the opening turn when the lesson plan changes (joining a
  // different class).
  useEffect(() => {
    setMessages([{ id: nextId(), role: "tutor", content: openingText, timestamp: Date.now() }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonPlan?.id]);

  // The active step the tutor is anchored to. Driven by
  // currentStepIndex which the engagement-run route advances when the
  // classifier confirms sustained understanding. When the pupil has
  // moved past the final step, we switch to the extension brief
  // instead of clamping to the last step — this is how the high
  // attainer gets the above-syllabus stretch.
  const stepCount = lessonPlan?.sequence?.length ?? 0;
  const inExtension = !!(
    lessonPlan?.extension && stepCount > 0 && currentStepIndex >= stepCount
  );
  const activeStep =
    lessonPlan?.sequence?.[currentStepIndex] ??
    lessonPlan?.sequence?.[stepCount - 1] ??
    lessonPlan?.sequence?.[0];

  const lessonForApi = lessonPlan
    ? {
        title: lessonPlan.title,
        subject: lessonPlan.subject,
        criticalConcepts: lessonPlan.criticalConcepts,
        keyVocabulary: lessonPlan.keyVocabulary,
        tutorAddendum: lessonPlan.tutorAddendum,
        // Per-pupil drifted level wins over the lesson-wide default.
        challengeLevel: effectiveChallengeLevel ?? lessonPlan.challengeLevel,
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

  const extensionForApi =
    inExtension && lessonPlan?.extension
      ? {
          brief: lessonPlan.extension.brief,
          stretchHint: lessonPlan.extension.stretchHint,
        }
      : undefined;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    // A tall reply (e.g. an Expert turn with a citations block) can grow
    // after this fires, leaving the pupil short of the true bottom. A
    // follow-up scroll on the next frame catches the settled height.
    const raf = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
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

  // Self-subscription to read the live currentStepIndex set by the
  // engagement-run route. This is how the pupil moves through the
  // lesson plan without the teacher having to drive it.
  useEffect(() => {
    if (!klass) return;
    const fb = getFirebase();
    if (!fb.ready || !fb.auth.currentUser) return;
    const uid = fb.auth.currentUser.uid;
    const unsub = subscribeToPupilSelf(klass.id, uid, (live) => {
      if (!live) return;
      // Guard hard against undefined / NaN: a stale RTDB payload (e.g.
      // network blip) can deliver a falsy currentStepIndex which the
      // previous `Math.max(prev, undefined)` coerced to NaN and silently
      // broke step progression. Only advance when the incoming value is
      // a finite number ≥ the current step.
      const next = live.currentStepIndex;
      if (typeof next === "number" && Number.isFinite(next) && next >= 0) {
        setCurrentStepIndex((prev) => {
          // Reset the scaffold counter when the pupil moves to a new
          // step — the ceiling is per-concept, not per-session, and
          // pupils were getting stranded with greyed-out scaffolds
          // they earned on step 1 still blocking step 2.
          if (next > prev) {
            signalsRef.current.scaffoldUseCount = 0;
            setScaffoldUsed(0);
          }
          return next > prev ? next : prev;
        });
      }
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

  // Build /api/chat headers, attaching the pupil's ID token when signed in
  // so the server rate-limiter keys by UID (not shared classroom IP — a whole
  // class behind one NAT would otherwise collide on the per-IP budget).
  // Falls back to no token in the demo/preview (unauthenticated) path.
  async function chatHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    // getCleanIdToken strips control chars that otherwise make the iOS-Safari
    // Headers constructor throw "string did not match the expected pattern".
    const token = await getCleanIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

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
    // The first pupil message is now recorded too: the delta between
    // the tutor's opening prompt and the pupil's first reply is a real
    // engagement signal (how long they took to engage). Previously the
    // guard `s.lastPupilTs >= 0` was always true once lastPupilTs
    // initialised to 0, so the intent (skip first turn) silently broke;
    // we drop the guard and key only off lastTutor existing.
    const s = signalsRef.current;
    const lastTutor = [...messages].reverse().find((m) => m.role === "tutor");
    if (lastTutor) {
      const delta = Math.max(0, now - lastTutor.timestamp);
      // Cap at 10 minutes — a pupil who walked away mid-lesson shouldn't
      // poison the average.
      s.pupilResponseTimes.push(Math.min(delta, 10 * 60 * 1000));
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
    // Optimistic dashboard bump — moves the pupil's card on the
    // teacher's view between classifier snapshots.
    if (klass) {
      const fb = getFirebase();
      if (fb.ready && fb.auth.currentUser) {
        void bumpPupilLiveMessage(klass.id, fb.auth.currentUser.uid);
      }
    }

    try {
      // Coach turns stream (the reply appears as it's typed); Expert turns
      // stay on the JSON path so their grounding citations come through whole.
      const wantStream = mode === "coach";
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: await chatHeaders(),
        body: JSON.stringify({
          messages: toApiMessages(optimistic),
          mode,
          lesson: lessonForApi,
          step: stepForApi,
          extension: extensionForApi,
          pupilProfile,
          stream: wantStream,
        }),
      });
      if (!res.ok) {
        // 429 (rate-limited) / 4xx / 5xx return a JSON error body with no
        // `text`. Surface it (the catch rolls back the optimistic message
        // and restores the input) rather than rendering "(no reply)".
        const errBody = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        throw new Error(
          res.status === 429
            ? errBody.message ?? "You're sending messages very quickly — give it a few seconds."
            : errBody.error ?? errBody.message ?? `The tutor is unavailable right now (${res.status}).`,
        );
      }

      let tutorText: string;
      let tutorFallback = false;
      let tutorCitationCount: number | undefined;

      if (wantStream && res.body) {
        // Stream the reply into a single tutor bubble, appending deltas as
        // they arrive so the words appear progressively.
        const streamId = nextId();
        setStreamingId(streamId);
        setMessages((m) => [
          ...m,
          { id: streamId, role: "tutor", content: "", timestamp: Date.now(), meta: {} },
        ]);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((m) => m.map((msg) => (msg.id === streamId ? { ...msg, content: acc } : msg)));
        }
        acc += decoder.decode();
        tutorText = acc || "I can't reply just now — give it a moment and try again.";
        setMessages((m) => m.map((msg) => (msg.id === streamId ? { ...msg, content: tutorText } : msg)));
        setStreamingId(null);
      } else {
        const data = (await res.json()) as {
          text: string;
          fallbackUsed: boolean;
          citations?: Citation[];
          searchQueries?: string[];
        };
        tutorText = data.text || "I can't reply just now — give it a moment and try again.";
        tutorFallback = data.fallbackUsed;
        tutorCitationCount = data.citations?.length;
        // Only surface citations when this turn was in Expert mode (or a
        // one-shot expert override fired by the teacher). Coach mode is
        // meant to be question-only; stray "Verified · N sources" chips
        // under a coach turn read as confusing for a Y8.
        const turnInExpertMode = mode === "expert" || usedExpertOverride;
        setMessages((m) => [
          ...m,
          {
            id: nextId(),
            role: "tutor",
            content: tutorText,
            timestamp: Date.now(),
            citations: turnInExpertMode ? data.citations : undefined,
            searchQueries: turnInExpertMode ? data.searchQueries : undefined,
            meta: { fallback: data.fallbackUsed },
          },
        ]);
      }
      // Read the tutor's reply aloud (British voice) when the pupil has
      // opted in via the accessibility menu. Best-effort, never blocks.
      if (typeof window !== "undefined" && localStorage.getItem(VOICE_OUTPUT_KEY) === "on") {
        void speak(tutorText);
      }
      // ── Reason trigger book-keeping ──────────────────────────────
      // Two missing triggers, now wired:
      //
      //   topic_boundary: when the pupil has produced N substantive
      //     replies in a row, fire Reason as a natural pause-point.
      //     Was checked by `dress-rehearsal` agent — without this, a
      //     flowing pupil never sees the gold card on stage.
      //
      //   lesson_design: when the tutor just named one of the lesson's
      //     critical concepts, mark it. The NEXT pupil reply triggers
      //     Reason — we probe whether the explanation landed.
      //
      // Both are best-effort heuristics; they fire at most once per
      // class because reasonCard self-guards against re-entry.
      const tutorLower = tutorText.toLowerCase();
      const concepts =
        lessonPlan?.criticalConcepts ?? activeStep?.criticalConcepts ?? [];
      const namedConcept =
        concepts.find((c) => c && tutorLower.includes(c.toLowerCase().slice(0, 14))) ?? null;
      if (namedConcept) {
        signalsRef.current.criticalConceptJustExplained = namedConcept;
        signalsRef.current.pupilTurnsSinceCriticalMention = 0;
      }

      const wasSubstantive = text.length >= 30 || /[,;:]|[a-z]\s+(because|so|but|and)\s+/i.test(text);
      if (wasSubstantive) {
        signalsRef.current.substantiveFlowingTurnsSinceReason += 1;
      }

      // lesson_design — fire one turn after the tutor named the
      // concept, so the pupil has the explanation fresh in mind.
      if (
        signalsRef.current.criticalConceptJustExplained &&
        signalsRef.current.pupilTurnsSinceCriticalMention >= 1
      ) {
        const c = signalsRef.current.criticalConceptJustExplained;
        signalsRef.current.criticalConceptJustExplained = null;
        signalsRef.current.pupilTurnsSinceCriticalMention = 0;
        fireReasonRef.current?.("lesson_design");
        // Mark anchor for telemetry — useful when reading the report.
        void appendTurn("tutor", `[reason-anchor:lesson_design:${c}]`, { reasonAnchor: true });
      } else if (signalsRef.current.criticalConceptJustExplained) {
        signalsRef.current.pupilTurnsSinceCriticalMention += 1;
      }

      // topic_boundary — fire after 4 substantive flowing replies in a
      // row. Threshold tuned to give a class of ~6 pupils ~one Reason
      // moment each over an 8-turn lesson without crowding.
      if (signalsRef.current.substantiveFlowingTurnsSinceReason >= 4) {
        signalsRef.current.substantiveFlowingTurnsSinceReason = 0;
        fireReasonRef.current?.("topic_boundary");
      }

      void appendTurn("tutor", tutorText, {
        fallback: tutorFallback,
        citationCount: tutorCitationCount,
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
      setStreamingId(null);
      // Return focus to the composer so the pupil can keep typing without
      // re-tapping the field every turn (real friction on a shared iPad).
      if (!inputDisabled) inputRef.current?.focus();
      // Drop the one-turn Expert override after the turn.
      if (usedExpertOverride) setExpertNextTurn(null);
      // Fire the classifier after every 5 pupil messages.
      if (signalsRef.current.msgsSinceClassify >= 5) {
        runClassifierRef.current();
      }
    }
  }

  // B1 — Reason resumption. After the pupil answers a Reason prompt and the
  // responder acknowledges, the lesson must not stall: the tutor takes a
  // fresh coach turn so the conversation resumes (brief/03 §4 "the
  // conversation resumes"). Called with the running history (built
  // explicitly in the Reason onSubmit so it isn't a stale setState read).
  async function resumeWithCoachTurn(history: UIMessage[]) {
    if (!klass) return;
    setPending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: await chatHeaders(),
        body: JSON.stringify({
          messages: toApiMessages(history),
          // Resume always in the lesson's base register (coach), never
          // carrying a teacher one-turn Expert override into the resume.
          mode: baseMode,
          lesson: lessonForApi,
          step: stepForApi,
          extension: extensionForApi,
          pupilProfile,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { text: string; fallbackUsed: boolean };
      const tutorText = data.text;
      if (tutorText) {
        setMessages((m) => [
          ...m,
          {
            id: nextId(),
            role: "tutor",
            content: tutorText,
            timestamp: Date.now(),
            meta: { fallback: data.fallbackUsed, reasonResume: true },
          },
        ]);
        void appendTurn("tutor", tutorText, { fallback: data.fallbackUsed, reasonResume: true });
      }
    } catch {
      // Never leave the pupil staring at a closed Reason card with no next
      // move — a calm generative line keeps the lesson alive even if the
      // tutor call fails.
      const soft = "Let's pick up where we were — what's the next thing you want to work out?";
      setMessages((m) => [
        ...m,
        { id: nextId(), role: "tutor", content: soft, timestamp: Date.now() },
      ]);
      void appendTurn("tutor", soft);
    } finally {
      setPending(false);
      if (!inputDisabled) inputRef.current?.focus();
    }
  }

  async function scaffold(kind: "hint" | "rephrase" | "simplify") {
    if (pending) return;
    signalsRef.current.scaffoldUseCount += 1;
    setScaffoldUsed(signalsRef.current.scaffoldUseCount);
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
        headers: await chatHeaders(),
        body: JSON.stringify({
          messages: toApiMessages(messages),
          scaffold: kind,
        }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        throw new Error(
          res.status === 429
            ? errBody.message ?? "Too many requests just now — give it a few seconds."
            : errBody.error ?? errBody.message ?? `Couldn't fetch a hint (${res.status}).`,
        );
      }
      const data = (await res.json()) as { text: string; fallbackUsed: boolean };
      const tutorText = data.text || "I can't reply just now — give it a moment and try again.";
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
      if (!inputDisabled) inputRef.current?.focus();
    }
  }

  return (
    // Flex column (not a fixed grid-rows template): the step bar and live
    // banners render conditionally, so a positional "auto auto 1fr auto"
    // grid would misassign the messages/composer to the wrong rows and
    // leave the 1fr expansion row empty — floating the composer up the
    // screen. Flex with the messages area as the only grow child keeps the
    // composer pinned to the bottom regardless of which optional rows show.
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Step indicator — pupil can see where the tutor is in the plan.
          In extension mode, name the extension explicitly rather than
          re-showing the final lesson step title (which was confusing
          the pupil: the bar reads "complete" but the title still names
          step N). */}
      {lessonPlan && activeStep && stepCount > 1 && (
        <StepProgress
          stepIndex={currentStepIndex}
          stepCount={stepCount}
          stepTitle={
            inExtension && lessonPlan.extension
              ? lessonPlan.extension.title || "Extension"
              : activeStep.title
          }
        />
      )}

      {/* Live banners — teacher actions visible to the pupil. The bar
          slides in/out as a whole (exit plays via AnimatePresence) instead
          of popping. */}
      <AnimatePresence initial={false}>
        {anyBanner && (
        <motion.div
          key="banner-bar"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          style={{
            overflow: "hidden",
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
        </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={scrollRef}
        // Announce new tutor/pupil turns to screen readers. role="log" +
        // aria-live="polite" makes assistive tech read each appended message
        // without stealing focus — the tutor's replies are otherwise silent
        // to a blind or low-vision pupil. "additions text" keeps it to new
        // content only, not a re-read of the whole transcript on each update.
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Conversation with your tutor"
        aria-busy={pending}
        style={{
          // The only grow child: takes all remaining height and scrolls
          // internally (flex-basis 0 + minHeight:0) so the composer below
          // stays pinned to the bottom and long conversations scroll here
          // rather than pushing the composer off-screen.
          flex: "1 1 0",
          minHeight: 0,
          overflowY: "auto",
          padding: "28px 32px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {messages.map((m) => (
          <Bubble key={m.id} message={m} streaming={m.id === streamingId} />
        ))}

        {pending && !streamingId && <TypingIndicator />}

        <AnimatePresence>
        {reasonCard && (
          <ReasonInline
            key={reasonCard.eventId}
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
              // Build the running history explicitly so the B1 resume coach
              // turn sees the full Reason exchange (pupil answer + responder
              // acknowledgement) rather than a stale setState snapshot.
              const priorTutor = [...messages].reverse().find((m) => m.role === "tutor")?.content;
              const pupilMsg: UIMessage = {
                id: nextId(),
                role: "pupil",
                content: text,
                timestamp: Date.now(),
              };
              let convo: UIMessage[] = [...messages, pupilMsg];
              setMessages(convo);
              void appendTurn("pupil", text, { reasonResponse: true });

              // Send to the evaluator; capture the branch + responder line.
              let branch: string | undefined;
              let responderTurn: string | undefined;
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
                    priorTutorTurn: priorTutor,
                  }),
                });
                const data = await res.json();
                if (res.ok && data.response?.tutorTurn) {
                  branch = data.response.branch;
                  responderTurn = data.response.tutorTurn;
                }
              } catch {
                /* non-fatal — fallback below keeps the conversation alive */
              }

              // Append the responder acknowledgement (or, if the evaluator
              // failed, a calm generative line — never meet pupil effort
              // with silence).
              const ackText =
                responderTurn ?? "Thanks — that's a good effort. Let's keep going.";
              const ackMsg: UIMessage = {
                id: nextId(),
                role: "tutor",
                content: ackText,
                timestamp: Date.now(),
                meta: branch ? { reasonBranch: branch } : undefined,
              };
              convo = [...convo, ackMsg];
              setMessages(convo);
              void appendTurn("tutor", ackText, branch ? { reasonBranch: branch } : undefined);

              setReasonCard(null);
              if (typeof window !== "undefined") {
                window.sessionStorage.removeItem("bw-reason-card");
              }
              // After a Reason answer, reset the scaffold counter for
              // this concept — the pupil has shown what they have, so
              // they get a fresh allowance for the next step.
              signalsRef.current.scaffoldUseCount = 0;
              setScaffoldUsed(0);

              // ── B1: Reason resumption ──────────────────────────────────
              // soft_challenge already ends in a targeted follow-up
              // *question*, so the pupil has a clear next move. accept,
              // pattern_flag, and the evaluator-failure fallback all end in a
              // closing acknowledgement with NO question — which left the
              // lesson stalled. Take a fresh coach turn so the tutor
              // re-engages and the conversation resumes.
              if (branch !== "soft_challenge") {
                await resumeWithCoachTurn(convo);
              }
            }}
          />
        )}
        </AnimatePresence>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            flexShrink: 0,
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
          flexShrink: 0,
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
            const used = scaffoldUsed;
            const remaining = Math.max(0, ceiling - used);
            return (
              <>
                <ScaffoldButton
                  icon={<Lightbulb size={14} />}
                  label="I need a hint"
                  onClick={() => scaffold("hint")}
                  disabled={pending || remaining === 0 || reasonActive}
                />
                <ScaffoldButton
                  icon={<RefreshCw size={14} />}
                  label="Say that differently"
                  onClick={() => scaffold("rephrase")}
                  disabled={pending || remaining === 0 || reasonActive}
                />
                <ScaffoldButton
                  icon={<TypeIcon size={14} />}
                  label="Use simpler words"
                  onClick={() => scaffold("simplify")}
                  disabled={pending || remaining === 0 || reasonActive}
                />
                <motion.span
                  // One-shot scale pulse the moment the ceiling is hit, so the
                  // pupil notices the scaffolds locking rather than just seeing
                  // greyed buttons. Keyed off remaining === 0.
                  animate={remaining === 0 ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.2, 0.9, 0.2, 1] }}
                  style={{
                    display: "inline-block",
                    transformOrigin: "left center",
                    fontSize: 11,
                    color: remaining === 0 ? "var(--color-gold-500)" : "var(--text-muted)",
                    fontWeight: remaining === 0 ? 600 : 400,
                    marginLeft: 4,
                  }}
                  title="Scaffold ceiling per concept — when you run out, the tutor will pause to check what you have understood so far."
                >
                  {remaining} of {ceiling} left
                </motion.span>
                <div style={{ flex: 1 }} />
              </>
            );
          })()}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
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
                : reasonActive
                ? "Answer in the gold box above…"
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
              transition: "opacity var(--dur-fast) var(--ease-standard)",
            }}
          />
          {micAvailable && (
            <button
              onClick={toggleDictation}
              disabled={inputDisabled}
              className="bw-btn-secondary"
              aria-label={dictating ? "Stop dictation" : "Dictate your reply"}
              aria-pressed={dictating}
              title={dictating ? "Stop" : "Speak your reply"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: 10,
                color: dictating ? "var(--color-crimson)" : undefined,
                borderColor: dictating ? "var(--color-crimson)" : undefined,
                transition:
                  "color var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)",
                // While recording, a gentle crimson ring breathes so it's
                // unmistakably "live" (currentColor is crimson here).
                animation: dictating ? "bw-pulse-glow 1.4s ease-in-out infinite" : undefined,
              }}
            >
              {dictating ? <Square size={14} /> : <Mic size={14} />}
            </button>
          )}
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
  const bg = tone === "gold" ? "var(--color-gold-tint-2)" : "rgba(15,26,46,0.04)";
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
        transition: "opacity var(--dur-fast) var(--ease-standard)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// Each turn fades+rises in on mount. Keyed by message id in the map, so only
// newly appended turns animate — turns already on screen keep their identity
// and don't replay. A streaming coach turn mounts empty (animating in) and
// then fills, showing a live caret until the stream completes.
const bubbleEnter = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, ease: [0, 0, 0.2, 1] as [number, number, number, number] },
};

function Bubble({ message, streaming }: { message: UIMessage; streaming?: boolean }) {
  if (message.role === "tutor") {
    // Teacher hint — visually distinct from the AI tutor.
    if (message.meta?.teacherHint) {
      return (
        <motion.div style={{ maxWidth: 660 }} {...bubbleEnter}>
          <span className="bw-section-label" style={{ display: "block", marginBottom: 6, color: "var(--color-gold-text)" }}>
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
        </motion.div>
      );
    }
    return (
      <motion.div style={{ maxWidth: 660 }} {...bubbleEnter}>
        <span className="bw-section-label" style={{ display: "block", marginBottom: 6 }}>
          Tutor
          {message.meta?.scaffoldAction && ` · ${message.meta.scaffoldAction}`}
          {message.meta?.reasonBranch && ` · reason ${message.meta.reasonBranch}`}
          {message.meta?.fallback && " · fallback"}
        </span>
        <p className="bw-tutor" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
          {message.content}
          {streaming && <span className="bw-caret" aria-hidden />}
        </p>
        {message.citations && message.citations.length > 0 && (
          <Citations citations={message.citations} queries={message.searchQueries} />
        )}
      </motion.div>
    );
  }
  if (message.role === "pupil") {
    return (
      <motion.div style={{ alignSelf: "flex-end", maxWidth: 520 }} {...bubbleEnter}>
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
      </motion.div>
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
            color: "var(--color-gold-text)",
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
    // motion owns enter+exit here (AnimatePresence in the parent plays the
    // exit on submit/skip); `animation: none` suppresses the CSS
    // bw-reason-enter on .bw-reason-surface so the two don't double up.
    <motion.div
      className="bw-reason-surface"
      style={{ maxWidth: 660, animation: "none" }}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
    >
      <div className="bw-reason-label">Reason · {REASON_TYPE_LABEL[promptType]}</div>
      <p
        style={{
          margin: 0,
          marginBottom: 10,
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--text-muted)",
        }}
      >
        A quick pause to think it through in your own words — this is how the
        idea sticks. There&apos;s no marking here; answer in this box, then carry
        on with the tutor.
      </p>
      <p className="bw-tutor" style={{ margin: 0, marginBottom: 12, fontSize: 16 }}>
        {promptText}
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        autoFocus
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
    </motion.div>
  );
}

function StepProgress({
  stepIndex,
  stepCount,
  stepTitle,
}: {
  stepIndex: number;
  stepCount: number;
  stepTitle: string;
}) {
  // Soft 0–100 bar instead of a hard "Step 2 of 4" countdown. The pupil
  // sees motion as they progress, but never an explicit number that
  // implies a finish line they're behind on. The single line below
  // names just the current focus — "Right now: …" — without listing
  // future phases.
  //
  // We treat the bar as continuous within the step too: when the pupil
  // enters a new step, the fill animates smoothly to the new position
  // (CSS transition), so it feels like a single progressing line
  // rather than a jumpy counter.
  const fillRatio =
    stepCount <= 1 ? 0.5 : Math.min(1, (stepIndex + 0.5) / stepCount);
  return (
    <div
      style={{
        padding: "12px 24px 10px",
        borderBottom: "1px solid var(--line)",
        background: "var(--surface)",
        display: "grid",
        gap: 6,
      }}
      aria-label={`Lesson progress about ${Math.round(fillRatio * 100)} percent`}
    >
      <div className="flex items-center justify-between" style={{ gap: 12 }}>
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            fontWeight: 700,
          }}
        >
          Right now
        </span>
        <span
          style={{
            fontSize: 13,
            color: "var(--text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            textAlign: "left",
            marginLeft: 14,
          }}
        >
          {stepTitle}
        </span>
      </div>
      <div
        aria-hidden
        style={{
          width: "100%",
          height: 4,
          borderRadius: 999,
          background: "var(--line)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${fillRatio * 100}%`,
            height: "100%",
            background:
              "linear-gradient(90deg, var(--color-gold-500) 0%, var(--color-gold-300, var(--color-gold-500)) 100%)",
            transition: "width 1400ms var(--ease-emphasis)",
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}
