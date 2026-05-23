"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/shared/Wordmark";
import { useAuth } from "@/lib/firebase/auth-context";
import { getCleanIdToken } from "@/lib/firebase/auth-fetch";
import { normaliseJoinCode } from "@/lib/joinCode";

// Local-storage keys for the "remember me" rejoin flow. Firebase Auth
// already persists the anonymous UID across reloads via IndexedDB, but
// these let a pupil who clears their cookies or comes back tomorrow
// land back into their lesson without re-typing the code.
const LS_CODE = "bw-pupil-class-code";
const LS_NAME = "bw-pupil-display-name";

interface CurrentClass {
  name: string;
  subject: string;
  joinCode: string;
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinInner />
    </Suspense>
  );
}

function JoinInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInPupil, status } = useAuth();
  const [joinCode, setJoinCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "joined">("form");
  const [joinedClass, setJoinedClass] = useState<{ name: string; subject: string } | null>(null);
  const [currentClass, setCurrentClass] = useState<CurrentClass | null>(null);
  // True when the join code came from the URL — we surface a small
  // affordance ("from your teacher's link") and skip-focus the code
  // input so the pupil lands directly on the name field.
  const [codeFromUrl, setCodeFromUrl] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // If the pupil is already signed in and in a class, fetch that class so
  // we can show "you are currently in X — enter a new code to switch".
  useEffect(() => {
    if (status !== "pupil") {
      setCurrentClass(null);
      return;
    }
    let cancelled = false;
    async function load() {
      const token = await getCleanIdToken();
      if (!token) return;
      try {
        const r = await fetch("/api/pupils/me", { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) return;
        const data = await r.json();
        if (!cancelled && data?.class) {
          setCurrentClass({
            name: data.class.name,
            subject: data.class.subject,
            joinCode: data.class.joinCode,
          });
        }
      } catch {
        /* ignore — they just won't see the current-class banner */
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [status]);

  // URL ?code=... takes precedence over localStorage (the teacher just
  // shared a direct link to THIS class). When the URL carries a code,
  // we skip-focus the code input and land the cursor on the name field
  // so the pupil only has one thing to type.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlCode = searchParams.get("code");
    const lastCode = window.localStorage.getItem(LS_CODE);
    const lastName = window.localStorage.getItem(LS_NAME);
    let activeCode = "";
    if (urlCode) {
      const normalised = normaliseJoinCode(urlCode);
      setJoinCode(normalised);
      setCodeFromUrl(true);
      activeCode = normalised;
    } else if (lastCode) {
      setJoinCode(lastCode);
      activeCode = lastCode;
    }
    // Only prefill the cached name when the pupil is rejoining the SAME
    // class. On shared school iPads the previous pupil's name was
    // bleeding into the next pupil's join — e.g. period-3 Alex joining
    // as period-2 Maya — which is the worst possible identity issue
    // for a classroom tool.
    if (lastName && activeCode && lastCode && activeCode === lastCode) {
      setDisplayName(lastName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the code came from the URL, autofocus the name input as soon
  // as it's mounted — saves the pupil a tap on mobile.
  useEffect(() => {
    if (codeFromUrl && nameInputRef.current && !displayName) {
      nameInputRef.current.focus();
    }
  }, [codeFromUrl, displayName]);

  // NOTE — we deliberately do NOT auto-redirect a signed-in pupil to
  // /session. If they came back to /join, they probably want to switch
  // classes (e.g. moving from Maths to Biology after lunch). The form
  // shows their current class at the top so they know what they're
  // leaving.

  useEffect(() => {
    if (status === "pupil" && step === "joined" && joinedClass) {
      const t = setTimeout(() => router.replace("/session"), 700);
      return () => clearTimeout(t);
    }
  }, [status, step, joinedClass, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const code = normaliseJoinCode(joinCode);
      if (code.replace("-", "").length !== 6) {
        throw new Error("Please enter the full 6-character code");
      }
      const name = displayName.trim();
      if (name.length < 1) throw new Error("Please enter your name");
      if (pin && !/^\d{4}$/.test(pin)) throw new Error("PIN must be 4 digits");

      const user = await signInPupil(name);
      const token = await user.getIdToken();
      const res = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token, joinCode: code, displayName: name, pin: pin || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not join class");
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_CODE, code);
        window.localStorage.setItem(LS_NAME, name);
        // Carry the join result (pupil + class) forward so /session can render
        // immediately WITHOUT an immediate /api/pupils/me read. The deployed
        // backend has a read-after-write visibility lag: the just-created pupil
        // doc isn't readable for a short window even though it's committed, so
        // an immediate pupils/me 404s and the pupil was bounced back here.
        try {
          window.sessionStorage.setItem(
            "bw-just-joined",
            JSON.stringify({ uid: user.uid, ts: Date.now(), pupil: data.pupil, class: data.class })
          );
        } catch {
          /* sessionStorage unavailable — /session falls back to pupils/me + retry */
        }
      }
      setJoinedClass({ name: data.class.name, subject: data.class.subject });
      setStep("joined");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="bw-card" style={{ width: "100%", maxWidth: 420, padding: 28 }}>
        <div style={{ marginBottom: 22 }}>
          <Wordmark />
        </div>

        <AnimatePresence mode="wait" initial={false}>
        {step === "form" ? (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
          >
            <h1 className="bw-display" style={{ fontSize: 22, marginBottom: 6 }}>
              {currentClass ? "Switch lesson" : "Join your lesson"}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
              {currentClass
                ? `You are currently in ${currentClass.name} (${currentClass.subject}). Enter a new code to switch, or carry on with your lesson.`
                : codeFromUrl
                ? "Class code filled in from your teacher's link. Type your name to join."
                : "Your teacher will give you a six-character code. Enter your name to join."}
            </p>
            {currentClass && (
              <div
                className="bw-card"
                style={{
                  padding: 10,
                  marginBottom: 16,
                  background: "rgba(181,138,60,0.08)",
                  borderLeft: "3px solid var(--color-gold-500)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>{currentClass.name}</div>
                  <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 11, marginTop: 2 }}>
                    {currentClass.joinCode}
                  </div>
                </div>
                <Link href="/session" className="bw-btn-emphasis" style={{ fontSize: 12 }}>
                  Carry on
                </Link>
              </div>
            )}
            <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span className="bw-section-label">Class code</span>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(normaliseJoinCode(e.target.value));
                    setCodeFromUrl(false);
                  }}
                  placeholder="e.g. PHO-Y8B"
                  required
                  autoFocus={!codeFromUrl}
                  inputMode="text"
                  style={{
                    ...inputStyle,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.12em",
                    fontSize: 16,
                    textTransform: "uppercase",
                    background: codeFromUrl ? "var(--color-gold-tint-1)" : "var(--surface)",
                  }}
                />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span className="bw-section-label">Your name</span>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="First name"
                  required
                  maxLength={48}
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span className="bw-section-label">PIN (optional)</span>
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="4 digits if your teacher set one"
                  style={inputStyle}
                />
              </label>
              <AnimatePresence>
                {err && (
                  <motion.div
                    role="alert"
                    initial={{ opacity: 0, y: -4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
                    style={errBox}
                  >
                    {err}
                  </motion.div>
                )}
              </AnimatePresence>
              <button type="submit" className="bw-btn-primary" disabled={busy} style={{ marginTop: 4 }}>
                {busy ? "Joining…" : "Join lesson"}
              </button>
            </form>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 18, textAlign: "center" }}>
              A teacher?{" "}
              <Link href="/login" style={{ color: "var(--color-navy-700)", textDecoration: "underline" }}>
                Sign in here
              </Link>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="joined"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.24, ease: [0, 0, 0.2, 1] }}
            style={{ textAlign: "center", padding: "12px 0 4px" }}
          >
            <div className="bw-display" style={{ fontSize: 22, marginBottom: 8 }}>
              You are in.
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              {joinedClass?.name} · {joinedClass?.subject}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 14 }}>Opening the session…</p>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 6,
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 14,
  fontFamily: "var(--font-sans)",
};

const errBox: React.CSSProperties = {
  background: "rgba(142,42,42,0.08)",
  color: "var(--color-crimson)",
  padding: "8px 10px",
  borderRadius: 6,
  fontSize: 12,
};
