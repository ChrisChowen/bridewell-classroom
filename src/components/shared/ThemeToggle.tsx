"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

// Light is the default register; dark is opt-in for dim rooms. Preference
// persists across reloads.

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("bw-theme") : null;
    const initial = stored === "dark";
    setDark(initial);
    if (initial) document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.setAttribute("data-theme", "dark");
      window.localStorage.setItem("bw-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      window.localStorage.setItem("bw-theme", "light");
    }
  }

  return (
    <button
      onClick={toggle}
      className="bw-btn-secondary"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      style={{ padding: 7 }}
    >
      {dark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
