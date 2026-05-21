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

// Allow targeted regeneration: `node scripts/generate-images.mjs scholar-*`
const filter = process.argv[2];
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
