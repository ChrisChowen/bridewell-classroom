// The Bridewell Scholar — brand mascot. Generated via the heraldic
// pipeline in `scripts/generate-images.mjs`, then chroma-keyed to
// transparent. Lives only on brand surfaces (homepage hero, login,
// empty states) — never in the chat thread (CLAUDE.md §A: the tutor is
// a tool, not a buddy).
//
// Poses available: "reading" (default), "thinking", "teaching". All
// three are illustrated from the same character so the figure stays
// consistent across surfaces. Regenerate via:
//   node scripts/generate-images.mjs scholar-*

import Image from "next/image";

type Pose = "reading" | "thinking" | "teaching";

const POSE_SRC: Record<Pose, string> = {
  reading: "/img/scholar-reading.png",
  thinking: "/img/scholar-thinking.png",
  teaching: "/img/scholar-teaching.png",
};

export function Scholar({
  size = 240,
  pose = "reading",
  title = "",
}: {
  size?: number;
  pose?: Pose;
  title?: string;
}) {
  // bw-scholar-frame gives a cream disc backdrop in dark mode so the
  // chroma-key fringe doesn't read as halo against navy. Light mode
  // leaves the artwork bare.
  return (
    <span className="bw-scholar-frame">
      <Image
        src={POSE_SRC[pose]}
        alt={title}
        width={size}
        height={size}
        style={{ width: size, height: "auto", display: "block" }}
        priority={pose === "reading"}
      />
    </span>
  );
}
