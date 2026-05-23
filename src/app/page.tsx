import Link from "next/link";
import Image from "next/image";
import { Crest } from "@/components/shared/Crest";
import { Fleur } from "@/components/shared/Fleur";
import { HomepageHeader } from "@/components/shared/HomepageHeader";

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
      <HomepageHeader />
      <Hero />
      <ProductPreview />
      <Principles />
      <TrustBlock />
      <Audiences />
      <SiteFooter />
    </main>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      className="bw-pad-fluid"
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
        <span className="bw-section-label">Bridewell Classroom</span>
        <Fleur size={14} />
      </div>

      {/* Peeking scholar — sits ABOVE the headline so it reads as poking
          over the top of the words rather than as a piece of clipart.
          bw-scholar-peeking applies a soft cream radial-fade in dark
          mode so the chroma-key fringe doesn't show against navy. */}
      <div
        aria-hidden
        className="bw-scholar-peeking"
        style={{
          position: "relative",
          width: "fit-content",
          margin: "0 auto",
          display: "grid",
          placeItems: "center",
          marginBottom: -10,
        }}
      >
        <Image
          src="/img/scholar-peeking.webp"
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
          maxWidth: 580,
          margin: "22px auto 28px",
        }}
      >
        An in-lesson AI tutor that coaches pupils to think, and a teacher view
        that shows the whole class at once.
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
// Composed example of the product surfaces (pupil chat on the left,
// teacher class view on the right). Built from the same brand tokens
// so it stays true as the product evolves. Framed explicitly as an
// "Example" so a visitor can't mistake it for a live data feed of real
// pupils.

function ProductPreview() {
  return (
    <section
      className="bw-pad-fluid"
      style={{
        maxWidth: 1200,
        width: "100%",
        margin: "0 auto",
        padding: "16px 40px 48px",
      }}
    >
      <div
        className="flex items-center"
        style={{
          gap: 10,
          marginBottom: 16,
          justifyContent: "center",
        }}
      >
        <Fleur size={12} />
        <span className="bw-section-label">A look at the lesson</span>
      </div>

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
          fontSize: 11,
          color: "var(--text-muted)",
          textAlign: "center",
          marginTop: 14,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        Illustrative example · not a live class
      </p>
    </section>
  );
}

