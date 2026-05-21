// User chip — top-right of teacher surfaces. The school sits here, with its
// small monogram, alongside the teacher name and initials. The school is
// configuration; Bridewell is the product (BRAND.md §Brand hierarchy).

type School = "KESW" | "Barrow Hills" | "Longacre";

export function UserChip({
  name,
  school,
  role = "Teacher",
}: {
  name: string;
  school: School;
  role?: string;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  return (
    <div className="flex items-center gap-3 bw-card" style={{ padding: "6px 10px" }}>
      <div
        aria-hidden
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          background: schoolPlate(school).background,
          color: schoolPlate(school).foreground,
          fontFamily: "var(--font-serif)",
          fontSize: 11,
          fontWeight: 600,
          display: "grid",
          placeItems: "center",
        }}
        title={school}
      >
        {schoolPlate(school).monogram}
      </div>
      <div className="flex flex-col leading-tight">
        <span style={{ fontSize: 13, fontWeight: 500 }}>{name}</span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {role} · {school}
        </span>
      </div>
      <div
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          background: "var(--color-navy-900)",
          color: "var(--color-cream-50)",
          fontSize: 11,
          fontWeight: 600,
          display: "grid",
          placeItems: "center",
        }}
      >
        {initials}
      </div>
    </div>
  );
}

function schoolPlate(school: School): { monogram: string; background: string; foreground: string } {
  switch (school) {
    case "KESW":
      return { monogram: "K", background: "var(--color-navy-900)", foreground: "var(--color-gold-500)" };
    case "Barrow Hills":
      return { monogram: "BH", background: "var(--color-crimson)", foreground: "var(--color-cream-50)" };
    case "Longacre":
      return { monogram: "L", background: "var(--color-navy-700)", foreground: "var(--color-cream-50)" };
  }
}
