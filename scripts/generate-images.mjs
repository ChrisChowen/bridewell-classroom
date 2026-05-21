#!/usr/bin/env node
// Brand-aligned illustration generator. Generates heraldic-style motifs
// that match BRAND.md (navy + gold + cream, classical-yet-modern,
// nothing that looks AI-generated). Each output is then post-processed
// with sharp to make the near-cream background transparent so the
// motifs integrate as stickers/decals rather than sitting in framed
// rectangles.
//
// Output: public/img/{name}.png — RGBA with transparent background.

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

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

// The brand block. Repeated verbatim into every prompt so style stays
// consistent across the set.
const BRAND = `
Heraldic motif in the Bridewell visual language.

Style — vector flat illustration, two-tone, no gradients, no 3D, no
shadows, no photographic textures. The execution should look like it
was drawn by a heraldic designer for a 16th century school crest — but
rendered crisply and cleanly, like a modern logo lockup. Crisp edges,
deliberate negative space, calligraphic linework. Bilateral or
near-bilateral symmetry where appropriate.

Palette — ONLY use these three colours. Do not add red, green, purple,
or any other accents:
  - deep royal navy #0D2A4A as the dominant fill or outline
  - warm Bridewell gold #B58A3C for highlights and accents
  - soft cream #FAF6EE as the background

Composition — the subject is centred, simple, iconic. No people, no
faces, no animals. No marketing language or text in the image. No
patterns or repeating ornaments. The mark should read clearly at 64px
as well as 512px.

Avoid — pixel art, watercolour, sketchy hand-drawn lines, photographic
realism, neon, glow effects, isometric 3D, magazine illustration vibes,
stock-photo people, generic SaaS gradients, anything that screams "AI
generated illustration".

Render with a clean cream #FAF6EE background. The background should be
flat with no shading, so it can be cleanly removed afterwards.
`;

const targets = [
  // Used on the homepage hero panel and small contexts where a single
  // unifying motif is needed.
  {
    name: "motif-fleur-arch",
    prompt: `${BRAND}

Subject: a single Bridewell fleur-de-lis in warm gold, set inside a
slim navy arched frame, with a delicate gold rule beneath the fleur.
Reads as one calm heraldic medallion. Centred. Aspect 1:1.`,
  },

  // For the "Welcome / set up your first class" card on the empty
  // dashboard.
  {
    name: "motif-open-book",
    prompt: `${BRAND}

Subject: a stylised open book seen straight-on, navy outline only,
with a small gold fleur-de-lis on the left page and three short gold
rules on the right page suggesting text. Symmetric. No perspective,
no shading. Iconic. Aspect 1:1.`,
  },

  // Subject motifs for the syllabus picker — one per subject. Same
  // style across all of them.
  {
    name: "motif-biology",
    prompt: `${BRAND}

Subject: a single stylised leaf with three veins, navy outline only,
with one gold detail at the stem. Symmetric. Iconic. Aspect 1:1.`,
  },
  {
    name: "motif-english",
    prompt: `${BRAND}

Subject: a quill pen crossed with a slim scroll, navy outlines with a
gold detail on the nib of the quill. Iconic. Reads as one mark.
Aspect 1:1.`,
  },
  {
    name: "motif-mathematics",
    prompt: `${BRAND}

Subject: a pair of dividers (drawing compass) opened at a 60-degree
angle over a square ruler beneath, navy outlines with one small gold
roundel at the dividers' hinge. Iconic. Aspect 1:1.`,
  },
  {
    name: "motif-history",
    prompt: `${BRAND}

Subject: a partly-unrolled scroll seen straight-on, navy outline with
two short gold rules suggesting text on it, a small gold seal pendant
on one end. Iconic. Aspect 1:1.`,
  },
];

async function generate(t) {
  console.log(`\n→ ${t.name}`);
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: t.prompt,
  });
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    console.error(`  ✗ no image returned`);
    return null;
  }
  return Buffer.from(imagePart.inlineData.data, "base64");
}

// Convert the flat cream background to transparent so the motif sits
// cleanly on any surface. We use a chroma-key style threshold — any
// pixel within `tol` of pure cream becomes transparent.
async function removeCreamBackground(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data); // copy
  const target = { r: 0xfa, g: 0xf6, b: 0xee };
  const tol = 18; // distance per channel
  for (let i = 0; i < out.length; i += 4) {
    const dr = Math.abs(out[i] - target.r);
    const dg = Math.abs(out[i + 1] - target.g);
    const db = Math.abs(out[i + 2] - target.b);
    if (dr <= tol && dg <= tol && db <= tol) {
      out[i + 3] = 0; // alpha to 0
    }
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

for (const t of targets) {
  const raw = await generate(t);
  if (!raw) continue;
  const transparent = await removeCreamBackground(raw);
  const outPath = resolve(outDir, `${t.name}.png`);
  writeFileSync(outPath, transparent);
  console.log(`  ✓ ${outPath} (${(transparent.length / 1024).toFixed(1)} KB)`);
}

console.log("\nDone. Use these as <Image src='/img/motif-*.png'> on cream/navy surfaces — they have transparent backgrounds and integrate cleanly.");
