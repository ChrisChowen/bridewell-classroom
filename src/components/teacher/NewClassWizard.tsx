"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles, Check, X, AlertTriangle, RotateCcw, Library, Pencil, Search } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth-context";
import { getFirebase } from "@/lib/firebase/client";
import { getCleanIdToken } from "@/lib/firebase/auth-fetch";
import { useModalDialog } from "@/lib/useModalDialog";
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
  // Focus trap + Escape-to-close + focus restore for the dialog.
  const dialogRef = useModalDialog<HTMLDivElement>(onClose);

  const [step, setStep] = useState<Step>("pick");
  const [syllabus, setSyllabus] = useState<SyllabusEntry | null>(null);
  const [className, setClassName] = useState("");
  const [school, setSchool] = useState<School>("KESW");
  const [yearGroup, setYearGroup] = useState<number>(8);
  const [intent, setIntent] = useState("");
  const [classNotes, setClassNotes] = useState("");
  const [challengeLevel, setChallengeLevel] = useState<"foundation" | "core" | "stretch">("core");
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [libraryEntries, setLibraryEntries] = useState<LessonLibraryEntry[]>([]);
  const [libraryFailed, setLibraryFailed] = useState(false);

  // Pull library entries whenever the chosen syllabus changes so we can
  // offer "build from a previous plan" as an option.
  useEffect(() => {
    if (!syllabus) {
      setLibraryEntries([]);
      return;
    }
    let cancelled = false;
    async function load() {
      const token = await getCleanIdToken();
      if (!token) return;
      try {
        const r = await fetch(
          `/api/lessons/library?syllabusId=${encodeURIComponent(syllabus!.id)}&school=${encodeURIComponent(school)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (r.ok) {
          setLibraryEntries(d.entries ?? []);
          setLibraryFailed(false);
        } else {
          setLibraryEntries([]);
          setLibraryFailed(true); // distinguish "load failed" from "genuinely none"
        }
      } catch {
        if (!cancelled) {
          setLibraryEntries([]);
          setLibraryFailed(true);
        }
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
      // getCleanIdToken handles an expired/absent session (returns null) — a
      // non-null assert here threw an opaque TypeError if the teacher had gone
      // idle. Mirror the approveAndCreate path.
      const token = await getCleanIdToken();
      if (!token) throw new Error("Your session has expired — please sign in again.");
      const res = await fetch("/api/lessons/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          syllabusId: syllabus.id,
          teacherIntent: intent.trim(),
          className,
          yearGroup,
          classNotes: classNotes.trim() || undefined,
          challengeLevel,
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

  // "Start from scratch" — seeds a minimal LessonPlan against the chosen
  // syllabus and drops the teacher into the review/edit step where they
  // can shape every field by hand. The third entry point of the wizard
  // alongside "Generate" and "From the library".
  function startBlank() {
    if (!syllabus) return;
    const blank: LessonPlan = {
      id: `lp_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`,
      title: `${syllabus.topic}`,
      subject: syllabus.subject,
      yearGroup,
      teacherIntent: intent.trim() || `Teach ${syllabus.topic} to Year ${yearGroup}.`,
      syllabusId: syllabus.id,
      learningObjectives: syllabus.learningOutcomes.slice(0, 3),
      criticalConcepts: syllabus.criticalConcepts.slice(0, 3),
      keyVocabulary: syllabus.keyVocabulary,
      sequence: [
        {
          title: "Open the topic",
          goal: `Surface what pupils already know about ${syllabus.topic}.`,
          activityType: "socratic",
          criticalConcepts: syllabus.criticalConcepts.slice(0, 1),
          openingPrompt: `What do you already know about ${syllabus.topic}?`,
          estimatedMinutes: 8,
        },
      ],
      tutorAddendum: `Anchor the conversation to ${syllabus.topic} for Year ${syllabus.yearGroup}. Coach mode by default.`,
      scaffoldCeiling: 3,
      defaultMode: "coach",
      estimatedMinutes: syllabus.suggestedMinutes,
      generatedAt: Date.now(),
      challengeLevel,
      extension: {
        title: `Beyond ${syllabus.topic}`,
        brief: `Push your understanding of ${syllabus.topic} one step beyond the lesson — apply it to a real situation you haven't been taught yet.`,
        stretchHint: `Above-syllabus reach into the next layer of ${syllabus.subject}.`,
        criticalConcepts: syllabus.criticalConcepts.slice(0, 2),
      },
      notesForTeacher: [
        "This plan started as a blank — every field is editable. Add 1–4 more steps to shape the lesson.",
      ],
    };
    setPlan(blank);
    setStep("review");
  }

  async function approveAndCreate() {
    if (!syllabus || !plan || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      const fb = getFirebase();
      if (!fb.ready) throw new Error("Firebase not configured");
      const token = await getCleanIdToken();
      if (!token) throw new Error("Could not get a sign-in token — please sign out and back in.");
      // Trim user-typed fields. iOS Safari occasionally pastes
      // trailing nbsp / whitespace from autofill that fails downstream
      // validation; normalising here gives a clearer error than the
      // mobile-Safari fallback ("the string did not match the expected
      // pattern").
      const safeName = (className || "").trim();
      const safeSchool = (school || "").trim();
      if (!safeName) throw new Error("Class name is required");
      if (!safeSchool) throw new Error("School is required");
      const res = await fetch("/api/classes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: safeName,
          subject: syllabus.subject,
          school: safeSchool,
          lessonPlan: plan,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Create failed (HTTP ${res.status})`);
      if (!data.class?.joinCode) throw new Error("Class created but join code missing — refresh and check the dashboard.");
      setJoinCode(data.class.joinCode);
      setStep("done");
    } catch (e) {
      // Bubble the underlying error up to the UI; previously the
      // generic "Something went wrong" hid the root cause from a
      // teacher in front of pupils.
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "string"
          ? e
          : "Something went wrong creating the class. Try again.";
      console.error("[wizard] approveAndCreate failed", e);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      className="bw-modal-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
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
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Create a new class"
        className="bw-card bw-modal-frame"
        // Opacity-only entrance: a scale/transform here would create a
        // containing block and break the sticky search bar inside PickStep.
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.24, ease: [0, 0, 0.2, 1] }}
        style={{
          width: "100%",
          maxWidth: 760,
          maxHeight: "90vh",
          padding: 0,
          background: "var(--surface-elev)",
          boxShadow: "var(--shadow-xl)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Header step={step} onClose={onClose} />

        <div style={{ overflowY: "auto", padding: 22 }}>
          <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
          >
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
              challengeLevel={challengeLevel}
              setChallengeLevel={setChallengeLevel}
              generating={generating}
              libraryEntries={libraryEntries}
              libraryFailed={libraryFailed}
              onLibraryPick={(entry) => {
                setPlan(entry.plan);
                setStep("review");
              }}
              onBack={() => setStep("pick")}
              onGenerate={generate}
              onStartBlank={startBlank}
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
          </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div
                role="alert"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
                style={errBox}
              >
                <AlertTriangle size={14} /> {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
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

// Subject + year-group filter chips. The library has ~80 topics across
// 7 subjects and 5 year groups; without filters the teacher has to
// scroll past everything to find their lesson. Defaults to "All" on both
// axes so a teacher who knows what they want can still browse.
type SubjectFilter = SyllabusEntry["subject"] | "All";
type YearFilter = SyllabusEntry["yearGroup"] | "All";

const ALL_SUBJECTS: SubjectFilter[] = [
  "All",
  "Biology",
  "Chemistry",
  "Physics",
  "Mathematics",
  "English",
  "History",
  "Geography",
];
const ALL_YEARS: YearFilter[] = ["All", 7, 8, 9, 10, 11];

function PickStep({ syllabus, onPick }: { syllabus: SyllabusEntry | null; onPick: (s: SyllabusEntry) => void }) {
  const entries = SYLLABUS_LIBRARY.entries;
  const [subject, setSubject] = useState<SubjectFilter>("All");
  const [year, setYear] = useState<YearFilter>("All");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const matchesQuery = (e: SyllabusEntry) => {
    if (!q) return true;
    const hay = [
      e.topic,
      e.blurb,
      e.subject,
      e.keyStage,
      `year ${e.yearGroup}`,
      ...e.keyVocabulary,
      ...e.criticalConcepts,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  };

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (subject !== "All" && e.subject !== subject) return false;
      if (year !== "All" && e.yearGroup !== year) return false;
      return matchesQuery(e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, subject, year, q]);

  // Per-chip counts so each filter chip tells the teacher how many
  // topics live behind it. Each axis ignores its own filter when
  // counting (so "Year 8" shows the total Y8 topics under the current
  // subject + query), which matches modern faceted-search conventions.
  const subjectCounts = useMemo(() => {
    const out = new Map<SubjectFilter, number>();
    out.set("All", 0);
    for (const e of entries) {
      if (year !== "All" && e.yearGroup !== year) continue;
      if (!matchesQuery(e)) continue;
      out.set("All", (out.get("All") ?? 0) + 1);
      out.set(e.subject, (out.get(e.subject) ?? 0) + 1);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, year, q]);

  const yearCounts = useMemo(() => {
    const out = new Map<YearFilter, number>();
    out.set("All", 0);
    for (const e of entries) {
      if (subject !== "All" && e.subject !== subject) continue;
      if (!matchesQuery(e)) continue;
      out.set("All", (out.get("All") ?? 0) + 1);
      out.set(e.yearGroup, (out.get(e.yearGroup) ?? 0) + 1);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, subject, q]);

  // Group by subject only when no subject filter is active — otherwise a
  // flat list reads better and matches what the teacher just asked for.
  const showGrouped = subject === "All";
  const grouped = useMemo(() => {
    const out: Record<string, SyllabusEntry[]> = {};
    for (const e of filtered) (out[e.subject] ??= []).push(e);
    return out;
  }, [filtered]);
  const subjectOrder = ALL_SUBJECTS.filter((s): s is SyllabusEntry["subject"] => s !== "All");
  const hasFilters = subject !== "All" || year !== "All" || query.trim().length > 0;

  return (
    <div>
      {/* Search + filters — single composed panel so the controls read
          as a unit, not a stack of inputs. Sticky so the teacher can
          scan the long list below without losing the controls. */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          background: "var(--surface)",
          paddingBottom: 14,
          marginBottom: 18,
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            background: "var(--bg)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: 14,
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              color="var(--text-muted)"
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search topics, vocabulary, concepts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search curriculum library"
              style={{
                width: "100%",
                padding: "12px 14px 12px 40px",
                borderRadius: 10,
                border: "1px solid var(--line)",
                background: "var(--surface)",
                color: "var(--text)",
                fontSize: 14,
                fontFamily: "var(--font-sans)",
              }}
            />
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <FilterAxis label="Year group">
              {ALL_YEARS.map((y) => (
                <FilterChip
                  key={String(y)}
                  active={year === y}
                  onClick={() => setYear(y)}
                  label={y === "All" ? "All" : `Year ${y}`}
                  count={yearCounts.get(y) ?? 0}
                />
              ))}
            </FilterAxis>

            <FilterAxis label="Subject">
              {ALL_SUBJECTS.map((s) => (
                <FilterChip
                  key={s}
                  active={subject === s}
                  onClick={() => setSubject(s)}
                  label={s}
                  count={subjectCounts.get(s) ?? 0}
                />
              ))}
            </FilterAxis>
          </div>

          <div
            className="flex items-center justify-between"
            style={{ fontSize: 12, color: "var(--text-muted)" }}
          >
            <span>
              <strong style={{ color: "var(--text)", fontWeight: 600 }}>{filtered.length}</strong>
              {filtered.length === entries.length ? (
                <> topics in the library</>
              ) : (
                <> of {entries.length} topics shown</>
              )}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSubject("All");
                  setYear("All");
                  setQuery("");
                }}
                className="flex items-center"
                style={{
                  gap: 4,
                  background: "none",
                  border: "none",
                  color: "var(--color-gold-text)",
                  fontSize: 12,
                  padding: 0,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                <X size={12} /> Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            padding: 24,
            border: "1px dashed var(--line)",
            borderRadius: 8,
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 13,
          }}
        >
          No topics match those filters. Try widening the year group or clearing the search.
        </div>
      ) : showGrouped ? (
        <div style={{ display: "grid", gap: 18 }}>
          {subjectOrder
            .filter((s) => grouped[s]?.length)
            .map((s) => (
              <section key={s}>
                <div className="bw-section-label" style={{ marginBottom: 8 }}>
                  {s}
                  <span style={{ marginLeft: 8, color: "var(--text-muted)", fontWeight: 400 }}>
                    {grouped[s].length}
                  </span>
                </div>
                <SyllabusCardGrid entries={grouped[s]} syllabus={syllabus} onPick={onPick} />
              </section>
            ))}
        </div>
      ) : (
        <SyllabusCardGrid entries={filtered} syllabus={syllabus} onPick={onPick} />
      )}
    </div>
  );
}

function SyllabusCardGrid({
  entries,
  syllabus,
  onPick,
}: {
  entries: SyllabusEntry[];
  syllabus: SyllabusEntry | null;
  onPick: (s: SyllabusEntry) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 12,
      }}
    >
      {entries.map((e) => {
        const selected = syllabus?.id === e.id;
        return (
          <button
            key={e.id}
            onClick={() => onPick(e)}
            aria-pressed={selected}
            className="bw-syllabus-card"
            style={{
              padding: 16,
              textAlign: "left",
              background: selected ? "var(--color-gold-tint-2)" : "var(--surface)",
              border: `1px solid ${selected ? "var(--color-gold-500)" : "var(--line)"}`,
              boxShadow: selected ? "0 1px 0 var(--color-gold-500) inset" : "none",
              cursor: "pointer",
              transition: "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease, background 140ms ease",
              display: "grid",
              gridTemplateColumns: "48px 1fr",
              gap: 14,
              alignItems: "start",
              borderRadius: 10,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: "rgba(181,138,60,0.08)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Image
                src={subjectMotif(e.subject)}
                alt=""
                width={36}
                height={36}
                style={{ width: 36, height: 36, opacity: 0.95 }}
              />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--color-gold-text)",
                    fontWeight: 700,
                  }}
                >
                  {e.subject}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  · Y{e.yearGroup} · {e.suggestedMinutes}min
                </span>
              </div>
              <div
                style={{
                  fontSize: 14.5,
                  fontWeight: 600,
                  marginBottom: 4,
                  lineHeight: 1.3,
                }}
              >
                {e.topic}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {e.blurb}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function FilterAxis({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <span
        style={{
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <div className="flex items-center" style={{ gap: 6, flexWrap: "wrap" }}>
        {children}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  const isEmpty = count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={isEmpty && !active}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        border: `1px solid ${active ? "var(--color-gold-500)" : "var(--line)"}`,
        background: active ? "var(--color-gold-tint-3)" : "var(--surface)",
        color: active ? "var(--text)" : isEmpty ? "var(--text-muted)" : "var(--text)",
        fontSize: 12.5,
        fontWeight: active ? 600 : 500,
        cursor: isEmpty && !active ? "not-allowed" : "pointer",
        opacity: isEmpty && !active ? 0.45 : 1,
        transition: "all 120ms ease",
        fontFamily: "var(--font-sans)",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        lineHeight: 1.2,
      }}
    >
      <span>{label}</span>
      {typeof count === "number" && (
        <span
          style={{
            fontSize: 10.5,
            color: active ? "var(--color-gold-500)" : "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            fontWeight: 500,
            opacity: 0.85,
          }}
        >
          {count}
        </span>
      )}
    </button>
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
  challengeLevel,
  setChallengeLevel,
  generating,
  libraryEntries,
  libraryFailed,
  onLibraryPick,
  onBack,
  onGenerate,
  onStartBlank,
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
  challengeLevel: "foundation" | "core" | "stretch";
  setChallengeLevel: (v: "foundation" | "core" | "stretch") => void;
  generating: boolean;
  libraryEntries: LessonLibraryEntry[];
  libraryFailed: boolean;
  onLibraryPick: (entry: LessonLibraryEntry) => void;
  onBack: () => void;
  onGenerate: () => void;
  onStartBlank: () => void;
}) {
  // Fetch teacher-voice intent suggestions for this topic + year on
  // mount / when topic changes. The route caches per
  // (syllabusId, yearGroup) in Firestore, so subsequent visits to the
  // same topic are near-instant and don't spend tokens.
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  useEffect(() => {
    if (!syllabus) return;
    let cancelled = false;
    setSuggestLoading(true);
    setSuggestions([]);
    (async () => {
      try {
        const token = await getCleanIdToken();
        if (!token) return;
        const res = await fetch("/api/lessons/intent-suggestions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ syllabusId: syllabus.id, yearGroup }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.suggestions)) setSuggestions(data.suggestions);
      } catch {
        /* fall through silently — the textarea still works on its own */
      } finally {
        if (!cancelled) setSuggestLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // yearGroup is intentionally omitted: changing year shouldn't refire
    // mid-edit; the teacher can refresh by re-picking the topic. Keying
    // off syllabus.id is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syllabus?.id]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="bw-card" style={{ padding: 12, background: "var(--color-gold-tint-1)" }}>
        <div className="bw-section-label" style={{ marginBottom: 4 }}>Topic</div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{syllabus.topic}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          {syllabus.subject} · {syllabus.keyStage} · Year {syllabus.yearGroup} · {syllabus.suggestedMinutes} min suggested
        </div>
      </div>

      {libraryFailed && libraryEntries.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Couldn&apos;t load your school&apos;s saved plans just now — you can still generate or
          start from scratch below.
        </div>
      )}

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
                    <span style={{ color: "var(--color-gold-text)", fontFamily: "var(--font-mono)" }}>
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

      <div
        className="bw-stack-sm"
        style={{ display: "grid", gridTemplateColumns: "1fr 160px 1fr", gap: 12 }}
      >
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

      <label style={{ display: "grid", gap: 6 }}>
        <span className="bw-section-label">What do you want pupils to learn this lesson?</span>

        {/* AI-generated starting points for this topic + year. Cached in
            Firestore so we pay the generation cost once per topic. */}
        {(suggestLoading || suggestions.length > 0) && (
          <div style={{ display: "grid", gap: 6, marginBottom: 2 }}>
            <span
              className="flex items-center gap-2"
              style={{
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--color-gold-text)",
              }}
            >
              <Sparkles size={11} />
              {suggestLoading ? "Drafting starting points…" : "Starting points · click one to use"}
            </span>
            {suggestLoading ? (
              <div style={{ display: "grid", gap: 6 }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    aria-hidden
                    style={{
                      height: 32,
                      borderRadius: 8,
                      background: "linear-gradient(90deg, var(--line) 0%, rgba(181,138,60,0.12) 50%, var(--line) 100%)",
                      backgroundSize: "200% 100%",
                      animation: "bw-shimmer 1400ms linear infinite",
                      opacity: 0.7,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIntent(s)}
                    className="bw-suggestion-chip"
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--line)",
                      background: intent === s ? "var(--color-gold-tint-2)" : "var(--surface)",
                      color: "var(--text)",
                      fontSize: 13,
                      lineHeight: 1.5,
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                      transition: "background 120ms ease, border-color 120ms ease",
                    }}
                    title="Use this as your starting point — you can edit it after."
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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

      <ChallengeSelect value={challengeLevel} onChange={setChallengeLevel} />

      <div
        className="flex items-center justify-between"
        style={{ marginTop: 4, gap: 8, flexWrap: "wrap" }}
      >
        <button onClick={onBack} className="bw-btn-secondary" style={{ fontSize: 13 }}>
          <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back
        </button>
        <div className="flex items-center" style={{ gap: 8 }}>
          <button
            onClick={onStartBlank}
            disabled={generating}
            className="bw-btn-secondary"
            style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
            title="Skip the AI draft — open a blank plan you can shape from scratch in the next step."
          >
            <Pencil size={14} /> Start from scratch
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
      </div>
      {generating && (
        <div style={{ marginTop: 4 }}>
          <GenerationProgress />
          {/* Skeleton of the plan sections about to appear, so the ~15s wait
              (the live demo's riskiest dead air) feels alive rather than frozen.
              Reuses the same bw-shimmer treatment as the suggestions step. */}
          <div style={{ display: "grid", gap: 12 }} aria-hidden>
            {[
              { label: "Objectives", lines: 3 },
              { label: "Critical concepts", lines: 2 },
              { label: "Lesson sequence", lines: 4 },
              { label: "Tutor guidance", lines: 2 },
            ].map((section) => (
              <div key={section.label} style={{ display: "grid", gap: 6 }}>
                <div className="bw-section-label" style={{ opacity: 0.6 }}>{section.label}</div>
                {Array.from({ length: section.lines }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: 12,
                      width: i === section.lines - 1 ? "62%" : "100%",
                      borderRadius: 6,
                      background:
                        "linear-gradient(90deg, var(--line) 0%, rgba(181,138,60,0.12) 50%, var(--line) 100%)",
                      backgroundSize: "200% 100%",
                      animation: "bw-shimmer 1400ms linear infinite",
                      opacity: 0.7,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Progress feedback during the ~15s lesson-plan generation, so the teacher
// sees it working rather than a frozen button. The elapsed counter is real;
// the bar is an honest estimate (it eases toward ~92% over the expected
// duration and then crawls — it never reaches 100%, because the real
// completion is the review step replacing this whole block). The stage labels
// reflect what the planner genuinely produces (objectives → sequence →
// misconceptions → tutor guidance).
function GenerationProgress() {
  const STAGES = [
    "Reading the syllabus and your brief…",
    "Drafting the lesson sequence…",
    "Anticipating likely misconceptions…",
    "Writing the tutor's guidance…",
    "Finalising the plan…",
  ];
  const EXPECTED_MS = 15000;
  const [start] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsedMs(Date.now() - start), 200);
    return () => clearInterval(id);
  }, [start]);

  const pct =
    elapsedMs <= EXPECTED_MS
      ? Math.min(92, 4 + (elapsedMs / EXPECTED_MS) * 88)
      : Math.min(97, 92 + (elapsedMs - EXPECTED_MS) / 4000);
  const stage = STAGES[Math.min(STAGES.length - 1, Math.floor(elapsedMs / 3000))];

  return (
    <div style={{ marginBottom: 12 }} role="status" aria-live="polite">
      <div className="flex items-center justify-between" style={{ marginBottom: 6, gap: 12 }}>
        <span style={{ fontSize: 12, color: "var(--text)" }}>{stage}</span>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {Math.floor(elapsedMs / 1000)}s
        </span>
      </div>
      <div
        aria-hidden
        style={{ height: 4, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background:
              "linear-gradient(90deg, var(--color-gold-500) 0%, var(--color-gold-300, var(--color-gold-500)) 100%)",
            borderRadius: 999,
            transition: "width 300ms ease",
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
        Drafting your plan — usually about fifteen seconds. Every field is editable before
        anything reaches a pupil.
      </div>
    </div>
  );
}

function subjectMotif(subject: SyllabusEntry["subject"]): string {
  switch (subject) {
    case "Biology":
    case "Chemistry":
    case "Physics":
      return "/img/motif-biology.webp";
    case "English":
      return "/img/motif-english.webp";
    case "Mathematics":
      return "/img/motif-mathematics.webp";
    case "History":
    case "Geography":
      return "/img/motif-history.webp";
    default:
      return "/img/motif-open-book.webp";
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

      <Section
        label="Extension · for pupils who finish early or are plainly ahead"
        muted="The tutor switches into this above-syllabus brief when a pupil completes the main sequence"
      >
        <ExtensionEditor plan={plan} setPlan={setPlan} />
      </Section>

      <Section label="Challenge level · pitch of the whole plan">
        <ChallengeSelect
          value={plan.challengeLevel ?? "core"}
          onChange={(v) => setPlan({ ...plan, challengeLevel: v })}
        />
      </Section>

      <div
        className="bw-stack-sm"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
      >
        <Stat label="Estimated time">{plan.estimatedMinutes} min</Stat>
        <div
          style={{
            padding: "10px 12px",
            border: "1px solid var(--line)",
            borderRadius: 8,
            background: "var(--surface)",
          }}
        >
          <label
            htmlFor="scaffold-ceiling"
            className="bw-section-label"
            style={{ display: "block", marginBottom: 6 }}
          >
            Scaffold ceiling
          </label>
          <select
            id="scaffold-ceiling"
            value={plan.scaffoldCeiling}
            onChange={(e) => setPlan({ ...plan, scaffoldCeiling: Number(e.target.value) })}
            title="How many Hint/Rephrase/Simplify presses before Reason fires"
            style={{
              width: "100%",
              padding: "6px 8px",
              border: "1px solid var(--line)",
              borderRadius: 6,
              background: "var(--surface-elev)",
              color: "var(--text)",
              fontSize: 14,
              fontFamily: "var(--font-sans)",
              appearance: "auto",
            }}
          >
            {[2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "press" : "presses"}
              </option>
            ))}
          </select>
        </div>
        <Stat label="Critical concepts">{plan.criticalConcepts.length}</Stat>
      </div>

      {plan.notesForTeacher && plan.notesForTeacher.length > 0 && (
        <div className="bw-card" style={{ padding: 12, background: "rgba(181,138,60,0.08)", borderLeft: "3px solid var(--color-gold-500)" }}>
          <div className="bw-section-label" style={{ marginBottom: 6, color: "var(--color-gold-text)" }}>
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
        <ShareJoinLink joinCode={joinCode} />
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
          Pupils type the code at /join, or open the link directly and just type their name.
          Project the code on the board for the class.
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
        background: "var(--color-gold-tint-2)",
        color: "var(--color-gold-text)",
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

// Three-way pitch selector. Used in DescribeStep before generating the
// plan and in ReviewStep so the teacher can adjust the level on a
// loaded/edited plan too.
function ChallengeSelect({
  value,
  onChange,
}: {
  value: "foundation" | "core" | "stretch";
  onChange: (v: "foundation" | "core" | "stretch") => void;
}) {
  const options: Array<{
    key: "foundation" | "core" | "stretch";
    label: string;
    body: string;
  }> = [
    {
      key: "foundation",
      label: "Foundation",
      body: "Build understanding from minimal prior knowledge. Slower pace, more retrieval.",
    },
    {
      key: "core",
      label: "Core",
      body: "On-syllabus for the year group. The default for most classes.",
    },
    {
      key: "stretch",
      label: "Stretch",
      body: "Above-syllabus. Pupils are expected to generalise and defend reasoning.",
    },
  ];
  return (
    <div
      className="bw-stack-sm"
      style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            aria-pressed={active}
            style={{
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 8,
              cursor: "pointer",
              background: active ? "var(--color-gold-tint-2)" : "var(--surface)",
              border: `1px solid ${active ? "var(--color-gold-500)" : "var(--line)"}`,
              transition: "all 120ms ease",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: active ? "var(--color-gold-500)" : "var(--text)" }}>
              {opt.label}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4, marginTop: 4 }}>
              {opt.body}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Edit the extension brief on the review surface. If the plan has no
// extension yet (e.g. loaded from a pre-extension library entry), we
// offer an "Add an extension" button that seeds one and opens it.
function ExtensionEditor({
  plan,
  setPlan,
}: {
  plan: LessonPlan;
  setPlan: (p: LessonPlan) => void;
}) {
  const ext = plan.extension;
  if (!ext) {
    return (
      <button
        type="button"
        onClick={() =>
          setPlan({
            ...plan,
            extension: {
              title: `Beyond ${plan.title}`,
              brief: `Push your understanding of ${plan.title} one step beyond the lesson — apply it somewhere you haven't been taught.`,
              stretchHint: "Above-syllabus reach into the next layer.",
              criticalConcepts: plan.criticalConcepts.slice(0, 2),
            },
          })
        }
        className="bw-btn-secondary"
        style={{ fontSize: 12 }}
      >
        Add an extension task
      </button>
    );
  }
  function update(patch: Partial<NonNullable<LessonPlan["extension"]>>) {
    setPlan({ ...plan, extension: { ...ext!, ...patch } });
  }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <input
        value={ext.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="Extension title"
        style={{ ...inputStyle, fontWeight: 600 }}
      />
      <textarea
        value={ext.brief}
        onChange={(e) => update({ brief: e.target.value })}
        placeholder="2–3 sentence brief the pupil sees"
        rows={3}
        style={{ ...inputStyle, resize: "vertical", fontSize: 13 }}
      />
      <label style={{ display: "grid", gap: 4 }}>
        <span style={tinyLabel}>How this reaches above the syllabus</span>
        <input
          value={ext.stretchHint}
          onChange={(e) => update({ stretchHint: e.target.value })}
          placeholder="e.g. a KS4 idea for a Y8 lesson, or a real-world application"
          style={inputStyle}
        />
      </label>
    </div>
  );
}

// Copyable short URL pupils can open in one tap from any device. The
// resolver at /j/[code] redirects into /join?code=, which pre-fills the
// class code and focuses the name input.
function ShareJoinLink({ joinCode }: { joinCode: string }) {
  const [copied, setCopied] = useState(false);
  const url = (() => {
    if (typeof window === "undefined") return `/j/${joinCode}`;
    return `${window.location.origin}/j/${joinCode}`;
  })();
  return (
    <div
      style={{
        marginTop: 14,
        padding: "10px 12px",
        background: "var(--surface-elev)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--text-muted)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          textAlign: "left",
        }}
        title={url}
      >
        {url}
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* noop */
          }
        }}
        className="bw-btn-secondary"
        style={{
          fontSize: 12,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: copied ? "var(--color-gold-text)" : undefined,
          borderColor: copied ? "var(--color-gold-500)" : undefined,
          transition: "color var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)",
        }}
      >
        {copied ? (
          <>
            <Check size={12} color="var(--color-gold-500)" /> Copied
          </>
        ) : (
          "Copy link"
        )}
      </button>
    </div>
  );
}
