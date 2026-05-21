import Image from "next/image";
import Link from "next/link";
import { Crest } from "@/components/shared/Crest";
import { Fleur } from "@/components/shared/Fleur";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

// Public homepage. Audiences in order of likely first contact:
//   1. Pupils joining a lesson — biggest CTA, top of fold.
//   2. Teachers signing in or registering — second CTA, equally prominent.
//   3. Parents and Bridewell stakeholders — informational sections below.
// Tone: serious classroom tool, not a marketing splash. Bridewell-native.

export default function Landing() {
  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 40px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div className="flex items-center gap-3">
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
        </div>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="bw-btn-secondary">Teacher sign in</Link>
          <Link href="/join" className="bw-btn-primary">Pupil join</Link>
        </nav>
      </header>

      {/* Hero */}
      <section
        style={{
          maxWidth: 1180,
          width: "100%",
          margin: "0 auto",
          padding: "64px 40px 32px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          gap: 56,
          alignItems: "center",
        }}
      >
        <div>
          <div className="flex items-center gap-2" style={{ marginBottom: 22 }}>
            <Fleur size={14} />
            <span className="bw-section-label">A Bridewell AI product · since 1553</span>
          </div>
          <h1
            className="bw-display"
            style={{
              fontSize: 54,
              lineHeight: 1.05,
              letterSpacing: "-0.015em",
              maxWidth: 640,
              marginBottom: 22,
            }}
          >
            A teaching instrument
            <br />
            for the Bridewell schools.
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.55, maxWidth: 580, marginBottom: 14 }}>
            Bridewell Classroom is the in-lesson AI tutor for King Edward’s
            Witley, Barrow Hills, and Longacre. Pupils think with a calm
            coaching tutor. Teachers see the class in pattern, intervene
            quickly, and stay in charge of what is being learned.
          </p>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.55,
              maxWidth: 580,
              color: "var(--text-muted)",
              marginBottom: 30,
            }}
          >
            Built for the 29 May 2026 CDT Spring Challenge at the University of
            Surrey, alongside the production Bridewell AI work led by Unified
            Projects.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/join" className="bw-btn-primary" style={{ padding: "12px 18px", fontSize: 14 }}>
              Pupil — join with class code
            </Link>
            <Link href="/login" className="bw-btn-secondary" style={{ padding: "12px 18px", fontSize: 14 }}>
              Teacher — sign in or register
            </Link>
          </div>
        </div>

        {/* Editorial illustration — quiet, on-brand, generated via Gemini */}
        <div
          aria-hidden
          style={{
            justifySelf: "center",
            position: "relative",
            width: "100%",
            maxWidth: 420,
            aspectRatio: "1 / 1",
            borderRadius: 12,
            overflow: "hidden",
            background: "var(--surface-elev)",
            border: "1px solid var(--line)",
            boxShadow: "0 12px 32px rgba(13,42,74,0.10)",
          }}
        >
          <Image
            src="/img/hero-classroom.png"
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 420px"
            style={{ objectFit: "cover" }}
            priority
          />
        </div>
      </section>

      {/* For each audience */}
      <section
        style={{
          maxWidth: 1180,
          width: "100%",
          margin: "0 auto",
          padding: "16px 40px 32px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 18,
            borderTop: "1px solid var(--line)",
            paddingTop: 32,
          }}
        >
          {audienceCards.map((c) => (
            <div key={c.audience} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span
                className="bw-section-label"
                style={{ color: "var(--color-gold-500)" }}
              >
                {c.audience}
              </span>
              <h2 className="bw-display" style={{ fontSize: 19, lineHeight: 1.3 }}>{c.headline}</h2>
              <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6 }}>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — calm, not marketing */}
      <section
        style={{
          maxWidth: 1180,
          width: "100%",
          margin: "0 auto",
          padding: "32px 40px 80px",
        }}
      >
        <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
          <Fleur size={12} />
          <span className="bw-section-label">How it works</span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 18,
          }}
        >
          {pillars.map((p, i) => (
            <div key={p.title} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span
                className="bw-section-label"
                style={{ fontFamily: "var(--font-mono)", fontWeight: 500, letterSpacing: "0.08em" }}
              >
                0{i + 1}
              </span>
              <h3 className="bw-display" style={{ fontSize: 17, lineHeight: 1.3 }}>{p.title}</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer
        style={{
          marginTop: "auto",
          borderTop: "1px solid var(--line)",
          padding: "18px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
          color: "var(--text-muted)",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <span>
          A Bridewell Royal Hospital school product · King Edward’s Witley · Barrow Hills · Longacre
        </span>
        <span style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
          v0.1 · 21 May 2026
        </span>
      </footer>
    </main>
  );
}

const audienceCards = [
  {
    audience: "For pupils",
    headline: "A tutor that asks you to think.",
    body: "Your tutor will not hand you the answer. It coaches you with one question at a time, and gives you a hint, a rephrase, or a simpler explanation if you get stuck. You log in with the code your teacher displays — no email needed.",
  },
  {
    audience: "For teachers",
    headline: "Set up a lesson by describing it.",
    body: "Choose a topic from the UK KS3 library, write a sentence about what you want pupils to come away with, and the AI drafts a lesson plan you review and approve. Pupils join with a six-character code. You see the class in pattern and can step in when a pupil needs you.",
  },
  {
    audience: "For parents and the school",
    headline: "Bridewell-aligned, teacher-in-charge.",
    body: "Bridewell Classroom is part of the Bridewell AI ecosystem already in production at the schools. Lessons are anchored to the UK National Curriculum, the teacher approves every plan before pupils see it, and disclosures of concern are surfaced to the teacher immediately. Conversation data stays inside the schools’ Firebase, not on a third party.",
  },
];

const pillars = [
  {
    title: "A coaching tutor, not an answer machine",
    body: "Real Gemini calls in coach mode by default. Hint, Rephrase, and Simplify scaffold the tutor’s prior turn, not the pupil’s thinking.",
  },
  {
    title: "Engagement read in pattern",
    body: "Five named states from the productive-struggle literature, classified live, surfaced as a sparkline on the teacher dashboard.",
  },
  {
    title: "Reason, as an interaction",
    body: "An inline probing moment, not a fourth button. Generates evidence of understanding without raising an alert to the pupil.",
  },
  {
    title: "Safeguarding built in",
    body: "If a pupil discloses something concerning, the AI surfaces it to the teacher immediately with the verbatim message. The pupil never sees a verdict.",
  },
];
