// Browser voice I/O — Web Speech API. British English only.
//
// Output: window.speechSynthesis with a strictly en-GB voice (see
// pickBritishVoice). If the platform has no British voice we DO NOT speak
// (returning false) rather than fall back to American.
// Input: webkitSpeechRecognition / SpeechRecognition with lang en-GB.
//
// Recordings are never stored — the browser handles the audio and we only
// receive transcript text. This is the no-key path; ElevenLabs Flash v2.5
// (British voice) is the production upgrade via /api/tts when a key is set.

import { pickBritishVoice, hasBritishVoice, type VoiceLike } from "./select";

export function speechOutputAvailable(): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  return hasBritishVoice(window.speechSynthesis.getVoices() as unknown as VoiceLike[]);
}

// getVoices() is async-populated on some platforms; resolve once it's ready.
export function loadVoices(timeoutMs = 1500): Promise<VoiceLike[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve([]);
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing.length) return resolve(existing as unknown as VoiceLike[]);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve(synth.getVoices() as unknown as VoiceLike[]);
    };
    synth.addEventListener("voiceschanged", finish, { once: true });
    setTimeout(finish, timeoutMs);
  });
}

// Speak text in a British voice. Returns true if it spoke, false if no
// British voice is available (we never speak in a non-GB accent).
export async function speakBritish(text: string): Promise<boolean> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;

  const voices = await loadVoices();
  const voice = pickBritishVoice(voices);
  if (!voice) return false;

  const synth = window.speechSynthesis;
  synth.cancel(); // stop any in-flight utterance
  const u = new SpeechSynthesisUtterance(trimmed);
  // Re-resolve the live SpeechSynthesisVoice by name (our VoiceLike is a
  // structural subset).
  const live = synth.getVoices().find((vv) => vv.name === voice.name && /en[-_]gb/i.test(vv.lang));
  if (live) u.voice = live;
  u.lang = "en-GB";
  u.rate = 1;
  u.pitch = 1;
  synth.speak(u);
  return true;
}

export function stopSpeaking(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}

// ── Speech input (dictation) ──────────────────────────────────────────

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechInputAvailable(): boolean {
  return getRecognitionCtor() !== null;
}

export interface Dictation {
  stop: () => void;
}

// Start en-GB dictation. Calls onText with the final transcript, onEnd when
// the recogniser stops. Returns null if unsupported.
export function startBritishDictation(handlers: {
  onText: (text: string) => void;
  onEnd?: () => void;
  onError?: (e: unknown) => void;
}): Dictation | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "en-GB";
  rec.interimResults = false;
  rec.continuous = false;
  rec.onresult = (e) => {
    let text = "";
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
    }
    if (text.trim()) handlers.onText(text.trim());
  };
  rec.onerror = (err) => handlers.onError?.(err);
  rec.onend = () => handlers.onEnd?.();
  rec.start();
  return { stop: () => rec.stop() };
}
