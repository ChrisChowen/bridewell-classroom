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

// The brand block. Repeated verbatim into every prompt so the style
// stays consistent across the whole asset set. We are committed to a
// paper-cut / cut-out illustration register — selected against four
// alternatives during the explore-styles.mjs pass on 22 May 2026.
const BRAND = `
Brand illustration in the Bridewell visual language.

Style — tactile cut-paper / collage illustration. The subject is built
from layered flat shapes with crisp clean edges and a single matte
surface per shape. NO gradients, NO photographic textures, NO sketch
lines, NO outlines beyond the silhouette of each shape, NO 3D shading.
The illustration should feel like a beautifully composed paper relief
viewed straight on — each shape its own piece of cut card, layered
just enough to read as depth without casting any soft shadow. Modern
but serious in register, school-appropriate, not whimsical.

Palette — ONLY use these three colours. Do not add red, green, purple,
teal, or any other accents:
  - deep royal navy #0D2A4A as the dominant shape colour
  - warm Bridewell gold #B58A3C for one or two highlight shapes
  - soft cream #FAF6EE as the background

Composition — the subject is centred and reads as one calm mark. No
text or letters in the image. No surrounding furniture, no decorative
border, no patterned background. No animals. The subject should read
clearly at 64px as well as 512px.

Avoid — pixel art, watercolour, sketchy hand-drawn lines, photographic
realism, neon, glow effects, isometric 3D, magazine illustration vibes,
stock-photo people, generic SaaS gradients, anything that screams "AI
generated illustration". No rounded-rectangle "app icon" tile or card
behind the figure.

Render with a single completely flat cream #FAF6EE background, no
shading at all, so it can be chroma-keyed cleanly to transparent.
`;

// Mascot block — same palette and silhouette rules, but the subject is
// a small Bridewell-Scholar figure illustrated in the heraldic flat
// style. Used for brand surfaces (homepage hero, empty states, login),
// NEVER in the chat thread (CLAUDE.md §A: the tutor is a tool, not a
// buddy). Three poses so we can pick the right one for the surface
// (reading on the homepage, thinking on the empty dashboard, teaching
// on the login screen).
const SCHOLAR_BASE = `
Illustration of a small stylised scholar character in the Bridewell
visual language.

Style — flat vector illustration like a modern heraldic lockup. NO
photographic realism. NO 3D shading. NO sketchy hand-drawn linework.
NO watercolour. NO halftone. NO neon or glow. Crisp confident
linework, calligraphic curves where natural, deliberate negative
space. Reads as one calm iconic mark — like something printed in the
front of a school yearbook in deep navy ink with gold accents.

Palette — STRICTLY only these three colours, no others:
  - deep royal navy #0D2A4A for outlines, robe, hair
  - warm Bridewell gold #B58A3C for small accents (book pages,
    candle flame, decorative dot)
  - soft cream #FAF6EE as the flat background

The figure — small simple proportions, head a little large like a
classical portrait silhouette, gender-neutral face shown only as two
small navy dots for eyes and a single soft line for the mouth. NO
detailed facial features, NO expressions beyond calm. NO modern
clothes. The figure wears a simple gathered scholar's robe / academic
gown drawn as a single navy shape with two small gold buttons or one
small gold collar trim. Hair is a calm rounded navy cap. The figure
should look ageless — not specifically child or adult — and read
unambiguously as "a scholar".

Composition — centred, single figure, no other subjects. No room, no
furniture beyond what the pose strictly requires (one open book, a
candle, a small scroll). No background pattern. No shadow under the
figure. Aspect 1:1, square.

The background MUST be a single flat #FAF6EE cream area, completely
unshaded, completely uniform, so it can be chroma-keyed to transparent
afterwards.
`;

