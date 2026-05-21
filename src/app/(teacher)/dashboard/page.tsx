"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/shared/TopBar";
import { Fleur } from "@/components/shared/Fleur";
import { ClassesPanel } from "@/components/teacher/ClassesPanel";
import { useAuth } from "@/lib/firebase/auth-context";
import { subscribeToMyClasses } from "@/lib/firebase/classes";
import type { ClassRecord, School } from "@/types";

// Teacher dashboard. Honest empty states first — no seeded/demo content
// on the real surface; the teacher only sees what is actually live.
//
// The engagement viz (ClassStream / StateDistribution / PupilPanel)
// appears only when there is a live class with pupils joined. Until
// Phase 1 wires real classifier output, that block stays in a "waiting
// for pupils" state.

export default function DashboardPage() {
  const router = useRouter();
  const { status, user, displayName, email, signOut } = useAuth();
  const [classes, setClasses] = useState<ClassRecord[] | null>(null);

  useEffect(() => {
    if (status === "out") router.replace("/login");
    else if (status === "pupil") router.replace("/session");
  }, [status, router]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToMyClasses(user.uid, (cs) => setClasses(cs));
    return unsub;
  }, [user]);

  if (status === "loading" || status === "out" || status === "pupil") {
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
      </main>
    );
  }

  const teacherName = displayName ?? email ?? "Teacher";
  // School comes off the teacher record in Phase 2; for now we keep KESW
  // as a placeholder in the chip until we wire teacher profile reads.
  const school: School = "KESW";

  const hasClasses = (classes?.length ?? 0) > 0;
  const isLoadingClasses = classes === null;

  return (
    <main style={{ minHeight: "100dvh" }}>
      <TopBar teacher={teacherName} school={school} role="Teacher" />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 28px 56px" }}>
        <section
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 22,
          }}
        >
          <div>
            <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
              <Fleur size={12} />
              <span className="bw-section-label">Today · {timeOfDay()}</span>
            </div>
            <h1 className="bw-display" style={{ fontSize: 30, lineHeight: 1.15 }}>
              Good {timeOfDay()}, {firstName(teacherName)}.
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 6 }}>
              {isLoadingClasses
                ? "Loading your classes…"
                : hasClasses
                ? `You have ${classes!.length} ${classes!.length === 1 ? "class" : "classes"}. Pupils join with the code shown alongside each.`
                : "You have no classes yet. Create one to begin."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={signOut} className="bw-btn-secondary" style={{ fontSize: 13 }}>
              Sign out
            </button>
          </div>
        </section>

        <div style={{ display: "grid", gap: 18 }}>
          <ClassesPanel />

          {hasClasses && <EngagementWaitingPanel classes={classes!} />}

          {!hasClasses && !isLoadingClasses && <FirstStepsCard />}
        </div>
      </div>
    </main>
  );
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function firstName(s: string) {
  const trimmed = s.includes("@") ? s.split("@")[0] : s;
  return (trimmed.split(/[\s.]/)[0] ?? trimmed) || "there";
}

function EngagementWaitingPanel({ classes }: { classes: ClassRecord[] }) {
  const totalPlanned = classes.reduce((sum, c) => sum + (c.lessonPlan ? 1 : 0), 0);
  return (
    <section className="bw-card" style={{ padding: 22, textAlign: "center" }}>
      <span className="bw-section-label" style={{ display: "block", marginBottom: 6 }}>
        Live class state
      </span>
      <div className="bw-display" style={{ fontSize: 18, marginBottom: 6 }}>
        Waiting for pupils to join
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 540, margin: "0 auto" }}>
        {totalPlanned} of your {classes.length} {classes.length === 1 ? "class has" : "classes have"} an approved lesson plan ready.
        Share the join code with your class and the engagement stream will appear here as
        pupils start chatting with the tutor.
      </p>
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12 }}>
        Once pupils start joining and chatting, the dashboard will populate live —
        per-pupil cards, engagement sparklines, and safeguarding flags will appear as
        they happen.
      </p>
    </section>
  );
}

function FirstStepsCard() {
  return (
    <section
      className="bw-card bw-stack-md"
      style={{
        padding: 0,
        background: "rgba(181,138,60,0.06)",
        borderLeft: "3px solid var(--color-gold-500)",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: 24 }}>
        <span className="bw-section-label" style={{ color: "var(--color-gold-500)" }}>
          Welcome
        </span>
        <h2 className="bw-display" style={{ fontSize: 20, margin: "8px 0 6px" }}>
          Set up your first class
        </h2>
        <p style={{ color: "var(--text)", fontSize: 14, lineHeight: 1.55, marginBottom: 14 }}>
          Click <strong>New class</strong> above. Pick a topic from the UK KS3 syllabus library,
          write a sentence about what you want pupils to come away with, and the AI drafts a
          lesson plan you can review and approve. Once approved, you get a six-character
          join code your pupils type to enter the lesson.
        </p>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
          <li>· Choose the topic — Biology, English, Mathematics, History.</li>
          <li>· Describe your intent in plain English; the AI does the configuration.</li>
          <li>· Review the plan — every section is editable before you approve.</li>
          <li>· Share the join code with your pupils on the classroom screen.</li>
        </ul>
      </div>
      <div
        aria-hidden
        style={{
          position: "relative",
          minHeight: 220,
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <span className="bw-scholar-frame">
          <Image
            src="/img/motif-open-book.png"
            alt=""
            width={180}
            height={180}
            style={{ width: "100%", maxWidth: 180, height: "auto", opacity: 0.95 }}
          />
        </span>
      </div>
    </section>
  );
}
