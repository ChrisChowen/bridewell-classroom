// @vitest-environment happy-dom
//
// B1 — Reason resumption. After the pupil answers a Reason prompt and the
// responder acknowledges, the tutor must take a fresh coach turn so the
// lesson resumes (it stalled before this fix). This test drives the real
// ChatSurface onSubmit path with a mocked network and asserts:
//   - accept      → a fresh /api/chat coach turn fires (no stall)
//   - pattern_flag → a fresh /api/chat coach turn fires (no stall)
//   - evaluator failure → fallback ack + a fresh coach turn fires
//   - soft_challenge → NO extra coach turn (its follow-up question is the
//                      continuation; a second turn would double-question)
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import type { ClassRecord } from "@/types";

vi.mock("@/lib/firebase/client", () => ({
  getFirebase: () => ({
    ready: true,
    auth: { currentUser: { uid: "pupil-1", getIdToken: async () => "test-token" } },
  }),
}));
vi.mock("@/lib/firebase/auth-fetch", () => ({
  getCleanIdToken: async () => "test-token",
}));
vi.mock("@/lib/firebase/live", () => ({
  bumpPupilLiveMessage: vi.fn(),
  acknowledgeIntervention: vi.fn(),
  subscribeToPupilInterventions: () => () => {},
  subscribeToPupilSelf: () => () => {},
  // Report the class as started so the surface isn't stuck in the lobby.
  subscribeToSessionStatus: (_id: string, cb: (s: { value: string }) => void) => {
    cb({ value: "started" });
    return () => {};
  },
}));
vi.mock("@/lib/voice", () => ({
  speak: vi.fn(),
  startBritishDictation: () => null,
  speechInputAvailable: () => false,
}));

import { ChatSurface } from "./ChatSurface";

const klass: ClassRecord = {
  id: "class-1",
  joinCode: "ABCDEF",
  teacherId: "teacher-1",
  subject: "Biology",
  title: "Photosynthesis",
  createdAt: 1,
  lessonPlan: {
    id: "plan-1",
    title: "Photosynthesis",
    subject: "Biology",
    objectives: ["Understand photosynthesis"],
    criticalConcepts: ["chlorophyll absorbs light"],
    keyVocabulary: [],
    tutorAddendum: "",
    scaffoldCeiling: 3,
    defaultMode: "coach",
    challengeLevel: "core",
    sequence: [
      {
        title: "Step 1",
        goal: "Explain photosynthesis",
        activityType: "explain",
        openingPrompt: "What do plants need to make food?",
        criticalConcepts: ["chlorophyll absorbs light"],
        expectedMisconceptions: [],
      },
    ],
  },
} as unknown as ClassRecord;

// A mock fetch that records calls and answers each route. The evaluate
// route's branch is configurable per test.
function makeFetch(branch: string | null, opts: { evaluateFails?: boolean } = {}) {
  const calls: string[] = [];
  const fn = vi.fn(async (url: string) => {
    calls.push(url);
    if (url.includes("/api/reason/evaluate")) {
      if (opts.evaluateFails) {
        return { ok: false, status: 500, json: async () => ({}) } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          evaluation: { confidence: 0.9, branch },
          response: { branch, tutorTurn: `RESPONDER_${branch}` },
        }),
      } as Response;
    }
    if (url.includes("/api/chat")) {
      return {
        ok: true,
        json: async () => ({ text: "FRESH_COACH_TURN", fallbackUsed: false }),
      } as Response;
    }
    // conversation/append, engagement/run, etc.
    return { ok: true, json: async () => ({}) } as Response;
  });
  return { fn, calls };
}

function seedReasonCard() {
  window.sessionStorage.setItem(
    "bw-reason-card",
    JSON.stringify({
      eventId: "evt-1",
      promptType: "paraphrase",
      promptText: "Put it in your own words.",
      concept: "chlorophyll absorbs light",
    })
  );
}

async function answerReason() {
  // The rehydrated Reason card renders its textarea + Submit button.
  const textarea = await screen.findByLabelText("Your response");
  fireEvent.change(textarea, { target: { value: "Plants use light to make food." } });
  const submit = screen.getByRole("button", { name: /submit/i });
  fireEvent.click(submit);
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("B1 — Reason resumption", () => {
  it("accept: takes a fresh coach turn so the lesson resumes", async () => {
    const { fn, calls } = makeFetch("accept");
    vi.stubGlobal("fetch", fn);
    seedReasonCard();
    render(<ChatSurface klass={klass} />);

    await answerReason();

    await waitFor(() => expect(calls.some((u) => u.includes("/api/chat"))).toBe(true));
    expect(await screen.findByText("FRESH_COACH_TURN")).toBeTruthy();
    // The responder ack is shown too.
    expect(screen.getByText("RESPONDER_accept")).toBeTruthy();
  });

  it("pattern_flag: takes a fresh coach turn so the lesson resumes", async () => {
    const { fn, calls } = makeFetch("pattern_flag");
    vi.stubGlobal("fetch", fn);
    seedReasonCard();
    render(<ChatSurface klass={klass} />);

    await answerReason();

    await waitFor(() => expect(calls.some((u) => u.includes("/api/chat"))).toBe(true));
    expect(await screen.findByText("FRESH_COACH_TURN")).toBeTruthy();
  });

  it("evaluator failure: falls back to an ack AND still resumes with a coach turn", async () => {
    const { fn, calls } = makeFetch(null, { evaluateFails: true });
    vi.stubGlobal("fetch", fn);
    seedReasonCard();
    render(<ChatSurface klass={klass} />);

    await answerReason();

    await waitFor(() => expect(calls.some((u) => u.includes("/api/chat"))).toBe(true));
    expect(await screen.findByText("FRESH_COACH_TURN")).toBeTruthy();
  });

  it("soft_challenge: does NOT fire a second coach turn (its follow-up is the continuation)", async () => {
    const { fn, calls } = makeFetch("soft_challenge");
    vi.stubGlobal("fetch", fn);
    seedReasonCard();
    render(<ChatSurface klass={klass} />);

    await answerReason();

    // The responder follow-up appears…
    expect(await screen.findByText("RESPONDER_soft_challenge")).toBeTruthy();
    // …and no /api/chat resume turn was requested.
    await new Promise((r) => setTimeout(r, 50));
    expect(calls.some((u) => u.includes("/api/chat"))).toBe(false);
  });
});
