import { Circle, CircleDashed, CircleSlash, Loader2, RotateCw } from "lucide-react";
import { statePill, type EngagementState } from "@/lib/brand";

// State pill — colour + icon + label. Never colour alone (JT raised
// colour-blindness at Checkpoint 1, BRAND.md §State colours).

const Icon = {
  flowing: Circle,
  productive_struggle: Loader2,
  wheel_spinning: RotateCw,
  disengaged: CircleDashed,
  off_task: CircleSlash,
} as const;

export function StatePill({
  state,
  size = "default",
}: {
  state: EngagementState;
  size?: "default" | "small";
}) {
  // A live node can reach us before its first classifier snapshot, with an
  // absent/unknown state. Fall back to the calm "flowing" variant rather than
  // dereferencing undefined and crashing the whole dashboard render.
  const key: EngagementState = state && state in statePill ? state : "flowing";
  const variant = statePill[key];
  const IconCmp = Icon[key];
  const isSmall = size === "small";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full"
      style={{
        background: variant.background,
        color: variant.foreground,
        padding: isSmall ? "2px 8px" : "4px 10px",
        fontSize: isSmall ? 11 : 12,
        fontWeight: 500,
        border: `1px solid ${variant.colour}33`,
      }}
      role="status"
      aria-label={variant.label}
    >
      <IconCmp size={isSmall ? 10 : 12} color={variant.colour} aria-hidden />
      <span>{variant.label}</span>
    </span>
  );
}
