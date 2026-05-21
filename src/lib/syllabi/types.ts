// Curated UK syllabus library — types.
//
// The teacher does not write a system prompt. The teacher picks a syllabus
// topic and describes their intent in natural language. The AI then
// generates the lesson plan and asks for approval.
//
// Syllabus entries are grounded in the UK National Curriculum (KS3) and
// supplemented with prep-school context where it differs (ISEB CE13+).
// References are kept in the `source` field so teachers can verify what
// the prompt is built against.

export interface SyllabusEntry {
  id: string;
  // Curriculum framing
  keyStage: "KS3" | "KS4";
  yearGroup: 7 | 8 | 9 | 10 | 11;
  subject: "Biology" | "English" | "Mathematics" | "History" | "Chemistry" | "Physics" | "Geography";
  topic: string;
  // A one-line, teacher-readable description.
  blurb: string;
  // Programme-of-study language — short paragraph drawn from the official
  // curriculum so the AI prompt is grounded in real content the school
  // already teaches.
  programmeOfStudy: string;
  // Specific learning outcomes pupils should reach by end of the topic.
  learningOutcomes: string[];
  // Concepts whose understanding is critical — the AI fires Reason on
  // these by default. Teachers can edit at approval time.
  criticalConcepts: string[];
  // Short list of vocabulary the AI should anchor to.
  keyVocabulary: string[];
  // Suggested lesson length in minutes (informative; lesson plan may
  // override).
  suggestedMinutes: number;
  // Source attribution.
  source: { name: string; url?: string };
}

export interface SyllabusLibrary {
  version: string;
  entries: SyllabusEntry[];
}
