// British-voice selection — the load-bearing rule for voice output.
//
// HARD CONSTRAINT (project memory): TTS must be British English. An
// American voice is unacceptable, even as a placeholder. So this picks the
// best en-GB voice from the platform's available voices and returns null
// if none exists — callers must NOT fall back to a non-GB voice; they
// either speak in en-GB or stay silent.
//
// Pure (operates on a plain list), so it's unit-testable without a browser.

// Minimal shape we depend on from SpeechSynthesisVoice — keeps this file
// testable with plain objects.
export interface VoiceLike {
  name: string;
  lang: string; // BCP-47, e.g. "en-GB"
  default?: boolean;
  localService?: boolean;
}

// Names known to be high-quality British voices across platforms, ranked.
// Used only to BREAK TIES among en-GB voices — never to admit a non-GB one.
const PREFERRED_GB_NAMES = [
  "Google UK English Female",
  "Google UK English Male",
  "Daniel", // macOS/iOS en-GB
  "Kate",
  "Serena",
  "Arthur",
  "Martha",
];

function isBritish(lang: string): boolean {
  // Normalise "en_GB", "en-GB", "en-gb" → match en-GB only.
  return /^en[-_]gb$/i.test(lang.trim());
}

// Returns the best en-GB voice, or null if the platform has none.
export function pickBritishVoice(voices: VoiceLike[]): VoiceLike | null {
  const gb = voices.filter((v) => isBritish(v.lang));
  if (gb.length === 0) return null;

  // Prefer a known-good named voice, in rank order.
  for (const name of PREFERRED_GB_NAMES) {
    const hit = gb.find((v) => v.name === name);
    if (hit) return hit;
  }
  // Otherwise prefer a remote (usually higher quality) then the default.
  const remote = gb.find((v) => v.localService === false);
  if (remote) return remote;
  const dflt = gb.find((v) => v.default);
  return dflt ?? gb[0];
}

// Whether the platform can satisfy the British-only constraint at all.
export function hasBritishVoice(voices: VoiceLike[]): boolean {
  return voices.some((v) => isBritish(v.lang));
}
