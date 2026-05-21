import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { UserMenu } from "./UserMenu";

type School = "KESW" | "Barrow Hills" | "Longacre";

// Unified top bar for teacher surfaces. Bridewell crest + wordmark on the
// left, the lesson context centred, school chip + user chip + theme toggle
// on the right. The school is configuration; Bridewell is the product.

export function TopBar({
  lessonTitle,
  lessonContext,
  teacher,
  school,
  role = "Teacher",
}: {
  lessonTitle?: string;
  lessonContext?: string;
  teacher: string;
  school: School;
  role?: string;
}) {
  return (
    <header
      className="bw-topbar"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
        alignItems: "center",
        gap: 12,
        padding: "14px clamp(14px, 4vw, 28px)",
        borderBottom: "1px solid var(--line)",
        background: "var(--surface)",
        position: "sticky",
        top: 0,
        zIndex: 30,
        backdropFilter: "saturate(180%) blur(8px)",
      }}
    >
      <div>
        <Link href="/" aria-label="Bridewell Classroom home" style={{ display: "inline-block" }}>
          <Wordmark />
        </Link>
      </div>
      <div className="bw-topbar-centre" style={{ textAlign: "center", minWidth: 0 }}>
        {lessonContext && (
          <div className="bw-section-label" style={{ marginBottom: 2 }}>{lessonContext}</div>
        )}
        {lessonTitle && (
          <div
            className="bw-display"
            style={{
              fontSize: 15,
              maxWidth: 520,
              margin: "0 auto",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {lessonTitle}
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        <UserMenu name={teacher} school={school} role={role} />
      </div>
    </header>
  );
}
