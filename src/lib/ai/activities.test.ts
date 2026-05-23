import { describe, it, expect } from "vitest";
import {
  alternateActivity,
  varyAdjacentActivities,
  ACTIVITIES,
  type ActivityType,
} from "./activities";

describe("alternateActivity", () => {
  it("never returns the avoided activity", () => {
    for (const t of Object.keys(ACTIVITIES) as ActivityType[]) {
      expect(alternateActivity(t)).not.toBe(t);
    }
  });

  it("prefers an activity that fits the subject", () => {
    // role_play fits History/English/Geography; ask for an alternate to it
    // under Mathematics — the result must be a Maths-suitable activity.
    const alt = alternateActivity("role_play", "Mathematics");
    const fit = ACTIVITIES[alt].subjectFit;
    expect(!fit || fit.length === 0 || fit.includes("Mathematics")).toBe(true);
  });

  it("is deterministic", () => {
    expect(alternateActivity("socratic", "Biology")).toBe(
      alternateActivity("socratic", "Biology")
    );
  });
});

describe("varyAdjacentActivities", () => {
  it("breaks adjacent repeats", () => {
    const steps = [
      { activityType: "socratic" as ActivityType },
      { activityType: "socratic" as ActivityType },
      { activityType: "socratic" as ActivityType },
    ];
    const out = varyAdjacentActivities(steps, "Biology");
    for (let i = 1; i < out.length; i++) {
      expect(out[i].activityType).not.toBe(out[i - 1].activityType);
    }
  });

  it("leaves an already-varied sequence untouched", () => {
    const steps = [
      { activityType: "socratic" as ActivityType, title: "a" },
      { activityType: "prediction" as ActivityType, title: "b" },
      { activityType: "teach_back" as ActivityType, title: "c" },
    ];
    const out = varyAdjacentActivities(steps);
    expect(out.map((s) => s.activityType)).toEqual([
      "socratic",
      "prediction",
      "teach_back",
    ]);
    // Preserves other fields.
    expect(out.map((s) => s.title)).toEqual(["a", "b", "c"]);
  });

  it("handles single-step and empty sequences", () => {
    expect(varyAdjacentActivities([])).toEqual([]);
    expect(
      varyAdjacentActivities([{ activityType: "socratic" as ActivityType }])
    ).toEqual([{ activityType: "socratic" }]);
  });
});
