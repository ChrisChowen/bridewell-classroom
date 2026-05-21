// Six-character human-friendly join codes. Letters + digits, with
// confusable characters (0, O, I, 1, L) removed so a pupil typing one off
// the board has fewer ways to fat-finger it.

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateJoinCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  // Format as XXX-XXX for legibility on a projector.
  return `${out.slice(0, 3)}-${out.slice(3)}`;
}

export function normaliseJoinCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6)
    .replace(/(.{3})(.{1,3})/, "$1-$2");
}
