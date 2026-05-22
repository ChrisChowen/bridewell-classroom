import { NextResponse } from "next/server";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// POST /api/tts — production British text-to-speech via ElevenLabs Flash
// v2.5. DORMANT until ELEVENLABS_API_KEY is configured: returns 503 so the
// client falls back to the browser's en-GB Web Speech voice (see
// src/lib/voice/browser.ts). This documents + reserves the production
// upgrade path without requiring a key for the pilot.
//
// British-only constraint (project memory): ELEVENLABS_VOICE_ID must be a
// British English voice. We never synthesise an American voice.
//
// Body: { text: string }
// Returns: audio/mpeg stream, or 503 { error: "tts_not_configured" }.

const ELEVEN_MODEL = "eleven_flash_v2_5";
// Default to a British ElevenLabs voice ("George"). Override via env to
// pick another British voice from the account.
const DEFAULT_BRITISH_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, RATE_LIMITS.tts);
  if (limited) return limited;

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error: "tts_not_configured",
        detail: "Set ELEVENLABS_API_KEY (+ optional ELEVENLABS_VOICE_ID, must be British) to enable production TTS. The client falls back to the browser's British voice meanwhile.",
      },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim();
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  if (text.length > 800) {
    return NextResponse.json({ error: "text too long", limit: 800 }, { status: 413 });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_BRITISH_VOICE_ID;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: ELEVEN_MODEL,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!r.ok) {
    // Auth (401) / quota (429) / payment (402) mean the provider can't
    // serve us right now — that's "unavailable", not a server fault. Return
    // 503 so the client treats it exactly like the no-key path and falls
    // back to the browser British voice, and so it doesn't read as a 5xx
    // bug in logs. Other upstream failures are genuine 502s.
    const unavailable = r.status === 401 || r.status === 402 || r.status === 429;
    return NextResponse.json(
      { error: unavailable ? "tts_unavailable" : "tts_upstream_error", status: r.status },
      { status: unavailable ? 503 : 502 },
    );
  }

  return new NextResponse(r.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
