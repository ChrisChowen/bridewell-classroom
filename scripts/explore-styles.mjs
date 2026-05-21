#!/usr/bin/env node
// Style exploration sandbox. Generates the same subject ("a scholar
// reading a book", "an empty trophy vessel") across several distinct
// stylistic prompt families so we can pick the one that fits Bridewell
// best before committing.
//
// Outputs land in `public/img/explore/<style>/<subject>.png`. None of
// these are wired into the app until you copy a chosen style across to
// the canonical `public/img/<name>.png` slots.

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

const NAVY = "#0D2A4A";
const GOLD = "#B58A3C";
const CREAM = "#FAF6EE";

// Shared palette + background instruction for ALL styles, so chroma
// keying still works. Style-specific instructions go in the wrapper.
const PALETTE = `Use ONLY these colours: deep royal navy ${NAVY}, warm
Bridewell gold ${GOLD}, soft cream ${CREAM}. Background must be a single
flat ${CREAM} cream area with NO shading or texture, so it can be
chroma-keyed to transparent. Centred subject, square 1:1, no people in
the background, no text or marketing language, no decorative borders.`;

// Five candidate styles. Each is a distinct prompt family — vocabulary
// deliberately doesn't repeat between them, so the model commits to
// one register rather than averaging.
const STYLES = {
  "01-heraldic-flat": `Style: classical heraldic crest illustration, two-tone vector mark.
Flat fills only — NO gradients, NO 3D, NO shadows, NO photographic
textures, NO sketch lines. Crisp confident outlines, deliberate
negative space, calligraphic curves where natural, like a 16th-century
school crest rendered cleanly as a modern logo. Bilateral symmetry
where the subject allows. Reads as one iconic mark. ${PALETTE}`,

  "02-engraved-line": `Style: 19th-century steel engraving line illustration, fine parallel
hatching for shadows only (NO solid fill shadows). Crisp navy ink lines
on flat cream. The subject is drawn from a 3/4 view with confident
draughtsmanship — like a frontispiece illustration in a Victorian
schoolbook. Small gold accents only on critical highlights (one or two
points max). ${PALETTE}`,

  "03-paper-cut": `Style: tactile cut-paper / collage illustration. The subject is built
from layered flat shapes with crisp edges and a single matte texture per
shape — NO gradients, NO photographic detail, NO line work other than
the silhouette edges. Looks like a beautifully composed paper relief
viewed straight-on. Subject reads cleanly at small sizes. ${PALETTE}`,

  "04-illuminated-manuscript": `Style: medieval illuminated manuscript miniature — flat colour fills,
delicate gold-leaf accents, navy outlines with light hand-drawn
character. NO gradients, NO modern shading, NO photographic texture.
Composition reads as a single page miniature, centred, with the
subject in front of a flat cream ground (no border, no foliage frame).
Calm and serious in tone — not whimsical. ${PALETTE}`,

  "05-modern-minimal-icon": `Style: contemporary minimalist illustration in the register of a
high-end editorial app icon. Flat geometric shapes, NO outlines around
fills (fills define the silhouette), generous negative space, one or
two gold details acting as visual punctuation. NO gradients, NO 3D,
NO shading. Reads at 32px as well as 512px. ${PALETTE}`,
};

// Two subjects so we can compare each style on more than one piece of
// content. The mascot is the headline test; the vessel is the
// secondary test (it's the dominant graphic on the whiteboard view).
const SUBJECTS = {
  scholar: `Subject: a small stylised scholar figure, gender-neutral, sitting
calmly with an open book held in their hands. The figure wears a simple
scholar's robe and a calm rounded cap of hair. Face shown ONLY as two
small navy dots for eyes and one soft mouth line — no detailed
features. No surrounding furniture beyond the book itself. The book
shows two visible pages with a thin gold edge. The figure feels ageless
— not clearly a child or an adult.`,
  vessel: `Subject: a single tall heraldic glass trophy vessel, viewed straight
on. Stepped base, slim lip, completely empty interior (no marbles, no
liquid). Reads like a ceremonial house-points jar in a school great
hall. Two small gold roundels as the only decorative touches on the
base. The vessel sits centred, no shadow under it.`,
};

const outRoot = resolve(__dirname, "../public/img/explore");
mkdirSync(outRoot, { recursive: true });

async function generate(prompt) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
  });
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) return null;
  return Buffer.from(imagePart.inlineData.data, "base64");
}

async function chromaKeyAndCrop(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const target = { r: 0xfa, g: 0xf6, b: 0xee };
  const tol = 18;
  const { width, height } = info;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const dr = Math.abs(out[i] - target.r);
      const dg = Math.abs(out[i + 1] - target.g);
      const db = Math.abs(out[i + 2] - target.b);
      if (dr <= tol && dg <= tol && db <= tol) {
        out[i + 3] = 0;
      } else {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) {
    return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
  }
  const padX = Math.round(width * 0.03);
  const padY = Math.round(height * 0.03);
  const left = Math.max(0, minX - padX);
  const top = Math.max(0, minY - padY);
  const cropW = Math.min(width - left, maxX - left + 1 + padX);
  const cropH = Math.min(height - top, maxY - top + 1 + padY);
  return sharp(out, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: cropW, height: cropH })
    .png()
    .toBuffer();
}

// Allow targeted: `node scripts/explore-styles.mjs 03-paper-cut`
const filter = process.argv[2];
const styleEntries = filter
  ? Object.entries(STYLES).filter(([k]) => k === filter)
  : Object.entries(STYLES);

console.log(`Generating ${styleEntries.length} × ${Object.keys(SUBJECTS).length} = ${styleEntries.length * Object.keys(SUBJECTS).length} images`);

for (const [styleKey, styleBlock] of styleEntries) {
  const styleDir = resolve(outRoot, styleKey);
  mkdirSync(styleDir, { recursive: true });
  for (const [subjKey, subjBlock] of Object.entries(SUBJECTS)) {
    console.log(`  → ${styleKey}/${subjKey}`);
    const prompt = `${styleBlock}\n\n${subjBlock}`;
    const raw = await generate(prompt);
    if (!raw) {
      console.log(`    ✗ no image returned`);
      continue;
    }
    const final = await chromaKeyAndCrop(raw);
    writeFileSync(resolve(styleDir, `${subjKey}.png`), final);
    console.log(`    ✓ ${(final.length / 1024).toFixed(1)} KB`);
  }
}

console.log("\nDone. Compare in public/img/explore/<style>/.");
