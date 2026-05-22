// Domain types — single source for the shapes that flow through the app.
// Kept narrow on purpose; expand as features land in phases 1 onward.

import type { EngagementState } from "@/lib/brand";

// Re-exported so domain modules can depend on @/types alone for the
// engagement vocabulary (the canonical definition lives in lib/brand).
export type { EngagementState };

export type Role = "teacher" | "pupil" | "tutor" | "system" | "reason";

export type TutorMode = "coach" | "expert";

export type ScaffoldAction = "hint" | "rephrase" | "simplify";

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  // Optional metadata for analytics / classifier signals
  meta?: {
    scaffoldAction?: ScaffoldAction;
    reasonPromptType?: ReasonPromptType;
    reasonConfidence?: number; // 0..1
    reasonBranch?: string;
    fallback?: boolean;
    teacherHint?: boolean;
  };
}

export type ReasonPromptType = "paraphrase" | "novel_example" | "counterfactual" | "teach_back";

export interface EngagementSnapshot {
  pupilId: string;
  sessionId: string;
  timestamp: number;
  state: EngagementState;
  confidence: number; // 0..1
  signals: {
    avgResponseTimeSec?: number;
    avgMessageLength?: number;
    questionRatio?: number;
    topicCoherence?: number;
    scaffoldUseCount?: number;
  };
}

export interface ReasonEvent {
  id: string;
  pupilId: string;
  sessionId: string;
  timestamp: number;
  trigger: "topic_boundary" | "scaffolding_ceiling" | "teacher" | "lesson_design";
  promptType: ReasonPromptType;
  promptText: string;
  responseText?: string;
  confidence?: number; // 0..1
  branch?: "accept" | "soft_challenge" | "pattern_flag";
}

export interface Intervention {
  id: string;
  sessionId: string;
  pupilId: string;
  teacherId: string;
  timestamp: number;
  type: "hint" | "mode_switch" | "pair_up" | "pause" | "mark_reviewed";
  payload?: Record<string, unknown>;
}

export interface PupilSummary {
  id: string;
  displayName: string;
  initials: string;
  currentState: EngagementState;
  stateConfidence: number;
  reasonConfidenceTrailing?: number; // last Reason confidence, 0..1
  scaffoldLast5: number; // count of scaffolding uses in last 5 messages
  fallback?: boolean;
}

export interface LessonConfig {
  id: string;
  title: string;
  subject: string;
  systemPrompt: string;
  criticalConcepts: string[]; // fire Reason on these
  defaultMode: TutorMode;
  scaffoldCeiling: number;
}

// LessonPlan — the AI-generated, teacher-approved blueprint that drives
// the tutor and the Reason architecture for a class. The teacher's
// natural-language intent + a syllabus entry feed in; this comes out.

// Activity types the tutor can run a step in. The catalogue + the
// tutor instructions per activity live in `src/lib/ai/activities.ts`.
// Kept as a string literal union here so type narrowing works across
// the codebase without importing the activity module everywhere.
export type ActivityType =
  | "socratic"
  | "retrieval_quiz"
  | "prediction"
  | "sort_or_match"
  | "worked_example_with_gaps"
  | "role_play"
  | "creative_application"
  | "exam_style_practice"
  | "teach_back";

export interface LessonStep {
  // A discrete topic the tutor will walk the pupil through. The AI may
  // produce 2–5 of these for a 30–60 minute lesson.
  title: string;
  // What the tutor should help the pupil reach by the end of this step
  // (used to drive the coach's questioning).
  goal: string;
  // The activity shape this step runs in. Default is "socratic" — the
  // planner picks varied activities so the lesson is not 45 minutes of
  // pure questioning.
  activityType: ActivityType;
  // Concepts whose understanding is critical — Reason fires on these
  // mid-step where they appear in the chat.
  criticalConcepts: string[];
  // An opening prompt the tutor uses to enter this step.
  openingPrompt: string;
  // Anticipated misconceptions the tutor should listen for.
  expectedMisconceptions?: string[];
  // Estimated time on this step (minutes).
  estimatedMinutes?: number;
}

