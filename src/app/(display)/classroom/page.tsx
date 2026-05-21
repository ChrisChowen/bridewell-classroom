import { Wordmark } from "@/components/shared/Wordmark";
import { StatePill } from "@/components/shared/StatePill";
import { demoLesson, demoPupils } from "@/lib/demo/data";

// Classroom display mode — second-screen projector view. Glanceable, quiet,
// no identifying chat detail. Phase 0 shows the layout; Phase 4 wires the
// live data from RTDB.

export default function ClassroomDisplay() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: 40,
        background: "var(--color-navy-900)",
        color: "var(--color-cream-50)",
      }}
    >
      <header className="flex items-center justify-between" style={{ marginBottom: 36 }}>
        <Wordmark size="landing" />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>{demoLesson.className}</div>
          <div className="bw-display" style={{ fontSize: 22 }}>{demoLesson.title}</div>
        </div>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 18,
        }}
      >
        {demoPupils.map((p) => (
          <div
            key={p.id}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--color-line-dark)",
              borderRadius: 10,
              padding: 22,
              minHeight: 140,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div className="bw-display" style={{ fontSize: 28 }}>{p.displayName}</div>
            <StatePill state={p.currentState} />
          </div>
        ))}
      </section>
    </main>
  );
}