// Small reusable badge that sits inside each preview card so neither
// can be misread as a live data feed.
function ExampleTag() {
  return (
    <span
      style={{
        fontSize: 9,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        fontWeight: 700,
        color: "var(--text-muted)",
        padding: "3px 8px",
        border: "1px solid var(--line)",
        borderRadius: 999,
        background: "var(--bg)",
      }}
    >
      Example
    </span>
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
        <span className="flex items-center gap-2">
          <span className="bw-section-label" style={{ color: "var(--color-gold-text)" }}>
            What pupils see
          </span>
          <ExampleTag />
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
        <span className="flex items-center gap-2">
          <span className="bw-section-label" style={{ color: "var(--color-gold-text)" }}>
            What teachers see
          </span>
          <ExampleTag />
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Y8 Biology · class of four</span>
      </header>

      <div style={{ display: "grid", gap: 8 }}>
        <PreviewPupilRow name="Pupil A" state="flowing" tail="Working through the example" />
        <PreviewPupilRow name="Pupil B" state="productive" tail="Following up with a question" />
        <PreviewPupilRow name="Pupil C" state="wheel" tail="Could use a nudge from the teacher" />
        <PreviewPupilRow name="Pupil D" state="flowing" tail="Explained it back in their own words" />
      </div>

      <div
        style={{
          paddingTop: 8,
          borderTop: "1px solid var(--line)",
          fontSize: 12,
          color: "var(--text-muted)",
          lineHeight: 1.5,
        }}
      >
        The whole class at a glance, so the teacher can spot who&apos;s
        flowing and who needs them.
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
          color: isTutor ? "var(--text-muted)" : "var(--color-gold-text)",
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
      className="bw-pad-fluid"
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
// A calm strip with the three schools. The one place where Bridewell red
// appears on the page — as the small separator between school names.

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
        className="bw-pad-fluid"
        style={{
          maxWidth: 980,
          width: "100%",
          margin: "0 auto",
          padding: "48px 40px",
          textAlign: "center",
          display: "grid",
          gap: 14,
        }}
      >
        <span
          className="bw-section-label"
          style={{ justifySelf: "center" }}
        >
          Built with the Bridewell schools
        </span>
        <h2
          className="bw-display"
          style={{
            fontSize: 28,
            lineHeight: 1.2,
            margin: "0 auto",
            maxWidth: 720,
          }}
        >
          Teacher-in-charge, curriculum-anchored, in the classroom every day.
        </h2>
        <p
          style={{
            fontSize: 14.5,
            color: "var(--text-muted)",
            lineHeight: 1.7,
            margin: "0 auto",
            maxWidth: 620,
          }}
        >
          Lesson plans are reviewed and approved by the teacher before pupils
          see them. Conversations stay inside the schools&apos; own
          infrastructure. Concerning disclosures reach the teacher straight
          away.
        </p>

        <div
          className="flex items-center"
          style={{
            gap: 14,
            flexWrap: "wrap",
            justifyContent: "center",
            fontSize: 13.5,
            marginTop: 10,
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
    </section>
  );
}

// ── Audiences ─────────────────────────────────────────────────────────

function Audiences() {
  return (
    <section
      className="bw-pad-fluid"
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
            <span className="bw-section-label" style={{ color: "var(--color-gold-text)" }}>
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
      className="bw-pad-fluid"
      style={{
        marginTop: "auto",
        borderTop: "1px solid var(--line)",
        padding: "22px 40px 18px",
        fontSize: 12,
        color: "var(--text-muted)",
      }}
    >
      <div
        className="flex items-center"
        style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}
      >
        <span className="flex items-center gap-3">
          <Crest size={20} />
          <span>
            Bridewell Royal Hospital schools · King Edward&apos;s Witley ·
            Barrow Hills · Longacre
          </span>
        </span>
        <span className="flex items-center" style={{ gap: 16 }}>
          <a
            href="https://github.com/ChrisChowen/bridewell-classroom"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "inherit",
              textDecoration: "none",
              borderBottom: "1px dotted var(--line)",
              paddingBottom: 1,
            }}
          >
            Source on GitHub
          </a>
          <span style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
            v0.1
          </span>
        </span>
      </div>

      {/* Project-context line. Kept here, not in the body, so the site
          reads as a product first; the academic/industry framing is
          available for anyone who scrolls all the way down. */}
      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px dashed var(--line)",
          fontSize: 11,
          // No opacity here — it composited the muted text below WCAG AA on
          // the navy band. The on-navy token already reads as secondary.
          letterSpacing: "0.01em",
        }}
      >
        Developed alongside Unified Projects, partner of the Bridewell AI
        programme. Presented at the CDT Spring Challenge, University of
        Surrey, May 2026.
      </div>
    </footer>
  );
}

// ── Data ──────────────────────────────────────────────────────────────

const principles = [
  {
    title: "Pupils do the thinking",
    body: "The tutor asks questions instead of answering them. When a pupil's stuck, three calm scaffolds nudge them forward without giving the answer away.",
  },
  {
    title: "Shape of the room, at a glance",
    body: "Every pupil's engagement, on one screen. Teachers see who's flowing, who's struggling productively, and who needs them — without notifications going off.",
  },
  {
    title: "Quiet checks for understanding",
    body: "At natural moments the tutor asks the pupil to put the idea in their own words. That answer tells the teacher whether it's landed, without breaking the lesson.",
  },
  {
    title: "Safeguarding, built in",
    body: "If a pupil writes something the teacher should see, the teacher sees it. The pupil keeps their conversation; the teacher gets the context, immediately.",
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
    body: "Your tutor coaches you with one question at a time. If you get stuck, a hint, a rephrase, or a simpler explanation is one tap away. Join with the code your teacher displays — no email, no account to set up.",
    cta: { label: "Join with class code", href: "/join" },
  },
  {
    audience: "For teachers",
    headline: "Build a lesson by describing it.",
    body: "Pick a topic, write a sentence about what you want pupils to learn, and your lesson plan is ready to review. Run the lesson, see the whole class at once, step in when a pupil needs you.",
    cta: { label: "Sign in or register", href: "/login" },
  },
  {
    audience: "For parents and the school",
    headline: "On the curriculum, in the teacher's hands.",
    body: "Lessons are written against the UK National Curriculum and approved by the teacher before pupils see them. Concerning disclosures reach the teacher immediately. Pupil conversations stay inside the schools' own systems.",
  },
];
