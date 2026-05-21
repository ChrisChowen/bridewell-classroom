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
  const variant = statePill[state];
  const IconCmp = Icon[state];
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