export interface LessonPlan {
  id: string;
  title: string;
  subject: string;
  yearGroup: number;
  // The teacher's natural-language brief — kept on the record so we can
  // recompute the plan if needed.
  teacherIntent: string;
  // Linking back to the syllabus entry the teacher picked.
  syllabusId?: string;
  // Top-level objectives the lesson aims at.
  learningObjectives: string[];
  // Concepts across the whole lesson that fire Reason.
  criticalConcepts: string[];
  // Vocabulary the tutor anchors to.
  keyVocabulary: string[];
  // Sequenced steps the tutor works through.
  sequence: LessonStep[];
  // System-prompt addendum the AI built from the intent + syllabus. The
  // base tutor prompt (coach register, safety, etc.) is added by the
  // server-side prompt builder; this is the lesson-specific layer.
  tutorAddendum: string;
  // Number of scaffolding uses on one concept before Reason fires the
  // ceiling trigger. Default 3.
  scaffoldCeiling: number;
  // Coach or expert default. Coach unless the teacher explicitly asks
  // for Expert at approval time.
  defaultMode: TutorMode;
  // Estimated duration in minutes.
  estimatedMinutes: number;
  // Lifecycle
  generatedAt: number;
  approvedAt?: number;
  approvedBy?: string; // teacher UID
  // Free-text notes the AI wants the teacher to confirm (open questions,
  // assumed prior knowledge).
  notesForTeacher?: string[];
  // Difficulty knob the planner respects + the tutor inherits. Real
  // classes are imbalanced: the same syllabus topic ranges from
  // "stretch the high attainer" to "build the basics for the bottom
  // set". The planner uses this to pick prompt depth + activity
  // difficulty. The tutor uses it to calibrate how generous to be on
  // the soft-challenge follow-ups.
  //   foundation: build understanding from minimal prior knowledge
  //   core:       on-syllabus for the year group
  //   stretch:    push beyond the explicit syllabus into the next layer
  challengeLevel?: "foundation" | "core" | "stretch";
  // Extension / overflow task — what a pupil who finishes early or who
  // is plainly ahead of the class should be doing. The AI plans this
  // as one open-ended brief that can run for 10+ minutes, NOT as a
  // structured step (the early-finisher should not be on rails). The
  // tutor switches into this when the pupil completes step N where N
  // is the last step OR when the teacher promotes them via the drill
  // panel. Deliberately reaches above the syllabus so the AI doesn't
  // simply give the high-attainer more of the same.
  extension?: {
    title: string;
    // 2-3 sentence brief the pupil sees + the tutor coaches against.
    brief: string;
    // What "above the syllabus" looks like for this lesson — e.g. a
    // KS4 idea for a Y8 lesson, or a real-world application.
    stretchHint: string;
    // Anchored concepts the tutor should probe on this stretch run.
    criticalConcepts?: string[];
  };
}

// Lesson library + post-class appraisal ----------------------------------

export interface LessonAppraisal {
  rating: 1 | 2 | 3 | 4 | 5;
  summary: string;
  // What worked, written for another teacher to read.
  whatWorked: string[];
  // What didn't, framed as adjustments to consider.
  whatToAdjust: string[];
  // Metrics drawn from the actual classifier output during the class.
  metrics: {
    pupilsClassified: number;
    statesObserved: Record<string, number>;
    safeguardingEvents: number;
    reasonEvents: number;
    reasonAcceptRate?: number; // 0..1
  };
  generatedAt: number;
}

export interface LessonLibraryEntry {
  id: string;
  // Full plan as it was used.
  plan: LessonPlan;
  appraisal: LessonAppraisal;
  // School this was saved from. Library entries are visible to all
  // teachers within the same school.
  school: School;
  savedAt: number;
  savedByTeacherId: string;
  savedByTeacherName: string;
  // For traceability — the class id this plan was run on.
  sourceClassId: string;
  // The original syllabus topic id, so the new-class wizard can offer
  // matching library entries when a teacher picks the same topic.
  syllabusId?: string;
}

