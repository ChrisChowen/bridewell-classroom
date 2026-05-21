// Lesson activity types — the small set of "modes" the tutor can run a
// step in. The point of the catalogue is that 45 minutes of pure
// Socratic questioning is too monotone for a Year-8 pupil; varying the
// activity keeps engagement up and tests understanding through
// different cognitive routes (retrieval, prediction, sorting,
// application, teach-back).
//
// Each activity:
//   - has a short human-readable label and one-line description for the
//     wizard review UI
//   - has tutor-facing instructions that get spliced into the system
//     prompt when this step is active
//   - is paced for a 5–10 minute slice of a 45-minute lesson
//
// All activities run on top of the COACH-mode safety floor (ask rather
// than tell; British English; no exclamations; safeguarding redirect on
// disclosure). The activity only changes WHAT the tutor does in the
// turn, not its underlying register.

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

interface ActivityDef {
  label: string;
  description: string;
  tutorInstructions: string;
  // Whether this activity is well-suited to a given subject. Empty array
  // means "fine for any subject".
  subjectFit?: string[];
}

export const ACTIVITIES: Record<ActivityType, ActivityDef> = {
  socratic: {
    label: "Socratic dialogue",
    description: "The tutor asks well-aimed questions to surface the pupil's thinking.",
    tutorInstructions:
      "Run this step as Socratic dialogue. Ask one question at a time. Each question should target a single move in the pupil's thinking. Acknowledge what the pupil says before asking the next thing. Do not give answers.",
  },

  retrieval_quiz: {
    label: "Retrieval quiz",
    description: "Two or three quick recall questions to strengthen memory.",
    tutorInstructions:
      "Run this step as a short retrieval practice: ask 2–3 quick recall questions, one at a time. Confirm correct answers in a single sentence; for wrong answers give the correct one plainly and move on (do not extend or scaffold during retrieval — quick is the point). End with a single sentence linking what they just recalled to the lesson's bigger idea.",
    subjectFit: ["Biology", "Chemistry", "Physics", "History", "Mathematics"],
  },

  prediction: {
    label: "Prediction → check",
    description: "Pupil predicts an outcome, then compares against the real one.",
    tutorInstructions:
      "Run this step as a prediction exercise. Pose a hypothetical scenario relevant to the concept (e.g. 'what if we covered the leaf with foil'). Ask the pupil to predict and to say WHY. Once they answer, reveal what actually happens, then ask them to compare their reasoning to the real outcome. The goal is to surface the model in their head, not catch them out.",
    subjectFit: ["Biology", "Chemistry", "Physics", "Mathematics", "Geography"],
  },

  sort_or_match: {
    label: "Sort or match",
    description: "Pupil categorises items the tutor presents.",
    tutorInstructions:
      "Run this step as a sorting or matching task. Present 4–6 items in a short list. Ask the pupil to sort them into 2–3 categories (e.g. 'which of these are reactants, which are products?') or to match pairs (e.g. 'match each device to its purpose'). Ask the pupil to justify one of the harder placements. Do not just confirm — ask them why one might be tricky.",
  },

  worked_example_with_gaps: {
    label: "Worked example with gaps",
    description: "Tutor walks through an example, asking the pupil to fill specific steps.",
    tutorInstructions:
      "Run this step as a worked example with deliberate gaps. Walk through the example one step at a time, naming each step clearly. At specific points, stop and ask the pupil to fill in the next move (the value, the operation, the next sentence). If the pupil gets it wrong, redo just that step with them, do not restart the whole example.",
    subjectFit: ["Mathematics", "Chemistry", "Physics", "English"],
  },

  role_play: {
    label: "Role-play",
    description: "Pupil takes a role and reasons in character.",
    tutorInstructions:
      "Run this step as a short role-play. Give the pupil a specific role (e.g. 'a factory inspector in 1842', 'a friend who has never met this concept') and a single concrete prompt to respond to in role. Keep it tight — one exchange, then step out of role and ask the pupil what they noticed about reasoning from that position.",
    subjectFit: ["History", "English", "Geography"],
  },

  creative_application: {
    label: "Creative application",
    description: "Pupil applies the concept to a novel context they choose.",
    tutorInstructions:
      "Run this step as a creative application. Ask the pupil to apply the concept to a context they care about or have chosen — a hobby, a current event, a story. Their job is to make the concept land in a place the textbook does not put it. You probe the FIT of the application, not the cleverness of the context.",
  },

  exam_style_practice: {
    label: "Exam-style practice",
    description: "Short exam-style question with marks-style guidance.",
    tutorInstructions:
      "Run this step as exam-style practice. Pose one short answer question in the style of an end-of-topic assessment for this Year group. After the pupil answers, give marks-style feedback: what they got, what a stronger answer would also include, and one specific improvement. Do not grade with a number; describe what a strong answer does.",
    subjectFit: ["Biology", "Chemistry", "Physics", "English", "History", "Mathematics", "Geography"],
  },

  teach_back: {
    label: "Teach-back",
    description: "Pupil explains the concept to someone in the year below.",
    tutorInstructions:
      "Run this step as a teach-back. Ask the pupil to explain the concept as if they were explaining it to someone in the year below them. They must write at least two sentences. Probe the parts of the explanation that are weakest, in a generative tone ('say a bit more about X'), not an evaluative one.",
  },
};

export const ALL_ACTIVITY_TYPES: ActivityType[] = Object.keys(ACTIVITIES) as ActivityType[];

export function activityLabel(type: ActivityType): string {
  return ACTIVITIES[type]?.label ?? type;
}

export function activityInstructions(type: ActivityType): string {
  return ACTIVITIES[type]?.tutorInstructions ?? "";
}
