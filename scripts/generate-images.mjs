#!/usr/bin/env node
// Generate branded illustrations via Gemini's image model. One-shot —
// run when you want to refresh the imagery. Saves to public/img/.
//
// Style is intentionally calm and editorial: muted navy + gold, no
// AI-stockphoto vibes, no people, no marketing splash. Each prompt is
// kept small and specific so the brand register stays consistent.

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
);
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const outDir = resolve(__dirname, "../public/img");
mkdirSync(outDir, { recursive: true });

const BRAND = `
Visual register: calm, editorial, restrained. Navy (#0D2A4A) as the dominant
tone, warm gold (#B58A3C) as a secondary accent, soft cream (#FAF6EE) for the
background. No people. No screenshots. No marketing language or text in the
image. The mood is "calm classroom instrument", not a tech ad.

Avoid: skeuomorphic 3D, glowing screens, neon, magenta, purple, hand-drawn
sketchy lines, photographic stock imagery, generic SaaS gradients, vector
clip-art people.
`;

const targets = [
  {
    name: "hero-classroom",
    prompt: `${BRAND}

A horizontal editorial illustration suggesting a quiet classroom moment.
Soft geometric shapes: a long wooden desk seen from a slight three-quarter
angle, a closed leather-bound notebook with a small gold ribbon, a brass
desk lamp casting a warm pool of light, a single cup of tea, and an
abstract suggestion of a window with daylight. No people. Limited
palette — deep navy as the dominant ground, warm gold highlights, cream
mid-tones. Soft printed-book texture. Slightly muted, slightly dignified.
Aspect ratio 16:9. No text.`,
  },
  {
    name: "empty-classes",
    prompt: `${BRAND}

A small editorial illustration of a single empty wooden classroom desk
with a closed slim notebook, a fountain pen resting beside it, and a
small fleur-de-lis emblem subtly embossed on the cover. Calm warm
lighting. Three-quarter angle. Limited palette navy / gold / cream.
No people. No text. Square aspect.`,
  },
];

for (const t of targets) {
  console.log(`\n→ ${t.name}`);
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: t.prompt,
  });
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    console.error(`  ✗ no image data returned. Text part: ${parts.find((p) => p.text)?.text?.slice(0, 200)}`);
    continue;
  }
  const buf = Buffer.from(imagePart.inlineData.data, "base64");
  const outPath = resolve(outDir, `${t.name}.png`);
  writeFileSync(outPath, buf);
  console.log(`  ✓ ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
}