// Auth + lobby data model -----------------------------------------------

export type School = "KESW" | "Barrow Hills" | "Longacre";

export interface TeacherRecord {
  id: string; // Firebase UID
  email: string;
  displayName: string;
  school: School;
  role: string; // job title, free text ("Head of Biology")
  createdAt: number;
}

export interface ClassRecord {
  id: string;
  teacherId: string;
  // Denormalised teacher display name, stamped at class-create so pupil
  // surfaces (e.g. the lobby overlay) can name the teacher without a second
  // lookup. Optional — classes created before this fall back to generic copy.
  teacherName?: string;
  school: School;
  name: string; // "Year 8 · Set 2"
  subject: string; // "Biology"
  joinCode: string; // 6-char human-friendly code, e.g. PHO-Y8B
  createdAt: number;
  active: boolean;
  // The approved lesson plan that drives this class's tutor + Reason.
  lessonPlan?: LessonPlan;
}

export interface PupilRecord {
  id: string; // Firebase anonymous UID
  classId: string;
  displayName: string;
  pinHash?: string; // optional 4-digit PIN, hashed server-side
  joinedAt: number;
  // SEND adaptation block layered in Phase 4.
  send?: {
    notes?: string;
    outputFormat?: "short" | "bullets" | "structured" | "visual";
    scaffoldingLevel?: 1 | 2 | 3 | 4 | 5;
  };
}

export type ChallengeLevel = "foundation" | "core" | "stretch";

// One session's worth of evidence, folded into the longitudinal profile.
// Deterministic — computed from the persisted trajectory + scaffold +
// Reason events for that session. The narrative is the only LLM-written
// field on the profile and is optional.
export interface LearnerSessionRecord {
  sessionId: string;
  timestamp: number; // session end (consolidation time)
  lessonTitle: string;
  messageCount: number;
  // Aggregated engagement: the most-frequent state across the session's
  // snapshots, and the mean classifier confidence.
  dominantState: EngagementState | null;
  avgEngagementConfidence: number | null; // 0..1
  // Reason: mean evaluator confidence across this session's events.
  avgReasonConfidence: number | null; // 0..1
  reasonEventCount: number;
  // Scaffold reliance: total Hint/Rephrase/Simplify presses this session.
  scaffoldPresses: number;
  // Difficulty drift this session decided.
  challengeBefore: ChallengeLevel;
  challengeAfter: ChallengeLevel;
}

// Longitudinal learner profile, one document per pupil at
// learnerProfiles/{pupilId}. Server-only (admin-written, denied to all
// clients by the security rules). The adaptive-difficulty seam:
// `challengeLevel` is the effective, drifted level the tutor inherits
// per pupil, overriding the lesson-wide default. Drift is gentle — at
// most one step per session, with hysteresis (see src/lib/learner-profile.ts).
export interface LearnerProfile {
  pupilId: string;
  classId: string;
  displayName?: string;
  // Effective per-pupil challenge level, drifted on evidence. The tutor
  // uses this in place of the lesson-wide default.
  challengeLevel: ChallengeLevel;
  sessionsObserved: number;
  // Rolling, deterministic evidence summary (latest values).
  metrics: {
    avgReasonConfidence: number | null; // 0..1, across observed sessions
    avgScaffoldPresses: number | null; // mean presses per session
    dominantStates: EngagementState[]; // most frequent states, ranked
    lastUpdated: number;
  };
  // Short teacher-facing narrative written by the LLM at consolidation
  // (never shown to the pupil). Optional — absent on the deterministic
  // fallback path.
  narrative?: string;
  // Per-session trajectory for the teacher drill-down (capped, newest last).
  sessions: LearnerSessionRecord[];
  // Set when a teacher manually re-pitched this pupil. The override wins
  // until the next consolidation re-evaluates the drift. Recorded for
  // accountability (who/when).
  teacherOverride?: { challengeLevel: ChallengeLevel; by: string; at: number };
  createdAt: number;
  updatedAt: number;
}
