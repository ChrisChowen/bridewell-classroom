"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth-context";
import { subscribeToMyClasses } from "@/lib/firebase/classes";
import { NewClassWizard } from "./NewClassWizard";
import { ClassCard } from "./ClassCard";
import type { ClassRecord } from "@/types";

// Classes panel — the teacher's home grid. Each class is a card carrying its
// join code and, when a lesson is running, a calm live read. Create new classes
// from the header; pupils join with the code shown on each card.

export function ClassesPanel() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToMyClasses(user.uid, setClasses);
    return unsub;
  }, [user]);

  return (
    <section>
      <header
        className="flex items-center justify-between"
        style={{ marginBottom: 14, gap: 12, flexWrap: "wrap" }}
      >
        <div>
          <span className="bw-section-label">Your classes</span>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Each class has a join code your pupils type at /join.
          </div>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          className="bw-btn-emphasis"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}
        >
          <Plus size={14} /> New class
        </button>
      </header>

      {/* Empty state is the dashboard's FirstStepsCard onboarding, so we don't
          double up — here we just show the grid when there are classes. */}
      {classes.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 14,
            alignItems: "stretch",
          }}
        >
          {classes.map((c) => (
            <ClassCard key={c.id} klass={c} />
          ))}
        </div>
      )}

      {wizardOpen && <NewClassWizard onClose={() => setWizardOpen(false)} />}
    </section>
  );
}
