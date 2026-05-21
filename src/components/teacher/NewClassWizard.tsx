"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Sparkles, Check, X, AlertTriangle, RotateCcw, Library } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth-context";
import { getFirebase } from "@/lib/firebase/client";
import { SYLLABUS_LIBRARY } from "@/lib/syllabi";
import type { SyllabusEntry } from "@/lib/syllabi/types";
import { ACTIVITIES, ALL_ACTIVITY_TYPES } from "@/lib/ai/activities";
import type { ActivityType, LessonLibraryEntry, LessonPlan, School } from "@/types";

// Three-step new-class wizard:
//   1. Pick a syllabus topic (subject grid → entry list).
//   2. Describe what you want pupils to learn (free text + class
//      context). The AI takes the syllabus + this intent and drafts a
//      lesson plan.
//   3. Review the plan — edit any field — approve. On approval we
//      create the class with the plan attached, generate a join code,
//      and surface it for the teacher to share.

type Step = "pick" | "describe" | "review" | "done";

export function NewClassWizard({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("pick");
  const [syllabus, setSyllabus] = useState<SyllabusEntry | null>(null);
  const [className, setClassName] = useState("");
  const [school, setSchool] = useState<School>("KESW");
  const [yearGroup, setYearGroup] = useState<number>(8);
  const [intent, setIntent] = useState("");
  const [classNotes, setClassNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [libraryEntries, setLibraryEntries] = useState<LessonLibraryEntry[]>([]);

  // Pull library entries whenever the chosen syllabus changes so we can
  // offer "build from a previous plan" as an option.
  useEffect(() => {
    if (!syllabus) {
      setLibraryEntries([]);
      return;
    }
    let cancelled = false;
    async function load() {
      const fb = getFirebase();
      if (!fb.ready || !fb.auth.currentUser) return;
      try {
        const token = await fb.auth.currentUser.getIdToken();
        const r = await fetch(
          `/api/lessons/library?syllabusId=${encodeURIComponent(syllabus!.id)}&school=${encodeURIComponent(school)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const d = await r.json();
        if (!cancelled && r.ok) setLibraryEntries(d.entries ?? []);
      } catch {
        /* ignore */
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syllabus?.id, school]);

  useEffect(() => {
    if (syllabus) {
      setYearGroup(syllabus.yearGroup);
      if (!className) setClassName(`Year ${syllabus.yearGroup} · Set 1`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syllabus?.id]);

  async function generate() {
    if (!syllabus || !intent.trim() || !user) return;
    setGenerating(true);
    setError(null);
    try {
      const fb = getFirebase();
      if (!fb.ready) throw new Error("Firebase not configured");
      const token = await fb.auth.currentUser!.getIdToken();
      const res = await fetch("/api/lessons/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          syllabusId: syllabus.id,
          teacherIntent: intent.trim(),
          className,
          yearGroup,
          classNotes: classNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate plan");
      setPlan(data.plan as LessonPlan);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  async function approveAndCreate() {
    if (!syllabus || !plan || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      const fb = getFirebase();
      if (!fb.ready) throw new Error("Firebase not configured");
      const token = await fb.auth.currentUser!.getIdToken();
      const res = await fetch("/api/classes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: className,
          subject: syllabus.subject,
          school,
          lessonPlan: plan,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create class");
      setJoinCode(data.class.joinCode);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,26,46,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 60,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        className="bw-card"
        style={{
          width: "100%",
          maxWidth: 760,
          maxHeight: "90vh",
          padding: 0,
          background: "var(--surface-elev)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Header step={step} onClose={onClose} />

        <div style={{ overflowY: "auto", padding: 22 }}>
          {step === "pick" && (
            <PickStep
              syllabus={syllabus}
              onPick={(s) => {
                setSyllabus(s);
                setStep("describe");
              }}
            />
          )}

          {step === "describe" && syllabus && (
            <DescribeStep
              syllabus={syllabus}
              className={className}
              setClassName={setClassName}
              school={school}
              setSchool={setSchool}
              yearGroup={yearGroup}
              setYearGroup={setYearGroup}
              intent={intent}
              setIntent={setIntent}
              classNotes={classNotes}
              setClassNotes={setClassNotes}
              generating={generating}
              libraryEntries={libraryEntries}
              onLibraryPick={(entry) => {
                setPlan(entry.plan);
                setStep("review");
              }}
              onBack={() => setStep("pick")}
              onGenerate={generate}
            />
          )}

          {step === "review" && plan && syllabus && (
            <ReviewStep
              plan={plan}
              setPlan={setPlan}
              syllabus={syllabus}
              submitting={submitting}
              onBack={() => setStep("describe")}
              onRegenerate={() => {
                setPlan(null);
                setStep("describe");
              }}
              onApprove={approveAndCreate}
            />
          )}

          {step === "done" && joinCode && plan && (
            <DoneStep
              joinCode={joinCode}
              planTitle={plan.title}
              className={className}
              onOpenDashboard={() => {
                onClose();
                router.refresh();
              }}
            />
          )}

          {error && (
            <div role="alert" style={errBox}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Header({ step, onClose }: { step: Step; onClose: () => void }) {
  const titles: Record<Step, string> = {
    pick: "1 · Pick a topic",
    describe: "2 · Tell us what you want to teach",
    review: "3 · Review the plan",
    done: "Class ready",
  };
  return (
    <header
      style={{
        padding: "14px 20px",
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <span className="bw-section-label">New class</span>
        <div className="bw-display" style={{ fontSize: 17, marginTop: 2 }}>{titles[step]}</div>
      </div>
      <button onClick={onClose} className="bw-btn-secondary" aria-label="Close" style={{ padding: 6 }}>
        <X size={14} />
      </button>
    </header>
  );
}

function PickStep({ syllabus, onPick }: { syllabus: SyllabusEntry | null; onPick: (s: SyllabusEntry) => void }) {
  const entries = SYLLABUS_LIBRARY.entries;
  const grouped = useMemo(() => {
    const out: Record<string, SyllabusEntry[]> = {};
    for (const e of entries) {
      const k = e.subject;
      (out[k] ??= []).push(e);
    }
    return out;
  }, [entries]);
  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>
        Pick a topic from the UK National Curriculum library. Your school&apos;s scheme of work
        may vary; you can refine in the next step.
      </p>
      <div style={{ display: "grid", gap: 18 }}>
        {Object.entries(grouped).map(([subject, list]) => (
          <section key={subject}>
            <div className="bw-section-label" style={{ marginBottom: 8 }}>{subject}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {list.map((e) => (
                <button
                  key={e.id}
                  onClick={() => onPick(e)}
                  className="bw-card"
                  style={{
                    padding: 14,
                    textAlign: "left",
                    background: syllabus?.id === e.id ? "rgba(181,138,60,0.08)" : "var(--surface)",
                    border: `1px solid ${syllabus?.id === e.id ? "var(--color-gold-500)" : "var(--line)"}`,
                    cursor: "pointer",
                    transition: "all 120ms ease",
                    display: "grid",
                    gridTemplateColumns: "44px 1fr",
                    gap: 12,
                    alignItems: "start",
                  }}
                >
                  <Image
                    src={subjectMotif(e.subject)}
                    alt=""
                    width={44}
                    height={44}
                    aria-hidden
                    style={{ width: 44, height: 44, opacity: 0.95 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                      <BookOpen size={12} color="var(--color-gold-500)" />
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {e.keyStage} · Year {e.yearGroup} · {e.suggestedMinutes} min
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{e.topic}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45 }}>{e.blurb}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function DescribeStep({
  syllabus,
  className,
  setClassName,
  school,
  setSchool,
  yearGroup,
  setYearGroup,
  intent,
  setIntent,
  classNotes,
  setClassNotes,
  generating,
  libraryEntries,
  onLibraryPick,
  onBack,
  onGenerate,
}: {
  syllabus: SyllabusEntry;
  className: string;
  setClassName: (v: string) => void;
  school: School;
  setSchool: (v: School) => void;
  yearGroup: number;
  setYearGroup: (v: number) => void;
  intent: string;
  setIntent: (v: string) => void;
  classNotes: string;
  setClassNotes: (v: string) => void;
  generating: boolean;
  libraryEntries: LessonLibraryEntry[];
  onLibraryPick: (entry: LessonLibraryEntry) => void;
  onBack: () => void;
  onGenerate: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="bw-card" style={{ padding: 12, background: "rgba(181,138,60,0.06)" }}>
        <div className="bw-section-label" style={{ marginBottom: 4 }}>Topic</div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{syllabus.topic}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          {syllabus.subject} · {syllabus.keyStage} · Year {syllabus.yearGroup} · {syllabus.suggestedMinutes} min suggested
        </div>
      </div>

      {libraryEntries.length > 0 && (
        <div
          className="bw-card"
          style={{
            padding: 14,
            background: "var(--surface)",
            borderLeft: "3px solid var(--color-gold-500)",
          }}
        >
          <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
            <Library size={13} color="var(--color-gold-500)" />
            <span className="bw-section-label">From your school&apos;s library</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              · plans your colleagues saved
            </span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {libraryEntries.slice(0, 3).map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between"
                style={{
                  padding: "10px 12px",
                  background: "var(--surface-elev)",
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.plan.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    <span style={{ color: "var(--color-gold-500)", fontFamily: "var(--font-mono)" }}>
                      {"★".repeat(e.appraisal.rating)}
                      <span style={{ color: "var(--text-muted)" }}>{"★".repeat(5 - e.appraisal.rating)}</span>
                    </span>
                    {" "}· {e.plan.sequence.length} steps · {e.plan.estimatedMinutes}m · saved by {e.savedByTeacherName}
                  </div>
                </div>
                <button
                  onClick={() => onLibraryPick(e)}
                  className="bw-btn-secondary"
                  style={{ fontSize: 12, whiteSpace: "nowrap" }}
                >
                  Use this plan
                </button>
              </li>
            ))}
          </ul>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>
            Picking a library plan skips generation — you go straight to review where you can edit before approving.
          </p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 1fr", gap: 12 }}>
        <Field label="Class name" value={className} onChange={setClassName} placeholder="Year 8 · Set 2" />
        <label style={{ display: "grid", gap: 4 }}>
          <span className="bw-section-label">Year group</span>
          <input
            type="number"
            value={yearGroup}
            onChange={(e) => setYearGroup(Math.max(7, Math.min(11, Number(e.target.value) || 8)))}
            min={7}
            max={11}
            style={inputStyle}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span className="bw-section-label">School</span>
          <select value={school} onChange={(e) => setSchool(e.target.value as School)} style={{ ...inputStyle, appearance: "auto" }}>
            <option value="KESW">King Edward&apos;s Witley</option>
            <option value="Barrow Hills">Barrow Hills</option>
            <option value="Longacre">Longacre</option>
          </select>
        </label>
      </div>

      <label style={{ display: "grid", gap: 4 }}>
        <span className="bw-section-label">What do you want pupils to learn this lesson?</span>
        <textarea
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          rows={4}
          placeholder={examplePlaceholder(syllabus)}
          style={{ ...inputStyle, resize: "vertical", fontSize: 14 }}
          required
        />
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Tip — the more specific you are about emphasis and pacing, the better the plan.
        </span>
      </label>

      <label style={{ display: "grid", gap: 4 }}>
        <span className="bw-section-label">Anything specific about the class? (optional)</span>
        <input
          value={classNotes}
          onChange={(e) => setClassNotes(e.target.value)}
          placeholder="e.g. mixed prior knowledge; two pupils on a coloured-overlays plan"
          style={inputStyle}
        />
      </label>

      <div className="flex items-center justify-between" style={{ marginTop: 4 }}>
        <button onClick={onBack} className="bw-btn-secondary" style={{ fontSize: 13 }}>
          <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back
        </button>
        <button
          onClick={onGenerate}
          disabled={!intent.trim() || generating}
          className="bw-btn-emphasis"
          style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          {generating ? (
            <>
              <Sparkles size={14} /> Drafting the plan…
            </>
          ) : (
            <>
              <Sparkles size={14} /> Generate lesson plan
            </>
          )}
        </button>
      </div>
      {generating && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>
          The lesson planner is thinking through pacing, critical concepts and likely misconceptions — about fifteen seconds.
        </div>
      )}
    </div>
  );
}

function subjectMotif(subject: SyllabusEntry["subject"]): string {
  switch (subject) {
    case "Biology":
    case "Chemistry":
    case "Physics":
      return "/img/motif-biology.png";
    case "English":
      return "/img/motif-english.png";
    case "Mathematics":
      return "/img/motif-mathematics.png";
    case "History":
    case "Geography":
      return "/img/motif-history.png";
    default:
      return "/img/motif-open-book.png";
  }
}

function examplePlaceholder(s: SyllabusEntry) {
  const examples: Partial<Record<SyllabusEntry["subject"], string>> = {
    Biology:
      "I want them to grasp that the light energy is captured by chlorophyll and used to make glucose. Spend most of the time on why leaves look green and how the limiting factors change the rate. They've met respiration but not the word equation for photosynthesis yet.",
    English:
      "Focus on rhetorical questions and tricolons. They should come away able to explain WHY a tricolon lands harder than a pair. Less time on identifying devices in models, more on writing their own.",
    Mathematics:
      "Make sure they get the 'do the same to both sides' principle. We've already done one-step equations; I want them solid on two-step and unknown-on-both-sides.",
    History:
      "Causes of industrialisation in Britain. I want them to be able to argue, with evidence, why Britain was first — not just list factors. Keep daily-life detail short.",
  };
  return examples[s.subject] ?? "What do you want pupils to come away knowing or being able to do?";
}

function ReviewStep({
  plan,
  setPlan,
  syllabus,
  submitting,
  onBack,
  onRegenerate,
  onApprove,
}: {
  plan: LessonPlan;
  setPlan: (p: LessonPlan) => void;
  syllabus: SyllabusEntry;
  submitting: boolean;
  onBack: () => void;
  onRegenerate: () => void;
  onApprove: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
        Here is the lesson plan the AI drafted from your brief. Review each section.
        Edit anything you don&apos;t like. The plan becomes the tutor&apos;s anchor for
        the whole class.
      </div>

      <Section label="Lesson title">
        <input
          value={plan.title}
          onChange={(e) => setPlan({ ...plan, title: e.target.value })}
          style={inputStyle}
        />
      </Section>

      <Section label="Learning objectives">
        <ListEditor
          items={plan.learningObjectives}
          onChange={(items) => setPlan({ ...plan, learningObjectives: items })}
          placeholder="Add an objective"
        />
      </Section>

      <Section label="Critical concepts · Reason fires on these">
        <ListEditor
          items={plan.criticalConcepts}
          onChange={(items) => setPlan({ ...plan, criticalConcepts: items })}
          placeholder="Add a critical concept"
        />
      </Section>

      <Section label="Sequence" muted="The tutor walks through these steps in order">
        <div style={{ display: "grid", gap: 12 }}>
          {plan.sequence.map((s, i) => (
            <div key={i} className="bw-card" style={{ padding: 12, background: "var(--surface)" }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8, gap: 8 }}>
                <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                  <span className="bw-section-label">Step {i + 1}</span>
                  <ActivityBadge
                    value={s.activityType}
                    onChange={(at) => {
                      const next = [...plan.sequence];
                      next[i] = { ...s, activityType: at };
                      setPlan({ ...plan, sequence: next });
                    }}
                  />
                  {s.estimatedMinutes && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      ~{s.estimatedMinutes} min
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    const next = plan.sequence.filter((_, j) => j !== i);
                    setPlan({ ...plan, sequence: next });
                  }}
                  className="bw-btn-secondary"
                  style={{ padding: 4, fontSize: 11 }}
                  aria-label={`Remove step ${i + 1}`}
                >
                  <X size={11} />
                </button>
              </div>
              <input
                value={s.title}
                onChange={(e) => {
                  const next = [...plan.sequence];
                  next[i] = { ...s, title: e.target.value };
                  setPlan({ ...plan, sequence: next });
                }}
                style={{ ...inputStyle, marginBottom: 8, fontWeight: 600 }}
              />
              <label style={{ display: "grid", gap: 4 }}>
                <span style={tinyLabel}>Goal</span>
                <textarea
                  value={s.goal}
                  onChange={(e) => {
                    const next = [...plan.sequence];
                    next[i] = { ...s, goal: e.target.value };
                    setPlan({ ...plan, sequence: next });
                  }}
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical", fontSize: 13 }}
                />
              </label>
              <label style={{ display: "grid", gap: 4, marginTop: 8 }}>
                <span style={tinyLabel}>Opening prompt the tutor will use</span>
                <textarea
                  value={s.openingPrompt}
                  onChange={(e) => {
                    const next = [...plan.sequence];
                    next[i] = { ...s, openingPrompt: e.target.value };
                    setPlan({ ...plan, sequence: next });
                  }}
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical", fontSize: 13 }}
                />
              </label>
              <div
                style={{
                  marginTop: 8,
                  padding: "8px 10px",
                  background: "rgba(15,26,46,0.025)",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: "var(--text)" }}>
                  How the tutor runs this step:
                </strong>{" "}
                {ACTIVITIES[s.activityType]?.description ?? "Default Socratic dialogue."}
              </div>
              {s.expectedMisconceptions && s.expectedMisconceptions.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <span style={tinyLabel}>Misconceptions to watch for</span>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18, color: "var(--text-muted)", fontSize: 12 }}>
                    {s.expectedMisconceptions.map((m, j) => (
                      <li key={j}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section label="Tutor instructions · spliced into the coach-mode system prompt">
        <textarea
          value={plan.tutorAddendum}
          onChange={(e) => setPlan({ ...plan, tutorAddendum: e.target.value })}
          rows={4}
          style={{ ...inputStyle, resize: "vertical", fontSize: 13, fontFamily: "var(--font-mono)" }}
        />
      </Section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Stat label="Estimated time">{plan.estimatedMinutes} min</Stat>
        <Stat label="Scaffold ceiling">{plan.scaffoldCeiling}</Stat>
        <Stat label="Critical concepts">{plan.criticalConcepts.length}</Stat>
      </div>

      {plan.notesForTeacher && plan.notesForTeacher.length > 0 && (
        <div className="bw-card" style={{ padding: 12, background: "rgba(181,138,60,0.08)", borderLeft: "3px solid var(--color-gold-500)" }}>
          <div className="bw-section-label" style={{ marginBottom: 6, color: "var(--color-gold-500)" }}>
            Open questions the AI flagged
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {plan.notesForTeacher.map((n, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
        Source: {syllabus.source.name}.
      </div>

      <div className="flex items-center justify-between" style={{ marginTop: 4 }}>
        <button onClick={onBack} className="bw-btn-secondary" style={{ fontSize: 13 }}>
          <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onRegenerate} className="bw-btn-secondary" style={{ fontSize: 13 }}>
            <RotateCcw size={13} style={{ marginRight: 6 }} /> Regenerate
          </button>
          <button
            onClick={onApprove}
            disabled={submitting}
            className="bw-btn-primary"
            style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {submitting ? "Creating class…" : <><Check size={14} /> Approve and create class</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function DoneStep({
  joinCode,
  planTitle,
  className,
  onOpenDashboard,
}: {
  joinCode: string;
  planTitle: string;
  className: string;
  onOpenDashboard: () => void;
}) {
  return (
    <div style={{ textAlign: "center", padding: "18px 8px 6px" }}>
      <div style={{ marginBottom: 18 }}>
        <span className="bw-section-label">Class created</span>
        <div className="bw-display" style={{ fontSize: 22, marginTop: 6 }}>{className}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{planTitle}</div>
      </div>
      <div className="bw-card" style={{ padding: 18, background: "rgba(181,138,60,0.08)", marginBottom: 18, borderLeft: "3px solid var(--color-gold-500)" }}>
        <div className="bw-section-label" style={{ marginBottom: 6 }}>Pupil join code</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 32, letterSpacing: "0.12em", fontWeight: 600 }}>{joinCode}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
          Pupils type this at /join. Project it on the board for the class.
        </div>
      </div>
      <button onClick={onOpenDashboard} className="bw-btn-primary" style={{ fontSize: 13 }}>
        Open dashboard <ArrowRight size={13} style={{ marginLeft: 6 }} />
      </button>
    </div>
  );
}

function Section({
  label,
  muted,
  children,
}: {
  label: string;
  muted?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <span className="bw-section-label">{label}</span>
        {muted && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{muted}</span>}
      </div>
      {children}
    </div>
  );
}

function ListEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={it}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            style={{ ...inputStyle, flex: 1, fontSize: 13 }}
          />
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="bw-btn-secondary"
            style={{ padding: 6 }}
            aria-label="Remove"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (draft.trim()) {
                onChange([...items, draft.trim()]);
                setDraft("");
              }
            }
          }}
          placeholder={placeholder}
          style={{ ...inputStyle, flex: 1, fontSize: 13 }}
        />
        <button
          onClick={() => {
            if (draft.trim()) {
              onChange([...items, draft.trim()]);
              setDraft("");
            }
          }}
          className="bw-btn-secondary"
          style={{ fontSize: 12, padding: "7px 10px" }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function ActivityBadge({
  value,
  onChange,
}: {
  value: ActivityType;
  onChange: (v: ActivityType) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ActivityType)}
      style={{
        background: "rgba(181,138,60,0.10)",
        color: "var(--color-gold-500)",
        border: "1px solid rgba(181,138,60,0.35)",
        borderRadius: 999,
        padding: "3px 8px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        cursor: "pointer",
        appearance: "none",
        fontFamily: "var(--font-sans)",
      }}
      title="Activity type — change how the tutor runs this step"
    >
      {ALL_ACTIVITY_TYPES.map((k) => (
        <option key={k} value={k}>
          {ACTIVITIES[k].label}
        </option>
      ))}
    </select>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span className="bw-section-label">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </label>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)" }}>
      <div style={tinyLabel}>{label}</div>
      <div className="bw-display" style={{ fontSize: 18, marginTop: 4 }}>{children}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 6,
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 14,
  fontFamily: "var(--font-sans)",
  width: "100%",
};

const tinyLabel: React.CSSProperties = {
  fontSize: 10,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
};

const errBox: React.CSSProperties = {
  background: "rgba(142,42,42,0.08)",
  color: "var(--color-crimson)",
  padding: "10px 12px",
  borderRadius: 6,
  fontSize: 12,
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 16,
};
