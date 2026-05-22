// Voice I/O public surface. British English only (project memory).
export {
  speakBritish,
  stopSpeaking,
  speechOutputAvailable,
  speechInputAvailable,
  startBritishDictation,
  loadVoices,
  type Dictation,
} from "./browser";
export { pickBritishVoice, hasBritishVoice, type VoiceLike } from "./select";

import { speakBritish, stopSpeaking } from "./browser";

let currentAudio: HTMLAudioElement | null = null;

// Speak text aloud in a British voice. Tries the production ElevenLabs
// route first (when configured); otherwise falls back to the browser's
// en-GB Web Speech voice. Returns true if something spoke.
export async function speak(text: string): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return false;

  stopAll();
  try {
    const r = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed }),
    });
    if (r.ok) {
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;
      audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
      await audio.play();
      return true;
    }
    // 503 (not configured) / any non-OK → browser fallback.
  } catch {
    // network error → browser fallback
  }
  return speakBritish(trimmed);
}

export function stopAll(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  stopSpeaking();
}
