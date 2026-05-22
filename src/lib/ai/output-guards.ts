// Output-side guards for the tutor. The system prompt forbids the text-only
// tutor from promising visuals it cannot deliver ("let me draw you a
// diagram"), but models still slip occasionally — exactly the failure Chris
// observed. This is the defence-in-depth: a pure, conservative detector we
// run on generated tutor/scaffold text so a slip can be MEASURED (logged)
// rather than silently shipped to a pupil.
//
// Design constraint: high precision over recall. It must NOT fire on the
// legitimate moves the prompt actively encourages — asking the PUPIL to draw
// or picture something ("draw the leaf and label it", "picture it in your
// head"), or describing a structure in words. So every pattern below targets
// a FIRST-PERSON PROMISE by the tutor, or deixis to a visual that does not
// exist ("here's a diagram", "look at this graph") — never an imperative to
// the pupil.

const VISUAL_NOUNS =
  "diagram|picture|image|graph|chart|drawing|sketch|illustration|figure|map|video|animation|photo|photograph|infographic|visual|gif|screenshot";

const PATTERNS: RegExp[] = [
  // "I'll show you a diagram", "let me draw a quick picture", "I can display the graph".
  // Allows up to two adjectives between the article and the visual noun
  // ("a quick map", "the simple labelled diagram").
  new RegExp(
    `\\b(i'?ll|i will|i'?m going to|im going to|let me|allow me to|i can|i could|i shall|here,? let me)\\s+(show|draw|sketch|display|render|bring up|pull up|generate|create|make|paint|map out|put up)\\s+(you\\s+)?(a|an|the|this|that|some|my)?\\s*(?:[\\w-]+\\s+){0,2}(${VISUAL_NOUNS})\\b`,
    "i"
  ),
  // "here's a diagram", "here is the simple graph", "here you go: a chart"
  new RegExp(`\\bhere('?s| is|'?re| are| you go[:,]?)\\s+(a|an|the|some|this)?\\s*(?:[\\w-]+\\s+){0,2}(${VISUAL_NOUNS})\\b`, "i"),
  // "look at / see / check out this diagram" (deixis to a non-existent visual)
  new RegExp(`\\b(look at|see|check out|take a look at|observe)\\s+(this|the|my|that|these|those)\\s+(${VISUAL_NOUNS})\\b`, "i"),
  // "below is a diagram", "above you'll see the chart", "attached is an image"
  new RegExp(`\\b(below|above|attached|here below)\\s+(is|are|you'?ll see|you can see)\\s+(a|an|the|some)?\\s*(${VISUAL_NOUNS})\\b`, "i"),
  // bracketed placeholders models sometimes emit: "[diagram of a cell]", "[image: ...]"
  new RegExp(`\\[\\s*(${VISUAL_NOUNS})\\b[^\\]]*\\]`, "i"),
  // markdown image embed the tutor can't actually render
  /!\[[^\]]*\]\([^)]*\)/,
];

/**
 * True if `text` appears to promise or reference a visual the text-only
 * tutor cannot deliver. Conservative — see the module header for what it
 * deliberately does NOT match.
 */
export function mentionsUnsupportedVisual(text: string): boolean {
  if (!text) return false;
  return PATTERNS.some((re) => re.test(text));
}
