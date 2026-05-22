"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, Plus, Loader2, Trash2, Users, KeyRound } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Crest } from "@/components/shared/Crest";
import { useAuth } from "@/lib/firebase/auth-context";
import { getFirebase } from "@/lib/firebase/client";

// Admin surface — teacher allowlist management + the registered-teacher
// roster. Gated by the same isAdmin flag the /api/admin/* routes enforce
// server-side: the page attempts the admin GET and, on 403, shows a clear
// "not an admin" state rather than the tools. No client-side trust — the
// API is the boundary. (Work-stream B: admin surface / multi-teacher.)

interface AllowEntry {
  email: string;
  isAdmin?: boolean;
  wildcard?: boolean;
  domain?: string;
  addedBy?: string;
  addedAt?: number;
}
interface TeacherRow {
  id: string;
  email: string;
  displayName: string;
  school: string;
  role: string;
  createdAt: number | null;
  isAdmin: boolean;
}

type Gate = "loading" | "denied" | "ok";

export default function AdminPage() {
  const router = useRouter();
  const { status } = useAuth();
  const [gate, setGate] = useState<Gate>("loading");
  const [entries, setEntries] = useState<AllowEntry[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [myEmail, setMyEmail] = useState<string>("");
  const [newEmail, setNewEmail] = useState("");
  const [newAdmin, setNewAdmin] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [rosterMsg, setRosterMsg] = useState<string | null>(null);

  const token = useCallback(async () => {
    const fb = getFirebase();
    if (!fb.ready || !fb.auth.currentUser) return null;
    setMyEmail((fb.auth.currentUser.email ?? "").toLowerCase());
    return fb.auth.currentUser.getIdToken();
  }, []);

  const load = useCallback(async () => {
    const t = await token();
    if (!t) return;
    const headers = { Authorization: `Bearer ${t}` };
    const [aRes, tRes] = await Promise.all([
      fetch("/api/admin/allowlist", { headers }),
      fetch("/api/admin/teachers", { headers }),
    ]);
    if (aRes.status === 403 || !aRes.ok) {
      setGate("denied");
      return;
    }
    const aData = await aRes.json();
    setEntries((aData.allowlist ?? []) as AllowEntry[]);
    if (tRes.ok) {
      const tData = await tRes.json();
      setTeachers((tData.teachers ?? []) as TeacherRow[]);
    }
    setGate("ok");
  }, [token]);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "teacher") {
      router.replace("/login");
      return;
    }
    load();
  }, [status, load, router]);

  async function post(body: Record<string, unknown>, label: string) {
    setBusy(label);
    setMsg(null);
    try {
      const t = await token();
      const r = await fetch("/api/admin/allowlist", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed");
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const raw = newEmail.trim().toLowerCase();
    if (!raw.includes("@")) {
      setMsg("Enter an email (jane@kesw.org) or a domain wildcard (*@kesw.org).");
      return;
    }
    await post({ email: raw, isAdmin: newAdmin }, "add");
    if (!msg) {
      setNewEmail("");
      setNewAdmin(false);
    }
  }

  async function toggleAdmin(entry: AllowEntry) {
    await post({ email: entry.email, isAdmin: !entry.isAdmin }, "toggle:" + entry.email);
  }

  async function resetTeacherPassword(t: TeacherRow) {
    if (!t.email) return;
    if (typeof window !== "undefined" && !window.confirm(`Send a password-reset email to ${t.email}?`)) return;
    setBusy("reset:" + t.id);
    setRosterMsg(null);
    try {
      const fb = getFirebase();
      if (fb.ready) await sendPasswordResetEmail(fb.auth, t.email);
      setRosterMsg(`Password-reset email sent to ${t.email}.`);
    } catch (err) {
      setRosterMsg(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setBusy(null);
    }
  }

  async function remove(entry: AllowEntry) {
    if (entry.email.toLowerCase() === myEmail) {
      setMsg("You can't remove your own admin access.");
      return;
    }
    if (typeof window !== "undefined" && !window.confirm(`Remove ${entry.email} from the allowlist?`)) return;
    setBusy("remove:" + entry.email);
    setMsg(null);
    try {
      const t = await token();
      const r = await fetch(`/api/admin/allowlist?email=${encodeURIComponent(entry.email)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to remove");
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main style={{ minHeight: "100dvh", padding: "clamp(20px,4vw,40px)" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <header className="flex items-center justify-between" style={{ marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
          <div className="flex items-center gap-3">
            <Crest size={32} />
            <div>
              <div className="bw-section-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ShieldCheck size={12} /> Admin
              </div>
              <div className="bw-display" style={{ fontSize: 22 }}>School administration</div>
            </div>
          </div>
          <Link href="/dashboard" className="bw-btn-secondary flex items-center" style={{ gap: 6, fontSize: 13 }}>
            <ArrowLeft size={14} /> Dashboard
          </Link>
        </header>

        {gate === "loading" && (
          <div className="flex items-center gap-2" style={{ color: "var(--text-muted)", fontSize: 14 }}>
            <Loader2 size={16} className="bw-spin" /> Checking admin access…
          </div>
        )}

        {gate === "denied" && (
          <div className="bw-card" style={{ padding: 24 }}>
            <div className="bw-display" style={{ fontSize: 18, marginBottom: 6 }}>Admin access required</div>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Your account isn&apos;t marked as an admin. Ask an existing Bridewell admin to add your
              email here with admin rights.
            </p>
          </div>
        )}

        {gate === "ok" && (
          <>
            {/* Allowlist */}
            <section style={{ marginBottom: 32 }}>
              <h2 className="bw-display" style={{ fontSize: 16, marginBottom: 4 }}>Teacher allowlist</h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 16 }}>
                Only emails (or whole staff domains) on this list can register as teachers. Admins can
                add entries, grant or revoke admin rights, and remove entries. Pupils never appear
                here — they join with a class code.
              </p>

              <form onSubmit={add} className="bw-card" style={{ padding: 16, marginBottom: 18, display: "grid", gap: 12 }}>
                <div className="bw-section-label">Add teacher email or domain</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    type="text"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="jane@kesw.org  or  *@kesw.org"
                    style={inputStyle}
                  />
                  <label className="flex items-center gap-2" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    <input type="checkbox" checked={newAdmin} onChange={(e) => setNewAdmin(e.target.checked)} />
                    Make admin
                  </label>
                  <button type="submit" className="bw-btn-primary flex items-center" disabled={busy === "add"} style={{ gap: 6, fontSize: 13 }}>
                    {busy === "add" ? <Loader2 size={14} className="bw-spin" /> : <Plus size={14} />} Add
                  </button>
                </div>
                {msg && <div style={{ fontSize: 12, color: "var(--color-crimson)" }}>{msg}</div>}
              </form>

              <div className="bw-card" style={{ padding: 0, overflow: "hidden" }}>
                <RowHead cols={["Email / domain", "Type", "Admin", ""]} />
                {entries.length === 0 ? (
                  <Empty label="No entries yet." />
                ) : (
                  entries.map((e) => (
                    <div key={e.email} style={rowStyle}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, wordBreak: "break-all" }}>{e.email}</span>
                      <span style={mutedCell}>{e.wildcard ? "domain" : "email"}</span>
                      <button
                        type="button"
                        onClick={() => toggleAdmin(e)}
                        disabled={busy === "toggle:" + e.email}
                        title={e.isAdmin ? "Revoke admin" : "Grant admin"}
                        style={{
                          background: "transparent",
                          border: "1px solid var(--line)",
                          borderRadius: 999,
                          padding: "2px 10px",
                          cursor: "pointer",
                          fontSize: 12,
                          color: e.isAdmin ? "var(--color-gold-500)" : "var(--text-muted)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <ShieldCheck size={12} /> {e.isAdmin ? "admin" : "grant"}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(e)}
                        disabled={e.email.toLowerCase() === myEmail || busy === "remove:" + e.email}
                        title={e.email.toLowerCase() === myEmail ? "You can't remove yourself" : "Remove"}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: e.email.toLowerCase() === myEmail ? "not-allowed" : "pointer",
                          color: e.email.toLowerCase() === myEmail ? "var(--line)" : "var(--color-crimson)",
                          opacity: e.email.toLowerCase() === myEmail ? 0.5 : 1,
                          padding: 4,
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Teacher roster */}
            <section>
              <h2 className="bw-display flex items-center" style={{ fontSize: 16, marginBottom: 4, gap: 8 }}>
                <Users size={16} /> Registered teachers
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}>
                  {teachers.length}
                </span>
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 16 }}>
                Teachers who have registered an account. Read-only — accounts are created when a
                teacher signs up with an allowlisted email.
              </p>
              {rosterMsg && (
                <div style={{ fontSize: 12, color: "var(--text-muted)", background: "rgba(181,138,60,0.08)", padding: "8px 10px", borderRadius: 6, marginBottom: 12 }}>
                  {rosterMsg}
                </div>
              )}
              <div className="bw-card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={teacherHead}>
                  <span>Name</span>
                  <span>Email</span>
                  <span>School</span>
                  <span>Admin</span>
                  <span>Password</span>
                </div>
                {teachers.length === 0 ? (
                  <Empty label="No teachers have registered yet." />
                ) : (
                  teachers.map((t) => (
                    <div key={t.id} style={teacherRowStyle}>
                      <span style={{ fontSize: 13 }}>{t.displayName || "—"}</span>
                      <span style={{ ...mutedCell, fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>{t.email}</span>
                      <span style={mutedCell}>{t.school || "—"}</span>
                      <span style={{ fontSize: 12 }}>
                        {t.isAdmin ? (
                          <span className="flex items-center" style={{ gap: 4, color: "var(--color-gold-500)" }}>
                            <ShieldCheck size={12} /> admin
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => resetTeacherPassword(t)}
                        disabled={!t.email || busy === "reset:" + t.id}
                        title="Send a password-reset email"
                        style={{
                          background: "transparent",
                          border: "1px solid var(--line)",
                          borderRadius: 6,
                          padding: "3px 8px",
                          cursor: "pointer",
                          fontSize: 12,
                          color: "var(--text-muted)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {busy === "reset:" + t.id ? <Loader2 size={12} className="bw-spin" /> : <KeyRound size={12} />} Reset
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  flex: "1 1 240px",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 6,
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 14,
  fontFamily: "var(--font-mono)",
};
const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.4fr 0.7fr auto auto",
  gap: 12,
  padding: "10px 16px",
  borderBottom: "1px solid var(--line)",
  alignItems: "center",
};
const mutedCell: React.CSSProperties = { color: "var(--text-muted)", fontSize: 12 };

const TEACHER_COLS = "1.2fr 1.6fr 0.8fr auto auto";
const teacherRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: TEACHER_COLS,
  gap: 12,
  padding: "10px 16px",
  borderBottom: "1px solid var(--line)",
  alignItems: "center",
};
const teacherHead: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: TEACHER_COLS,
  gap: 12,
  padding: "10px 16px",
  borderBottom: "1px solid var(--line)",
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  fontWeight: 600,
};

function RowHead({ cols }: { cols: string[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 0.7fr auto auto",
        gap: 12,
        padding: "10px 16px",
        borderBottom: "1px solid var(--line)",
        fontSize: 10,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        fontWeight: 600,
      }}
    >
      {cols.map((c, i) => (
        <span key={i}>{c}</span>
      ))}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div style={{ padding: 16, fontSize: 14, color: "var(--text-muted)" }}>{label}</div>;
}
