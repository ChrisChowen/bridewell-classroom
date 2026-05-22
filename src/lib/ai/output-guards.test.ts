import { describe, it, expect } from "vitest";
import { mentionsUnsupportedVisual } from "./output-guards";

describe("mentionsUnsupportedVisual — catches tutor promising visuals", () => {
  const positives = [
    "Let me draw you a diagram of the cell.",
    "I'll show you a graph of the rate.",
    "I'm going to display a picture of a leaf.",
    "Here's a diagram showing the water cycle.",
    "Here is the chart we discussed.",
    "Look at this diagram of the heart.",
    "Below is an illustration of the process.",
    "I can sketch a quick map for you.",
    "[diagram of a chloroplast]",
    "See the image: ![cell](http://example.com/cell.png)",
    "I will pull up a video about volcanoes.",
  ];
  for (const t of positives) {
    it(`flags: ${t}`, () => {
      expect(mentionsUnsupportedVisual(t)).toBe(true);
    });
  }
});

describe("mentionsUnsupportedVisual — does NOT fire on legitimate moves", () => {
  const negatives = [
    // Asking the PUPIL to draw / picture — the prompt actively encourages this.
    "Draw the leaf and label where the light hits — what goes in the middle?",
    "Picture it in your head: what happens to the green light?",
    "Can you sketch the circuit yourself and tell me what you notice?",
    "Imagine a graph of temperature over time — which way does the line go?",
    // Describing structure in words (allowed).
    "In words: light goes to the leaf, then becomes glucose.",
    "Think of it as light → leaf → glucose. What's the missing step?",
    // Ordinary coaching with no visual at all.
    "What does the leaf need from outside itself?",
    "Why might the reaction slow down when it gets colder?",
    // The noun appears but not as a tutor-supplied visual.
    "What would your diagram need to include to be complete?",
    "Describe the picture you see when you close your eyes.",
    "",
  ];
  for (const t of negatives) {
    it(`allows: ${t || "(empty)"}`, () => {
      expect(mentionsUnsupportedVisual(t)).toBe(false);
    });
  }
});
