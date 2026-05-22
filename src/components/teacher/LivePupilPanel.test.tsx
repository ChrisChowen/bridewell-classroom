// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import type { LearnerProfile } from "@/types";

// Mock the Firebase client + conversation modules so the panels can mount
// without the real SDK / network. The panels only need a token getter.
vi.mock("@/lib/firebase/client", () => ({
  getFirebase: () => ({
    ready: true,
    auth: { currentUser: { getIdToken: async () => "test-token" } },
  }),
}));
vi.mock("@/lib/firebase/conversation", () => ({
  getRecentConversation: async () => [],
}));

import { AdaptivePitch, SendEditor } from "./LivePupilPanel";

function mockFetch(routeData: Record<string, unknown>) {
  return vi.fn(async (url: string) => {
    const key = Object.keys(routeData).find((k) => url.includes(k));
    return {
      ok: true,
      json: async () => (key ? routeData[key] : {}),
    } as Response;
  });
}

const profile: LearnerProfile = {
  pupilId: "p1",
  classId: "c1",
  displayName: "Alex",
  challengeLevel: "stretch",
  sessionsObserved: 3,
  metrics: {
    avgReasonConfidence: 0.82,
    avgScaffoldPresses: 1.3,
    dominantStates: ["flowing", "productive_struggle"],
    lastUpdated: 2000,
  },
  sessions: [
    { sessionId: "s1", timestamp: 1, lessonTitle: "Photosynthesis", messageCount: 8, dominantState: "flowing", avgEngagementConfidence: 0.8, avgReasonConfidence: 0.7, reasonEventCount: 2, scaffoldPresses: 1, challengeBefore: "core", challengeAfter: "stretch" },
    { sessionId: "s2", timestamp: 2, lessonTitle: "Respiration", messageCount: 6, dominantState: "productive_struggle", avgEngagementConfidence: 0.6, avgReasonConfidence: 0.9, reasonEventCount: 1, scaffoldPresses: 2, challengeBefore: "stretch", challengeAfter: "stretch" },
  ],
  createdAt: 1,
  updatedAt: 2,
};

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AdaptivePitch (teacher drill-down)", () => {
  it("renders the empty state for a pupil with no profile", async () => {
    vi.stubGlobal("fetch", mockFetch({ "/profile": { profile: null } }));
    render(<AdaptivePitch pupilId="p1" pupilName="Alex Smith" />);
    expect(await screen.findByText(/No history yet/i)).toBeTruthy();
  });

  it("renders the populated trajectory + current pitch without crashing", async () => {
    vi.stubGlobal("fetch", mockFetch({ "/profile": { profile } }));
    render(<AdaptivePitch pupilId="p1" pupilName="Alex Smith" />);
    // Provenance + session count confirms the populated branch rendered.
    expect(await screen.findByText(/3 sessions/i)).toBeTruthy();
    // "Stretch" appears in the current-level chip AND the override button.
    expect((await screen.findAllByText("Stretch")).length).toBeGreaterThan(0);
    // Rolling metric surfaced.
    expect(await screen.findByText(/Avg Reason 82%/i)).toBeTruthy();
    // Trajectory chip showing a drift (core→stretch) is present.
    expect(await screen.findByText(/Core→Stretch/i)).toBeTruthy();
  });
});

describe("SendEditor (teacher drill-down)", () => {
  it("renders the empty state when no SEND profile is set", async () => {
    vi.stubGlobal("fetch", mockFetch({ "/send": { send: null } }));
    render(<SendEditor pupilId="p1" pupilName="Alex Smith" />);
    expect(await screen.findByText(/No adaptation set/i)).toBeTruthy();
  });

  it("summarises an existing SEND profile", async () => {
    vi.stubGlobal("fetch", mockFetch({ "/send": { send: { outputFormat: "bullets", scaffoldingLevel: 4 } } }));
    render(<SendEditor pupilId="p1" pupilName="Alex Smith" />);
    await waitFor(() => expect(screen.getByText(/bulleted/i)).toBeTruthy());
    expect(screen.getByText(/scaffolding 4\/5/i)).toBeTruthy();
  });
});
