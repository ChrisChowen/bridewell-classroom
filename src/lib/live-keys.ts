// Stable, non-reversible key from a pupil UID, used as the slot key on the
// public `liveSessions/{id}/aggregate` node that the classroom projector
// reads. The projector signs in anonymously, so its slot keys must not
// leak the raw UID. FNV-1a → 8 hex chars: deterministic per pupil (so a
// star keeps its position across snapshots), opaque, and collision-safe
// enough for a single class.
export function anonKey(uid: string): string {
  let h = 2166136261;
  for (let i = 0; i < uid.length; i++) {
    h ^= uid.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
