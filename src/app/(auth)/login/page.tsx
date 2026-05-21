"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/shared/Wordmark";
import { useAuth } from "@/lib/firebase/auth-context";
import type { School } from "@/types";

type Tab = "signin" | "register";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>("signin");

  useEffect(() => {
    if (auth.status === "teacher") {
      router.replace("/dashboard");
    }
  }, [auth.status, router]);

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="bw-card" style={{ width: "100%", maxWidth: 420, padding: 28 }}>
        <div style={{ marginBottom: 22 }}>
          <Wordmark />
        </div>
        <div className="flex" style={{ gap: 2, marginBottom: 18, borderBottom: "1px solid var(--line)" }}>
          <TabBtn active={tab === "signin"} onClick={() => setTab("signin")}>Sign in</TabBtn>
          <TabBtn active={tab === "register"} onClick={() => setTab("register")}>Register</TabBtn>
        </div>
        {tab === "signin" ? <SignInForm /> : <RegisterForm />}
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 18, textAlign: "center" }}>
          A pupil joining a lesson?{" "}
          <Link href="/join" style={{ color: "var(--color-navy-700)", textDecoration: "underline" }}>
            Join with a class code
          </Link>
        </p>
      </div>
    </main>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 12px",
        background: "transparent",
        border: "none",
        borderBottom: `2px solid ${active ? "var(--color-gold-500)" : "transparent"}`,
        color: active ? "var(--text)" : "var(--text-muted)",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        marginBottom: -1,
      }}
    >
      {children}
    </button>
  );
}

function SignInForm() {
  const router = useRouter();
  const { signInTeacher } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await signInTeacher(email, password);
      router.replace("/dashboard");
    } catch (e) {
      setErr(toMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
        Bridewell teachers — sign in to your classroom dashboard.
      </p>
      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="jane.wells@kesw.org" />
      <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
      {err && <ErrorLine text={err} />}
      <button type="submit" className="bw-btn-primary" disabled={busy} style={{ marginTop: 4 }}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function RegisterForm() {
  const router = useRouter();
  const { registerTeacher } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [school, setSchool] = useState<School>("KESW");
  const [role, setRole] = useState("Teacher");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await registerTeacher(email, password, displayName, school, role);
      router.replace("/dashboard");
    } catch (e) {
      setErr(toMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
        First time? Create your teacher account. You will be able to set up a class on the next screen.
      </p>
      <Field label="Full name" value={displayName} onChange={setDisplayName} placeholder="Jane Wells" />
      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="jane.wells@kesw.org" />
      <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" />
      <div
        className="bw-stack-sm"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
      >
        <label style={{ display: "grid", gap: 4 }}>
          <span className="bw-section-label">School</span>
          <select
            value={school}
            onChange={(e) => setSchool(e.target.value as School)}
            style={selectStyle}
          >
            <option value="KESW">King Edward&apos;s Witley</option>
            <option value="Barrow Hills">Barrow Hills</option>
            <option value="Longacre">Longacre</option>
          </select>
        </label>
        <Field label="Role / title" value={role} onChange={setRole} placeholder="Head of Biology" />
      </div>
      {err && <ErrorLine text={err} />}
      <button type="submit" className="bw-btn-primary" disabled={busy} style={{ marginTop: 4 }}>
        {busy ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span className="bw-section-label">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        style={inputStyle}
      />
    </label>
  );
}

function ErrorLine({ text }: { text: string }) {
  return (
    <div
      role="alert"
      style={{
        background: "rgba(142,42,42,0.08)",
        color: "var(--color-crimson)",
        padding: "8px 10px",
        borderRadius: 6,
        fontSize: 12,
      }}
    >
      {text}
    </div>
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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "auto",
};

function toMessage(e: unknown): string {
  if (e instanceof Error) {
    return e.message
      .replace("Firebase: ", "")
      .replace(/\(auth\/([^)]+)\)\.?/, (_, code) => `(${code.replaceAll("-", " ")})`);
  }
  return "Something went wrong";
}
