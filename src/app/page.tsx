import Link from "next/link";
import Image from "next/image";
import { Crest } from "@/components/shared/Crest";
import { Fleur } from "@/components/shared/Fleur";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

// Public homepage. Read by three audiences in order of likely visit:
//   1. Pupils joining a lesson — biggest CTA, top of fold.
//   2. Teachers signing in or registering — equal-weight CTA.
//   3. Parents and Bridewell stakeholders — informational sections below.
//
// Tone: serious classroom tool that the schools could put in front of a
// parent on day one. Not a marketing splash, not a heritage pastiche,
// not a demo deck. Bridewell-native restraint: navy, gold, crest, one
// sparing accent of Bridewell red in the trust block.

export default function Landing() {
  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <SiteHeader />
      <Hero />
      <ProductPreview />
      <Principles />
      <TrustBlock />
      <Audiences />
      <SiteFooter />
    </main>
  );
}

// ── Header ────────────────────────────────────────────────────────────

function SiteHeader() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
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
        <ThemeToggle />
        <Link href="/login" className="bw-btn-secondary">Teacher sign in</Link>
        <Link href="/join" className="bw-btn-primary">Pupil join</Link>
      </nav>
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      style={{
        maxWidth: 880,
        width: "100%",
        margin: "0 auto",
        padding: "48px 40px 32px",
        textAlign: "center",
        position: "relative",
      }}
    >
      <div
        className="flex items-center"
        style={{ gap: 10, justifyContent: "center", marginBottom: 26 }}
      >
        <Fleur size={14} />
        <span className="bw-section-label">A Bridewell AI product · since 1553</span>
        <Fleur size={14} />
      </div>

      {/* Peeking scholar — sits ABOVE the headline so it reads as poking
          over the top of the words rather than as a piece of clipart. */}
      <div
        aria-hidden
        style={{
          position: "relative",
          width: "100%",
          display: "grid",
          placeItems: "center",
          marginBottom: -10,
        }}
      >
        <Image
          src="/img/scholar-peeking.png"
          alt=""
          width={240}
          height={240}
          priority
          style={{ width: 240, height: "auto", display: "block" }}
        />
      </div>

      <h1
        className="bw-display"
        style={{
          fontSize: "clamp(40px, 6vw, 64px)",
          lineHeight: 1.02,
          letterSpacing: "-0.018em",
          margin: "0 auto",
          maxWidth: 760,
        }}
      >
        A teaching instrument
        <br />
        for the Bridewell schools.
      </h1>

      <p
        style={{
          fontSize: 18,
          lineHeight: 1.55,
          maxWidth: 620,
          margin: "22px auto 28px",
        }}
      >
        Pupils think with a calm coaching tutor. Teachers see the class in
        pattern and intervene quickly. Lessons stay anchored to the curriculum,
        approved by the teacher before pupils see them.
      </p>

      <div
        className="flex items-center"
        style={{ gap: 12, justifyContent: "center", flexWrap: "wrap" }}
      >
        <Link
          href="/join"
          className="bw-btn-primary"
          style={{ padding: "12px 20px", fontSize: 14 }}
        >
          Pupil — join with class code
        </Link>
        <Link
          href="/login"
          className="bw-btn-secondary"
          style={{ padding: "12px 20px", fontSize: 14 }}
        >
          Teacher — sign in or register
        </Link>
      </div>
    </section>
  );
}

// ── Product preview ───────────────────────────────────────────────────
// A composed view that mirrors the actual product surfaces (chat on the
// left, class view on the right) without screenshotting them. Built from
// the same brand tokens so it stays true as the product evolves.

function ProductPreview() {
  return (
    <section
      style={{
        maxWidth: 1200,
        width: "100%",
        margin: "0 auto",
        padding: "32px 40px 48px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 18,
        }}
      >
        <PupilPreviewCard />
        <TeacherPreviewCard />
      </div>
      <p
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          textAlign: "center",
          marginTop: 16,
          letterSpacing: "0.02em",
        }}
      >
        The pupil&apos;s view · The teacher&apos;s view
      </p>
    </section>
  );
}

