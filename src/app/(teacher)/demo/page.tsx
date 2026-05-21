"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Eye } from "lucide-react";
import { TopBar } from "@/components/shared/TopBar";
import { Fleur } from "@/components/shared/Fleur";
import { StateDistribution } from "@/components/teacher/StateDistribution";
import { ClassStream } from "@/components/teacher/ClassStream";
import { PupilPanel } from "@/components/teacher/PupilPanel";
import {
  demoPupils,
  demoLesson,
  demoTimeline,
  demoReasonTrajectory,
} from "@/lib/demo/data";

// Design preview route. Renders the dashboard surfaces against seeded data
// so we can sense-check the visual register without a real classroom in
// session. Clearly badged so nobody mistakes it for live data.

export default function DemoPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = demoPupils.find((p) => p.id === selectedId) ?? null;

  return (
    <main style={{ minHeight: "100dvh" }}>
      <TopBar
        lessonContext={`${demoLesson.className} · ${demoLesson.subject}`}
        lessonTitle={demoLesson.title}
        teacher={demoLesson.teacher}
        school={demoLesson.school}
        role="Head of Biology"
      />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 28px 56px" }}>
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(181,138,60,0.08)",
            borderLeft: "3px solid var(--color-gold-500)",
            borderRadius: "var(--radius-card)",
            fontSize: 12,
            color: "var(--text)",
            marginBottom: 22,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Eye size={14} color="var(--color-gold-500)" />
          <strong style={{ color: "var(--color-gold-500)" }}>Design preview</strong>
          <span style={{ color: "var(--text-muted)" }}>
            Seeded data only — useful for sense-checking the visual register. Your real dashboard is at{" "}
          </span>
          <Link href="/dashboard" style={{ color: "var(--text)", textDecoration: "underline" }}>
            /dashboard
          </Link>
          <span style={{ color: "var(--text-muted)" }}>.</span>
        </div>

        <section
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <div>
            <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
              <Fleur size={12} />
              <span className="bw-section-label">Today · {timeOfDay()}</span>
            </div>
            <h1 className="bw-display" style={{ fontSize: 30, lineHeight: 1.15 }}>
              Good {timeOfDay()}, Jane.
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 6 }}>
              You are {demoLesson.startedMinAgo} minutes into a {demoLesson.totalMin}-minute lesson.
              {" "}{demoPupils.length} pupils in session.
            </p>
          </div>
          <Link href="/dashboard" className="bw-btn-secondary" style={{ fontSize: 13 }}>
            <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back to your dashboard
          </Link>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: selected ? "minmax(0, 1fr) 360px" : "minmax(0, 1fr)",
            gap: 20,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 18, minWidth: 0 }}>
            <StateDistribution pupils={demoPupils} />
            <ClassStream
              pupils={demoPupils}
              timeline={demoTimeline}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
            />
          </div>

          {selected && (
            <PupilPanel
              pupil={selected}
              reasonTrajectory={demoReasonTrajectory[selected.id]}
              onClose={() => setSelectedId(null)}
            />
          )}
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
