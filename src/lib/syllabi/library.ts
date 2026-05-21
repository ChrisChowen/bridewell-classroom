// Bridewell Classroom — curated KS3 syllabus library.
//
// Each entry is sourced from the UK National Curriculum programmes of
// study (KS3) and supplemented with the Oak National Academy / ISEB
// CE13+ framings the Bridewell schools use day-to-day. The version field
// is bumped any time we add or revise an entry.
//
// To extend: drop a new SyllabusEntry into `entries` and import it as
// needed. To replace: bump `version`.

import type { SyllabusLibrary } from "./types";

export const SYLLABUS_LIBRARY: SyllabusLibrary = {
  version: "2026.05-01",
  entries: [
    // -----------------------------------------------------------------
    // Biology — KS3 Year 8 — Photosynthesis
    // -----------------------------------------------------------------
    {
      id: "ks3-bio-y8-photosynthesis",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "Biology",
      topic: "Photosynthesis",
      blurb:
        "How plants use light to make food, and why almost all life on Earth depends on this.",
      programmeOfStudy:
        "Pupils should understand the reactants in, and products of, photosynthesis, and a word summary for the reaction. They should appreciate the dependence of almost all life on Earth on the ability of photosynthetic organisms (plants, algae) to use sunlight to build organic molecules and to maintain levels of oxygen and carbon dioxide in the atmosphere.",
      learningOutcomes: [
        "Identify the reactants (carbon dioxide, water) and products (glucose, oxygen) of photosynthesis and write a word summary of the reaction.",
        "Explain that chlorophyll in chloroplasts absorbs light energy.",
        "Describe the adaptations of a leaf for photosynthesis (broad shape, thin, chloroplasts in palisade cells, stomata).",
        "Explain how plants use glucose: respiration, growth, storage as starch, building cell walls.",
        "Describe how environmental factors (light intensity, CO₂, temperature) limit the rate of photosynthesis.",
      ],
      criticalConcepts: [
        "Chlorophyll absorbs light energy",
        "Glucose stores chemical energy",
        "Photosynthesis maintains atmospheric oxygen and carbon dioxide",
      ],
      keyVocabulary: [
        "chlorophyll",
        "chloroplast",
        "stomata",
        "palisade",
        "glucose",
        "limiting factor",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },

    // -----------------------------------------------------------------
    // English — KS3 Year 8 — Persuasive writing
    // -----------------------------------------------------------------
    {
      id: "ks3-eng-y8-persuasive-writing",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "English",
      topic: "Persuasive writing & rhetorical devices",
      blurb:
        "Plan and write a short persuasive piece, using rhetorical devices for effect.",
      programmeOfStudy:
        "Pupils should write accurately, fluently, effectively and at length for pleasure and information through writing for a wide range of purposes and audiences, including narrative, non-narrative and academic writing. They should plan, draft, edit and proof-read and use rhetorical devices (anaphora, tricolon, rhetorical question, anecdote, direct address, statistics) deliberately and with awareness of audience and purpose.",
      learningOutcomes: [
        "Identify rhetorical devices in a model persuasive text (anaphora, tricolon, rhetorical question, anecdote, statistics, direct address).",
        "Choose devices for purpose — knowing why a tricolon lands harder than a list of four.",
        "Plan a short persuasive piece with a clear single viewpoint and a logical sequence of ideas.",
        "Draft and revise with attention to vocabulary choice and sentence variety.",
        "Avoid over-use: deploy devices sparingly so each one keeps its impact.",
      ],
      criticalConcepts: [
        "A rhetorical device must serve the argument, not decorate it",
        "Audience awareness shapes word choice and tone",
        "A clear single viewpoint is the spine of persuasion",
      ],
      keyVocabulary: [
        "anaphora",
        "tricolon",
        "rhetorical question",
        "anecdote",
        "direct address",
        "register",
        "audience",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — English programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-english-programmes-of-study",
      },
    },

    // -----------------------------------------------------------------
    // Mathematics — KS3 Year 8 — Linear equations
    // -----------------------------------------------------------------
    {
      id: "ks3-maths-y8-linear-equations",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "Mathematics",
      topic: "Linear equations in one variable",
      blurb:
        "Solve linear equations including unknowns on both sides and brackets.",
      programmeOfStudy:
        "Pupils should use and interpret algebraic notation; substitute numerical values into formulae and expressions; understand and use the concepts and vocabulary of expressions, equations, inequalities, terms and factors; simplify and manipulate algebraic expressions; solve linear equations in one variable.",
      learningOutcomes: [
        "Solve one-step and two-step linear equations.",
        "Solve equations with the unknown on both sides.",
        "Solve equations involving brackets by expanding first or by dividing through.",
        "Form and solve a linear equation from a word problem (perimeter, age, money).",
        "Check the solution by substitution.",
      ],
      criticalConcepts: [
        "An equation is a balance — do the same to both sides",
        "Inverse operations undo each other",
        "A solution is the value that makes the equation true (check by substitution)",
      ],
      keyVocabulary: [
        "expression",
        "equation",
        "term",
        "coefficient",
        "inverse operation",
        "substitute",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Mathematics programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study",
      },
    },

    // -----------------------------------------------------------------
    // History — KS3 Year 8 — Industrial Revolution
    // -----------------------------------------------------------------
    {
      id: "ks3-hist-y8-industrial-revolution",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "History",
      topic: "The Industrial Revolution",
      blurb:
        "How Britain changed between 1750 and 1900 — causes, change, consequences.",
      programmeOfStudy:
        "Pupils should know and understand the history of Britain as a coherent, chronological narrative, from the earliest times to the present day. They should understand how Britain has influenced and been influenced by the wider world. For KS3, this includes ideas, political power, industry and empire: Britain, 1745–1901.",
      learningOutcomes: [
        "Identify the technological changes that drove the Industrial Revolution (steam engine, factory system, railways).",
        "Explain why Britain industrialised first — coal, capital, colonies, agricultural change, population.",
        "Describe daily life in an industrial town and the working conditions in factories and mines.",
        "Evaluate the impact of industrialisation on women and children, using contemporary sources.",
        "Construct an argument supported by evidence about whether the Industrial Revolution was a 'good thing' for ordinary people.",
      ],
      criticalConcepts: [
        "Cause is rarely single — multiple factors interact",
        "Change has winners and losers; a balanced argument names both",
        "A source is evidence for what its author saw; evaluate provenance before content",
      ],
      keyVocabulary: [
        "industrialisation",
        "factory system",
        "urbanisation",
        "Luddite",
        "Reform Acts",
        "primary source",
      ],
      suggestedMinutes: 50,
      source: {
        name: "UK DfE — History programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-history-programmes-of-study",
      },
    },
  ],
};

export function findSyllabus(id: string) {
  return SYLLABUS_LIBRARY.entries.find((e) => e.id === id);
}
