"use client";

// Click-to-open account menu. Trigger is the existing UserChip (school
// monogram + name + initials disc); the dropdown carries the
// account-level actions that used to be scattered or missing:
// Dashboard, theme toggle, sign out. Designed so the user always knows
// where to find Sign out without hunting the page.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Sun, Moon, ShieldCheck } from "lucide-react";
import { UserChip } from "./UserChip";
import { useAuth } from "@/lib/firebase/auth-context";
import { getFirebase } from "@/lib/firebase/client";

type School = "KESW" | "Barrow Hills" | "Longacre";

export function UserMenu({
  name,
  school,
  role = "Teacher",
}: {
  name: string;
  school: School;
  role?: string;
}) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  // null = not yet checked. We probe the admin API once (the first time
  // the menu opens) and only reveal the Admin link if it returns 200 —
  // the API is the real gate, this just hides the link from non-admins.
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { signOut } = useAuth();

  useEffect(() => {
    if (!open || isAdmin !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const fb = getFirebase();
        if (!fb.ready || !fb.auth.currentUser) {
          if (!cancelled) setIsAdmin(false);
          return;
        }
        const t = await fb.auth.currentUser.getIdToken();
        const r = await fetch("/api/admin/allowlist", { headers: { Authorization: `Bearer ${t}` } });
        if (!cancelled) setIsAdmin(r.ok);
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, isAdmin]);

  // Mirror the current data-theme so the toggle label/icon matches reality.
  // Re-read on open (not just mount) in case the theme changed elsewhere.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
  }, [open]);

  // Close on outside click + Escape — standard popover behaviour.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggleTheme() {
    // Read the LIVE attribute, not the (possibly stale) mounted state — the
    // theme can be changed by the homepage ThemeToggle or another tab, which
    // would otherwise make this flip to the wrong value.
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("bw-theme", next);
    } catch {
      /* noop */
    }
  }

  async function handleSignOut() {
    setOpen(false);
    try {
      await signOut();
    } finally {
      router.push("/");
    }
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          borderRadius: 8,
        }}
      >
        <UserChip name={name} school={school} role={role} />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 240,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(15, 26, 46, 0.16)",
            padding: 6,
            zIndex: 50,
            display: "grid",
            gap: 2,
          }}
        >
          <MenuHeader name={name} school={school} role={role} />
          <Divider />
          <MenuItem href="/dashboard" icon={<LayoutDashboard size={14} />} label="Dashboard" onClick={() => setOpen(false)} />
          {isAdmin && (
            <MenuItem href="/admin" icon={<ShieldCheck size={14} />} label="Admin" onClick={() => setOpen(false)} />
          )}
          <Divider />
          <MenuButton
            icon={theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            label={theme === "dark" ? "Light theme" : "Dark theme"}
            onClick={toggleTheme}
          />
          <Divider />
          <MenuButton
            icon={<LogOut size={14} />}
            label="Sign out"
            onClick={handleSignOut}
            danger
          />
        </div>
      )}
    </div>
  );
}

function MenuHeader({ name, school, role }: { name: string; school: School; role: string }) {
  return (
    <div style={{ padding: "8px 10px 4px" }}>
      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{name}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
        {role} · {school}
      </div>
    </div>
  );
}

function Divider() {
  return <div aria-hidden style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />;
}

function MenuItem({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  // Cast — Next.js typed routes only knows specific literals. The strings
  // we pass here are real routes ("/dashboard"), narrowing on the call
  // site would clutter the menu for no real safety win.
  return (
    <Link
      href={href as never}
      onClick={onClick}
      role="menuitem"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 6,
        fontSize: 13,
        color: "var(--text)",
        textDecoration: "none",
        transition: "background 120ms ease",
      }}
      className="bw-menu-item"
    >
      {icon}
      {label}
    </Link>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      className="bw-menu-item"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 6,
        fontSize: 13,
        color: danger ? "var(--color-crimson)" : "var(--text)",
        background: "transparent",
        border: "none",
        textAlign: "left",
        width: "100%",
        cursor: "pointer",
        transition: "background 120ms ease",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
