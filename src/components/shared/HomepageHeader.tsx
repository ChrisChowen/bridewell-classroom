"use client";

// Top bar for the public homepage. Switches between two states:
//   - Signed out: "Teacher sign in" + "Pupil join" buttons.
//   - Teacher signed in: account dropdown (Dashboard / theme / Sign out)
//     replaces the sign-in button; "Pupil join" stays so a teacher can
//     still demo the pupil flow on a borrowed device.
// Anonymous (pupil) sign-in is ignored — those sessions live in the
// /session route, not the homepage.

import Link from "next/link";
import { useEffect, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { Crest } from "./Crest";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { useAuth } from "@/lib/firebase/auth-context";
import { getDoc, doc, getFirestore } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";

type School = "KESW" | "Barrow Hills" | "Longacre";

export function HomepageHeader() {
  const { status, displayName, user } = useAuth();
  const isTeacher = status === "teacher";

  const [school, setSchool] = useState<School>("KESW");

  // Read the teacher's school from their /teachers/{uid} doc so the
  // UserMenu can render with the right monogram. Falls back silently.
  useEffect(() => {
    if (!isTeacher || !user) return;
    const fb = getFirebase();
    if (!fb.ready) return;
    const db = getFirestore(fb.app);
    getDoc(doc(db, "teachers", user.uid))
      .then((snap) => {
        const data = snap.data();
        if (data?.school === "KESW" || data?.school === "Barrow Hills" || data?.school === "Longacre") {
          setSchool(data.school);
        }
      })
      .catch(() => {
        /* noop — keep default */
      });
  }, [isTeacher, user]);

  return (
    <header
      className="bw-pad-fluid"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "20px 40px",
        borderBottom: "1px solid var(--line)",
        position: "sticky",
        top: 0,
        background: "var(--bg)",
        zIndex: 10,
        backdropFilter: "saturate(140%) blur(6px)",
      }}
    >
      <Link
        href="/"
        className="flex items-center gap-3"
        aria-label="Bridewell Classroom — home"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <Crest size={32} />
        <div className="flex items-baseline gap-3">
          <span className="bw-display" style={{ fontSize: 18 }}>Bridewell</span>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              paddingLeft: 12,
              borderLeft: "1px solid var(--line)",
            }}
          >
            Classroom
          </span>
        </div>
      </Link>

      <nav className="flex items-center gap-2">
        {isTeacher ? (
          <>
            <Link
              href="/dashboard"
              className="bw-btn-secondary"
              style={{
                fontSize: 13,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <LayoutDashboard size={14} /> Dashboard
            </Link>
            <UserMenu
              name={displayName ?? user?.email?.split("@")[0] ?? "Teacher"}
              school={school}
              role="Teacher"
            />
          </>
        ) : (
          <>
            <span className="bw-hide-sm"><ThemeToggle /></span>
            <Link
              href="/login"
              className="bw-btn-secondary"
              style={{ whiteSpace: "nowrap" }}
            >
              <span className="bw-hide-sm">Teacher </span>Sign in
            </Link>
            <Link
              href="/join"
              className="bw-btn-primary"
              style={{ whiteSpace: "nowrap" }}
            >
              <span className="bw-hide-sm">Pupil </span>Join
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