function PupilPreviewCard() {
  return (
    <div
      className="bw-card"
      style={{
        padding: 22,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        display: "grid",
        gap: 14,
      }}
    >
      <header className="flex items-center justify-between">
        <span className="bw-section-label" style={{ color: "var(--color-gold-500)" }}>
          Pupil
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Photosynthesis · Y8</span>
      </header>

      <div style={{ display: "grid", gap: 12 }}>
        <PreviewBubble
          role="tutor"
          text="Before plants can build glucose, what do they need from outside themselves?"
        />
        <PreviewBubble
          role="pupil"
          text="Sunlight, water, and carbon dioxide?"
        />
        <PreviewBubble
          role="tutor"
          text="Good — those three. Of them, which one ends up actually getting taken apart?"
        />
      </div>

      <div className="flex items-center" style={{ gap: 6, paddingTop: 4 }}>
        {(["Hint", "Rephrase", "Simplify"] as const).map((s) => (
          <span
            key={s}
            style={{
              padding: "5px 10px",
              borderRadius: 999,
              border: "1px solid var(--line)",
              background: "var(--bg)",
              color: "var(--text-muted)",
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            {s}
          </span>
        ))}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            color: "var(--text-muted)",
            letterSpacing: "0.08em",
          }}
        >
          3 left
        </span>
      </div>
    </div>
  );
}

function TeacherPreviewCard() {
  return (
    <div
      className="bw-card"
      style={{
        padding: 22,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        display: "grid",
        gap: 14,
      }}
    >
      <header className="flex items-center justify-between">
        <span className="bw-section-label" style={{ color: "var(--color-gold-500)" }}>
          Teacher
        </span>
        <span className="flex items-center gap-2" style={{ fontSize: 11, color: "var(--text-muted)" }}>
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "var(--color-bridewell-red)",
              boxShadow: "0 0 0 3px rgba(227,6,19,0.15)",
              animation: "bw-pulse 1800ms infinite ease-in-out",
            }}
          />
          Live · 22 pupils
        </span>
      </header>

      <div style={{ display: "grid", gap: 8 }}>
        <PreviewPupilRow name="Alice M." state="flowing" tail="Working on the second example" />
        <PreviewPupilRow name="Daniel R." state="productive" tail="Asked a follow-up question" />
        <PreviewPupilRow name="Priya S." state="wheel" tail="Three scaffolds in a row" />
        <PreviewPupilRow name="Olu A." state="flowing" tail="Reason · paraphrase accepted" />
      </div>

      <div
        style={{
          paddingTop: 8,
          borderTop: "1px solid var(--line)",
          fontSize: 11,
          color: "var(--text-muted)",
        }}
      >
        Pattern · 3 pupils showing productive struggle · 1 needs attention
      </div>
    </div>
  );
}

function PreviewBubble({ role, text }: { role: "tutor" | "pupil"; text: string }) {
  const isTutor = role === "tutor";
  return (
    <div
      style={{
        background: isTutor ? "var(--bg)" : "rgba(181,138,60,0.08)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "10px 12px",
        fontSize: 13.5,
        lineHeight: 1.5,
        maxWidth: "92%",
        marginLeft: isTutor ? 0 : "auto",
        fontFamily: isTutor ? "var(--font-serif)" : "var(--font-sans)",
        color: "var(--text)",
      }}
    >
      <span
        className="bw-section-label"
        style={{
          display: "block",
          marginBottom: 4,
          fontSize: 9,
          color: isTutor ? "var(--text-muted)" : "var(--color-gold-500)",
        }}
      >
        {isTutor ? "Tutor" : "You"}
      </span>
      {text}
    </div>
  );
}