const targets = [
  // --- Scholar mascot ----------------------------------------------------
  // Three poses, all generated with the same brand block so they hold
  // together as one character across the brand surfaces.
  {
    name: "scholar-reading",
    prompt: `${SCHOLAR_BASE}

Pose: the scholar sitting cross-legged, looking down at a single open
book held in both hands across the lap. The book is rendered as a
small flat shape with two visible cream pages and a thin gold trim
along the outer edge of each page. The book's spine is navy. The
scholar's gaze is gently downward at the book. Calm. Aspect 1:1.`,
  },
  {
    name: "scholar-thinking",
    prompt: `${SCHOLAR_BASE}

Pose: the scholar standing upright, weight on one foot, one hand
lightly resting on the chin in a calm thinking gesture. The other arm
hangs at the side. The face is shown only as two small navy eye dots
and a small calm mouth line. Above the scholar's head, three tiny
gold dots float in a small calligraphic arc to suggest a forming
thought. No speech bubble, no question mark. Aspect 1:1.`,
  },
  {
    name: "scholar-teaching",
    prompt: `${SCHOLAR_BASE}

Pose: the scholar standing upright with a slight forward lean, one
hand gesturing forward palm up as if explaining, the other holding a
small slim navy scroll with two gold ribbons at its ends. The face is
calm. No audience shown — only the scholar. Aspect 1:1.`,
  },

  // Peeking pose for the homepage hero. Like the meme of "Kilroy was
  // here" — only the very top of the scholar pokes above an invisible
  // edge. The homepage layers the figure behind the headline so it
  // reads as the scholar peering over the top of the text.
  {
    name: "scholar-peeking",
    prompt: `${SCHOLAR_BASE}

Pose — the scholar HIDING behind a wall and peeking up over the top
edge of it. Only the upper half of the head (from about mid-nose
upward) is visible above an invisible horizontal line at the very
BOTTOM of the canvas. Both small hands grip the edge of that
invisible wall — the hands sit just below the eye line, fingertips
visible like a Kilroy-was-here mark.

The face is just two small navy dots for eyes plus a tiny curve of
hair, peering upward with calm curiosity. Below the eyes everything
is hidden — NO mouth, NO chin, NO body, NO robe, NO book, NO candle,
NO desk, NO scroll. The scholar's whole body is hidden behind the
wall; we only see eyes and fingertips.

The top three quarters of the canvas is COMPLETELY EMPTY cream
#FAF6EE. The peeking head + fingertips occupy only the bottom ~25%
of the canvas, hugging the bottom edge. Aspect 1:1.`,
  },

  // --- House points jar -----------------------------------------------
  // The empty vessel for the whiteboard view. We generate it as one
  // beautiful illustrated artefact (no contents) and animate the
  // contents (gems / liquid) over the top in the live UI.
  {
    name: "points-jar-empty",
    prompt: `${BRAND}

Subject: a single tall heraldic glass jar / hourglass-shaped trophy
vessel viewed straight-on, drawn in the same flat heraldic line style
as the Bridewell crest. The jar has a slim navy outline forming the
glass walls, a stepped navy base, a slim navy lip at the top, and two
small gold decorative roundels on the base. The interior of the jar
must be left completely empty and uniform cream #FAF6EE (no marbles,
no liquid, no contents). The jar should feel ceremonial — like the
house points vessels seen in a Great Hall — but rendered in the
Bridewell flat-heraldic style, not photoreal. Single object centred
on the cream background. No people, no labels, no other furniture.
Aspect 3:4 (taller than wide). The vessel should fill ~80% of the
canvas height.`,
  },

  // Original heraldic motifs preserved below ----------------------------
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
// pixel within `tol` of pure cream becomes transparent. We then crop
// to the bounding box of the non-transparent content with a small
// padding, so the image scales without phantom whitespace around it.
async function removeCreamBackground(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const target = { r: 0xfa, g: 0xf6, b: 0xee };
  const tol = 18;
  const { width, height } = info;
  // Pass 1 — chroma-key + record content bounds
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const dr = Math.abs(out[i] - target.r);
      const dg = Math.abs(out[i + 1] - target.g);
      const db = Math.abs(out[i + 2] - target.b);
      if (dr <= tol && dg <= tol && db <= tol) {
        out[i + 3] = 0;
      } else {
        // Non-background pixel — record bounds
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  // No content found — return the keyed result as-is
  if (maxX < 0 || maxY < 0) {
    return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
  }
  // Pad the bounding box by ~3% of the image dimension so the figure
  // breathes; clamp to the original frame.
  const padX = Math.round(width * 0.03);
  const padY = Math.round(height * 0.03);
  const left = Math.max(0, minX - padX);
  const top = Math.max(0, minY - padY);
  const right = Math.min(width - 1, maxX + padX);
  const bottom = Math.min(height - 1, maxY + padY);
  const cropW = right - left + 1;
  const cropH = bottom - top + 1;
  return sharp(out, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: cropW, height: cropH })
    .png()
    .toBuffer();
}

// Reprocess an existing PNG that already has a transparent background —
// just crop it to the content's bounding box + padding. Useful for
// trimming the dead space around images already in `public/img/`
// without re-running Imagen.
async function recropTransparent(filePath) {
  const buf = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = buf;
  const { width, height } = info;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > 12) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const padX = Math.round(width * 0.03);
  const padY = Math.round(height * 0.03);
  const left = Math.max(0, minX - padX);
  const top = Math.max(0, minY - padY);
  const right = Math.min(width - 1, maxX + padX);
  const bottom = Math.min(height - 1, maxY + padY);
  return sharp(filePath)
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .png()
    .toBuffer();
}

// Modes:
//   node scripts/generate-images.mjs              — regenerate all targets
//   node scripts/generate-images.mjs scholar-*    — regenerate matching
//   node scripts/generate-images.mjs --recrop     — re-crop the existing
//     transparent PNGs in public/img/ without re-running Imagen. Useful
//     when an earlier run left too much empty space around the figure.
const arg = process.argv[2];

if (arg === "--recrop") {
  const { readdirSync, writeFileSync } = await import("node:fs");
  const files = readdirSync(outDir).filter((f) => f.endsWith(".png"));
  console.log(`Re-cropping ${files.length} existing PNG(s) in ${outDir}`);
  for (const f of files) {
    const inPath = resolve(outDir, f);
    const cropped = await recropTransparent(inPath);
    if (cropped) {
      writeFileSync(inPath, cropped);
      console.log(`  ✓ ${f} (${(cropped.length / 1024).toFixed(1)} KB)`);
    } else {
      console.log(`  · ${f} (no content to crop to)`);
    }
  }
  process.exit(0);
}

const filter = arg;
const toRun = filter
  ? targets.filter((t) =>
      filter.endsWith("*") ? t.name.startsWith(filter.slice(0, -1)) : t.name === filter
    )
  : targets;

console.log(`Generating ${toRun.length} image(s)${filter ? ` matching '${filter}'` : ""}`);

for (const t of toRun) {
  const raw = await generate(t);
  if (!raw) continue;
  const transparent = await removeCreamBackground(raw);
  const outPath = resolve(outDir, `${t.name}.png`);
  writeFileSync(outPath, transparent);
  console.log(`  ✓ ${outPath} (${(transparent.length / 1024).toFixed(1)} KB)`);
}

console.log("\nDone. Use these as <Image src='/img/motif-*.png'> on cream/navy surfaces — they have transparent backgrounds and integrate cleanly.");
