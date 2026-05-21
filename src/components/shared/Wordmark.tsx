import { Crest } from "./Crest";

// Product wordmark lockup — Bridewell crest on the left, "Bridewell Classroom"
// to its right. "Bridewell" in roman display serif; "Classroom" set in tracked
// small-caps sans beneath (BRAND.md §Typography — the second of the two
// recommended treatments). The Bridewell mark is primary; "Classroom" is
// the product line.

export function Wordmark({
  size = "default",
  showSubmark = true,
}: {
  size?: "default" | "landing";
  showSubmark?: boolean;
}) {
  const crestSize = size === "landing" ? 44 : 32;
  const mainSize = size === "landing" ? 28 : 20;
  const subSize = size === "landing" ? 11 : 10;
  return (
    <div className="flex items-center gap-3" aria-label="Bridewell Classroom">
      <Crest size={crestSize} />
      <div className="flex flex-col leading-none">
        <span
          className="bw-display"
          style={{ fontSize: `${mainSize}px`, color: "var(--text)" }}
        >
          Bridewell
        </span>
        {showSubmark && (
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: `${subSize}px`,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginTop: 4,
            }}
          >
            Classroom
          </span>
        )}
      </div>
    </div>
  );
}