function PreviewPupilRow({
  name,
  state,
  tail,
}: {
  name: string;
  state: "flowing" | "productive" | "wheel" | "disengaged";
  tail: string;
}) {
  const stateColor = {
    flowing: "var(--color-state-flowing)",
    productive: "var(--color-state-productive)",
    wheel: "var(--color-state-wheel)",
    disengaged: "var(--color-state-disengaged)",
  }[state];
  return (
    <div
      className="flex items-center"
      style={{
        gap: 12,
        padding: "8px 10px",
        background: "var(--bg)",
        border: "1px solid var(--line)",
        borderRadius: 8,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: stateColor,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 13, fontWeight: 500, minWidth: 86 }}>{name}</span>
      {/* Tiny sparkline-ish bar — engagement trajectory hint */}
      <span
        aria-hidden
        style={{
          flex: 1,
          height: 4,
          borderRadius: 999,
          background: "var(--line)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(90deg, transparent 0%, ${stateColor} 100%)`,
            opacity: 0.55,
          }}
        />
      </span>
      <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 0, textAlign: "right" }}>
        {tail}
      </span>
    </div>
  );
}

// ── Principles ────────────────────────────────────────────────────────

function Principles() {
  return (
    <section
      style={{
        maxWidth: 1200,
        width: "100%",
        margin: "0 auto",
        padding: "48px 40px 56px",
      }}
    >
      <div className="flex items-center gap-2" style={{ marginBottom: 22 }}>
        <Fleur size={12} />
        <span className="bw-section-label">Principles</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 22,
        }}
      >
        {principles.map((p, i) => (
          <article key={p.title} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span
              className="bw-section-label"
              style={{ fontFamily: "var(--font-mono)", fontWeight: 500, letterSpacing: "0.08em" }}
            >
              0{i + 1}
            </span>
            <h3 className="bw-display" style={{ fontSize: 19, lineHeight: 1.25, margin: 0 }}>
              {p.title}
            </h3>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.65, margin: 0 }}>
              {p.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

// ── Trust block ───────────────────────────────────────────────────────
// The one place where Bridewell red appears — a small accent on the
// hyphen between the school names + the date pin. Restrained, not loud.

function TrustBlock() {
  return (
    <section
      style={{
        background: "var(--surface)",
        borderTop: "1px solid var(--line)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          width: "100%",
          margin: "0 auto",
          padding: "44px 40px",
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: 40,
          alignItems: "center",
        }}
        className="bw-trust-grid"
      >
        <div style={{ display: "grid", gap: 12 }}>
          <span className="bw-section-label">Built with the schools</span>
          <h2 className="bw-display" style={{ fontSize: 26, lineHeight: 1.2, margin: 0 }}>
            Bridewell-native, teacher-in-charge, curriculum-anchored.
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
            Bridewell Classroom is part of the Bridewell AI ecosystem already in
            production at the schools. Every lesson plan is reviewed by the
            teacher before pupils see it, every concerning disclosure is
            surfaced to the teacher immediately, and conversation data stays
            inside the schools&apos; own Firebase project.
          </p>

          <div
            className="flex items-center"
            style={{
              gap: 14,
              flexWrap: "wrap",
              fontSize: 13,
              marginTop: 4,
              color: "var(--text)",
            }}
          >
            <strong style={{ fontWeight: 600 }}>King Edward&apos;s Witley</strong>
            <span aria-hidden style={{ color: "var(--color-bridewell-red)" }}>·</span>
            <strong style={{ fontWeight: 600 }}>Barrow Hills</strong>
            <span aria-hidden style={{ color: "var(--color-bridewell-red)" }}>·</span>
            <strong style={{ fontWeight: 600 }}>Longacre</strong>
          </div>
        </div>

        <aside
          style={{
            display: "grid",
            gap: 14,
            paddingLeft: 0,
          }}
        >
          <div
            style={{
              padding: 18,
              border: "1px solid var(--line)",
              borderRadius: 10,
              background: "var(--bg)",
              display: "grid",
              gap: 6,
            }}
          >
            <span className="bw-section-label">Production partner</span>
            <strong style={{ fontWeight: 600, fontSize: 14 }}>Unified Projects</strong>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
              The consultancy that built and will inherit the production
              Bridewell AI.
            </p>
          </div>

          <div
            style={{
              padding: 18,
              border: "1px solid var(--line)",
              borderRadius: 10,
              background: "var(--bg)",
              display: "grid",
              gap: 6,
            }}
          >
            <span className="bw-section-label">CDT Spring Challenge</span>
            <strong style={{ fontWeight: 600, fontSize: 14 }}>
              <span style={{ color: "var(--color-bridewell-red)" }}>29 May 2026</span>
              {" · "}
              University of Surrey
            </strong>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
              Final presentation, alongside the academic panel.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

// ── Audiences ─────────────────────────────────────────────────────────

function Audiences() {
  return (
    <section
      style={{
        maxWidth: 1200,
        width: "100%",
        margin: "0 auto",
        padding: "56px 40px 80px",
      }}
    >
      <div className="flex items-center gap-2" style={{ marginBottom: 24 }}>
        <Fleur size={12} />
        <span className="bw-section-label">For each audience</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {audienceCards.map((c) => (
          <article
            key={c.audience}
            style={{
              padding: 24,
              border: "1px solid var(--line)",
              borderRadius: 12,
              background: "var(--surface)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <span className="bw-section-label" style={{ color: "var(--color-gold-500)" }}>
              {c.audience}
            </span>
            <h3 className="bw-display" style={{ fontSize: 20, lineHeight: 1.25, margin: 0 }}>
              {c.headline}
            </h3>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.65, margin: 0 }}>
              {c.body}
            </p>
            {c.cta && (
              <div style={{ marginTop: "auto", paddingTop: 8 }}>
                <Link
                  href={c.cta.href}
                  className="bw-btn-secondary"
                  style={{ fontSize: 13, padding: "8px 14px" }}
                >
                  {c.cta.label}
                </Link>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────

function SiteFooter() {
  return (
    <footer
      style={{
        marginTop: "auto",
        borderTop: "1px solid var(--line)",
        padding: "22px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 12,
        color: "var(--text-muted)",
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      <span className="flex items-center gap-3">
        <Crest size={20} />
        <span>
          Bridewell Royal Hospital schools · King Edward&apos;s Witley · Barrow Hills · Longacre
        </span>
      </span>
      <span style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
        v0.1 · 21 May 2026
      </span>
    </footer>
  );
}

// ── Data ──────────────────────────────────────────────────────────────

const principles = [
  {
    title: "Coaching, not answering",
    body: "Real LLM calls in coach mode by default. Hint, Rephrase, and Simplify scaffold the tutor's prior turn — never the pupil's thinking.",
  },
  {
    title: "Patterns, not alerts",
    body: "Five named engagement states from the productive-struggle literature, classified live and surfaced as a calm sparkline. Teachers act on a pattern, not a notification.",
  },
  {
    title: "Reason, as a moment",
    body: "An inline probing interaction, not a fourth button. It generates evidence of understanding without raising an alert to the pupil mid-thought.",
  },
  {
    title: "Safeguarding from turn one",
    body: "If a pupil discloses something concerning, the AI surfaces it to the teacher immediately with the verbatim message. The pupil never sees a verdict.",
  },
];

const audienceCards: {
  audience: string;
  headline: string;
  body: string;
  cta?: { label: string; href: "/join" | "/login" };
}[] = [
  {
    audience: "For pupils",
    headline: "A tutor that asks you to think.",
    body: "Your tutor will not hand you the answer. It coaches you with one question at a time, and gives you a hint, a rephrase, or a simpler explanation if you get stuck. Log in with the code your teacher displays — no email needed.",
    cta: { label: "Join with class code", href: "/join" },
  },
  {
    audience: "For teachers",
    headline: "Set up a lesson by describing it.",
    body: "Pick a topic from the curriculum library, write a sentence about what you want pupils to come away with, and the AI drafts a lesson plan you review and approve. See the whole class in pattern, intervene in two clicks.",
    cta: { label: "Sign in or register", href: "/login" },
  },
  {
    audience: "For parents and the school",
    headline: "Bridewell-aligned, curriculum-anchored.",
    body: "Lessons are anchored to the UK National Curriculum, the teacher approves every plan before pupils see it, and disclosures of concern are surfaced to the teacher immediately. Conversation data stays inside the schools' own infrastructure.",
  },
];
