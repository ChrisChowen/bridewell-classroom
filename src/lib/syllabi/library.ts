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

    // =================================================================
    // BIOLOGY — KS3
    // =================================================================
    {
      id: "ks3-bio-y7-cells",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "Biology",
      topic: "Cells: the building blocks of life",
      blurb:
        "Animal and plant cells, their subcellular structures, and how to view them under a microscope.",
      programmeOfStudy:
        "Pupils should learn that cells are the fundamental unit of living organisms, including how to observe, interpret and record cell structure using a light microscope; the functions of the cell wall, cell membrane, cytoplasm, nucleus, vacuole, mitochondria and chloroplasts; and the similarities and differences between plant and animal cells.",
      learningOutcomes: [
        "Label the parts of animal and plant cells and state the function of each.",
        "Use a light microscope to observe prepared slides and make a labelled biological drawing.",
        "Compare plant and animal cells, identifying structures unique to each.",
        "Describe how specialised cells (red blood cell, sperm cell, root hair cell) are adapted to their function.",
        "Calculate the magnification of a microscope from the objective and eyepiece lens values.",
      ],
      criticalConcepts: [
        "Structure relates to function at every scale",
        "Cells are the smallest unit that can be called 'alive'",
        "Specialisation trades versatility for efficiency",
      ],
      keyVocabulary: [
        "nucleus",
        "cytoplasm",
        "cell membrane",
        "cell wall",
        "mitochondria",
        "chloroplast",
        "vacuole",
        "magnification",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-bio-y7-human-reproduction",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "Biology",
      topic: "Human reproduction",
      blurb:
        "The structure and function of the human reproductive system, and the menstrual cycle.",
      programmeOfStudy:
        "Pupils should learn reproduction in humans (as an example of a mammal), including the structure and function of the male and female reproductive systems, menstrual cycle (without details of hormones), gametes, fertilisation, gestation and birth, to include the effect of maternal lifestyle on the foetus through the placenta.",
      learningOutcomes: [
        "Identify the parts of the male and female reproductive systems and state their functions.",
        "Describe the menstrual cycle and the role of menstruation, ovulation and the uterus lining.",
        "Explain fertilisation as the fusion of a sperm and egg nucleus.",
        "Describe the development of the foetus and the role of the placenta and umbilical cord.",
        "Explain how the mother's lifestyle (smoking, alcohol, nutrition) can affect the developing foetus.",
      ],
      criticalConcepts: [
        "Gametes are specialised cells carrying half the genetic information",
        "The placenta is the exchange surface between mother and foetus",
        "Cycles in biology have phases driven by signals (here, hormones)",
      ],
      keyVocabulary: [
        "gamete",
        "fertilisation",
        "uterus",
        "ovary",
        "testis",
        "placenta",
        "gestation",
        "foetus",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-bio-y7-skeleton-muscles",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "Biology",
      topic: "The skeleton and muscles",
      blurb:
        "How the skeleton supports the body, protects organs and allows movement through antagonistic muscles.",
      programmeOfStudy:
        "Pupils should learn the structure and functions of the human skeleton, to include support, protection, movement and making blood cells; biomechanics — the interaction between skeleton and muscles, including the measurement of force exerted by different muscles; and the function of muscles and examples of antagonistic muscles.",
      learningOutcomes: [
        "State the four functions of the skeleton (support, protection, movement, blood cell production).",
        "Describe how a synovial joint is structured and how it allows movement.",
        "Explain how antagonistic muscle pairs (biceps/triceps) move a joint.",
        "Interpret data on the force exerted by different muscles.",
        "Identify common skeletal injuries and explain how they are diagnosed.",
      ],
      criticalConcepts: [
        "Muscles can only pull, not push — hence the need for pairs",
        "Joints are the trade-off between stability and mobility",
        "Biomechanics treats the body as a system of levers",
      ],
      keyVocabulary: [
        "vertebrae",
        "cartilage",
        "ligament",
        "tendon",
        "antagonistic",
        "synovial",
        "biceps",
        "triceps",
      ],
      suggestedMinutes: 40,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-bio-y8-digestion",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "Biology",
      topic: "Nutrition and digestion",
      blurb:
        "The content of a healthy diet, the digestive system, and how enzymes break food down.",
      programmeOfStudy:
        "Pupils should learn the content of a healthy human diet: carbohydrates, lipids, proteins, vitamins, minerals, dietary fibre and water, and why each is needed; calculations of energy requirements in a healthy daily diet; the consequences of imbalances in the diet, including obesity, starvation and deficiency diseases; the tissues and organs of the human digestive system, and the importance of bacteria in the human digestive system.",
      learningOutcomes: [
        "Identify the seven components of a healthy diet and the function of each.",
        "Label the organs of the digestive system and describe the role of each in mechanical and chemical digestion.",
        "Explain the role of enzymes (amylase, protease, lipase) in breaking down large food molecules.",
        "Explain the role of bile and the small intestine in absorption.",
        "Evaluate evidence about the health effects of a poor diet.",
      ],
      criticalConcepts: [
        "Digestion breaks large insoluble molecules into small soluble ones for absorption",
        "Enzymes are biological catalysts — they are specific and reusable",
        "A balanced diet means proportions, not quantities, suited to need",
      ],
      keyVocabulary: [
        "enzyme",
        "amylase",
        "protease",
        "lipase",
        "bile",
        "villi",
        "absorption",
        "peristalsis",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-bio-y8-respiration",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "Biology",
      topic: "Respiration",
      blurb:
        "Aerobic and anaerobic respiration — how cells release energy from glucose.",
      programmeOfStudy:
        "Pupils should learn aerobic and anaerobic respiration in living organisms, including the breakdown of organic molecules to enable all the other chemical processes necessary for life; a word summary for aerobic respiration; the process of anaerobic respiration in humans and microorganisms, including fermentation; and a word summary for anaerobic respiration.",
      learningOutcomes: [
        "Write the word equation for aerobic respiration and identify reactants and products.",
        "Explain the difference between aerobic and anaerobic respiration in terms of oxygen, products and energy released.",
        "Describe anaerobic respiration in muscle cells (producing lactic acid) and in yeast (producing ethanol and carbon dioxide).",
        "Explain why the body's breathing rate increases during and after exercise (oxygen debt).",
        "Distinguish between respiration (cellular process) and breathing (gas exchange).",
      ],
      criticalConcepts: [
        "Respiration releases energy in every living cell, every second",
        "Anaerobic respiration is a fallback — fast but inefficient",
        "Respiration is not breathing",
      ],
      keyVocabulary: [
        "aerobic",
        "anaerobic",
        "glucose",
        "lactic acid",
        "fermentation",
        "oxygen debt",
        "mitochondria",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-bio-y8-ecosystems",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "Biology",
      topic: "Ecosystems and interdependence",
      blurb:
        "Food chains, food webs, and how organisms depend on each other and their environment.",
      programmeOfStudy:
        "Pupils should learn the interdependence of organisms in an ecosystem, including food webs and insect-pollinated crops; the importance of plant reproduction through insect pollination in human food security; and how organisms affect, and are affected by, their environment, including the accumulation of toxic materials.",
      learningOutcomes: [
        "Construct a food chain and a food web from data on a habitat.",
        "Identify producers, primary consumers, secondary consumers and decomposers.",
        "Explain why energy is lost between trophic levels and what this means for food chain length.",
        "Predict the effect of removing one species from a food web.",
        "Explain how pollinator decline threatens food security.",
      ],
      criticalConcepts: [
        "Energy flows; matter cycles",
        "Interdependence means a change anywhere affects everywhere",
        "Biodiversity is resilience — variety buffers against shocks",
      ],
      keyVocabulary: [
        "producer",
        "consumer",
        "decomposer",
        "trophic level",
        "biomass",
        "pollination",
        "ecosystem",
        "biodiversity",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-bio-y9-inheritance",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "Biology",
      topic: "Inheritance, chromosomes and DNA",
      blurb:
        "How traits are passed from parent to offspring through chromosomes, genes and DNA.",
      programmeOfStudy:
        "Pupils should learn heredity as the process by which genetic information is transmitted from one generation to the next; a simple model of chromosomes, genes and DNA in heredity; including the part played by Watson, Crick, Wilkins and Franklin in the development of the DNA model; differences between species; and the variation between individuals within a species being continuous or discontinuous.",
      learningOutcomes: [
        "Describe the relationship between chromosomes, genes and DNA.",
        "Explain the difference between continuous and discontinuous variation, with examples.",
        "Outline the contribution of Watson, Crick, Wilkins and Franklin to the discovery of DNA's structure.",
        "Explain how characteristics are inherited from parents using a simple model.",
        "Distinguish between inherited and environmental variation.",
      ],
      criticalConcepts: [
        "DNA is a molecular code; genes are sections of that code",
        "Variation arises from both inheritance and environment",
        "Scientific discovery is collaborative and contested — credit is rarely clean",
      ],
      keyVocabulary: [
        "DNA",
        "chromosome",
        "gene",
        "allele",
        "genotype",
        "phenotype",
        "variation",
        "heredity",
      ],
      suggestedMinutes: 50,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-bio-y9-evolution",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "Biology",
      topic: "Evolution and natural selection",
      blurb:
        "Darwin's theory, the evidence for evolution, and how species change over time.",
      programmeOfStudy:
        "Pupils should learn the variation between species and between individuals of the same species means some organisms compete more successfully, which can drive natural selection; changes in the environment may leave individuals within a species, and some entire species, less well adapted to compete successfully and reproduce, which in turn may lead to extinction; the importance of maintaining biodiversity and the use of gene banks to preserve hereditary material.",
      learningOutcomes: [
        "State Darwin's theory of evolution by natural selection in your own words.",
        "Explain the four conditions required for natural selection (variation, competition, survival, inheritance).",
        "Apply the theory to explain examples (peppered moth, antibiotic resistance, Darwin's finches).",
        "Describe the fossil record as evidence for evolution and its limitations.",
        "Explain how extinction can result from environmental change.",
      ],
      criticalConcepts: [
        "Natural selection does not have a goal — it has consequences",
        "Variation must be inheritable to drive evolution",
        "Evidence accumulates from many independent lines (fossils, anatomy, DNA)",
      ],
      keyVocabulary: [
        "variation",
        "adaptation",
        "natural selection",
        "extinction",
        "speciation",
        "fossil",
        "biodiversity",
      ],
      suggestedMinutes: 50,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-bio-y9-health-disease",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "Biology",
      topic: "Health, disease and the immune system",
      blurb:
        "Communicable and non-communicable disease, how the body defends itself, and vaccination.",
      programmeOfStudy:
        "Pupils should learn the effects of recreational drugs (including substance misuse) on behaviour, health and life processes; the impact of exercise, asthma and smoking on the human gas exchange system; and the role of microorganisms in causing disease, including bacterial and viral infections.",
      learningOutcomes: [
        "Distinguish between communicable and non-communicable diseases with examples.",
        "Describe the body's primary defences (skin, mucus, stomach acid) and the role of white blood cells.",
        "Explain how vaccination produces immunity and why herd immunity matters.",
        "Evaluate the effect of smoking on the gas exchange system using data.",
        "Describe the effects of alcohol and other recreational drugs on health.",
      ],
      criticalConcepts: [
        "Immunity is memory — antibodies and lymphocytes remember pathogens",
        "Risk factors raise probability, they do not guarantee disease",
        "Public health requires collective behaviour, not just individual choice",
      ],
      keyVocabulary: [
        "pathogen",
        "antibody",
        "lymphocyte",
        "vaccination",
        "immunity",
        "communicable",
        "risk factor",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },

    // =================================================================
    // CHEMISTRY — KS3
    // =================================================================
    {
      id: "ks3-chem-y7-particles",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "Chemistry",
      topic: "Particle model of matter",
      blurb:
        "Solids, liquids and gases — explaining everyday phenomena with a model of particles.",
      programmeOfStudy:
        "Pupils should learn the properties of the different states of matter (solid, liquid and gas) in terms of the particle model, including gas pressure; changes of state in terms of the particle model; and Brownian motion in gases.",
      learningOutcomes: [
        "Describe the arrangement, movement and energy of particles in solids, liquids and gases.",
        "Use the particle model to explain melting, boiling, evaporation, condensation and sublimation.",
        "Explain gas pressure in terms of particle collisions with the walls of a container.",
        "Explain diffusion and Brownian motion using the particle model.",
        "Sketch a heating or cooling curve and explain the plateau regions.",
      ],
      criticalConcepts: [
        "A model is a useful simplification, not a literal picture",
        "Energy changes drive changes of state, not temperature alone",
        "Pressure is collisions, not 'push'",
      ],
      keyVocabulary: [
        "particle",
        "state",
        "melting",
        "evaporation",
        "diffusion",
        "Brownian motion",
        "pressure",
      ],
      suggestedMinutes: 40,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-chem-y7-elements-compounds",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "Chemistry",
      topic: "Elements, compounds and mixtures",
      blurb:
        "How pure substances differ from mixtures, and how mixtures can be separated.",
      programmeOfStudy:
        "Pupils should learn the differences between atoms, elements and compounds; chemical symbols and formulae for elements and compounds; and the concept of a pure substance, mixtures (including dissolving), and methods for separating mixtures: filtration, evaporation, distillation and chromatography.",
      learningOutcomes: [
        "Define element, compound and mixture and give examples of each.",
        "Use chemical symbols and write the formulae of simple compounds (H₂O, CO₂, NaCl).",
        "Choose an appropriate separation technique (filtration, evaporation, distillation, chromatography) for a given mixture.",
        "Interpret a chromatogram to identify substances and calculate Rf values.",
        "Distinguish between a pure substance and a mixture using melting/boiling data.",
      ],
      criticalConcepts: [
        "Pure has a chemistry meaning — one substance, not 'natural'",
        "Separation techniques exploit differences in physical properties",
        "A formula encodes ratio, not just 'what is in it'",
      ],
      keyVocabulary: [
        "element",
        "compound",
        "mixture",
        "solute",
        "solvent",
        "filtration",
        "distillation",
        "chromatography",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-chem-y7-acids-alkalis",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "Chemistry",
      topic: "Acids, alkalis and neutralisation",
      blurb:
        "The pH scale, indicators and the reactions of acids with alkalis and metals.",
      programmeOfStudy:
        "Pupils should learn the pH scale for measuring acidity/alkalinity; the use of indicators; reactions of acids with alkalis to produce a salt plus water; reactions of acids with metals to produce a salt plus hydrogen; and what catalysts do.",
      learningOutcomes: [
        "Describe the pH scale and classify substances as acidic, neutral or alkaline.",
        "Use universal indicator and litmus to estimate pH.",
        "Write word equations for the reactions of acids with alkalis and with metals.",
        "Plan a neutralisation experiment, including controlling variables.",
        "Give everyday examples of neutralisation (indigestion, soil treatment, insect stings).",
      ],
      criticalConcepts: [
        "pH is logarithmic, so each step is ×10 difference in acidity",
        "Neutralisation produces a salt plus water — always",
        "An indicator tells you pH, it does not change pH",
      ],
      keyVocabulary: [
        "acid",
        "alkali",
        "neutralisation",
        "salt",
        "indicator",
        "pH",
        "universal indicator",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-chem-y8-periodic-table",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "Chemistry",
      topic: "The periodic table",
      blurb:
        "How elements are arranged, and how the table predicts properties and reactivity.",
      programmeOfStudy:
        "Pupils should learn the principles underpinning the Mendeleev periodic table; the periodic table: periods and groups; metals and non-metals; how patterns in reactions can be predicted with reference to the periodic table; and the properties of metals and non-metals.",
      learningOutcomes: [
        "Describe how Mendeleev organised the elements and what he predicted.",
        "Use the periodic table to identify groups (1, 7, 0) and periods.",
        "Compare the properties of metals and non-metals.",
        "Predict the reactivity trend in Group 1 and Group 7.",
        "Explain why noble gases (Group 0) are unreactive.",
      ],
      criticalConcepts: [
        "The periodic table is organised by atomic structure, not just by mass",
        "Trends within a group are predictable — chemistry has pattern",
        "An unreactive element is still useful — sometimes because it is unreactive",
      ],
      keyVocabulary: [
        "element",
        "group",
        "period",
        "alkali metal",
        "halogen",
        "noble gas",
        "reactivity",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-chem-y8-chemical-reactions",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "Chemistry",
      topic: "Chemical reactions",
      blurb:
        "Conservation of mass, types of reaction, and balancing simple equations.",
      programmeOfStudy:
        "Pupils should learn chemical reactions as the rearrangement of atoms; representing chemical reactions using formulae and using equations; combustion, thermal decomposition, oxidation and displacement reactions; and the conservation of mass in chemical reactions.",
      learningOutcomes: [
        "Explain that mass is conserved in a chemical reaction and use this to solve missing-mass problems.",
        "Identify common reaction types: combustion, thermal decomposition, oxidation, displacement.",
        "Write a word equation and a balanced symbol equation for a given reaction.",
        "Use the reactivity series to predict whether a displacement reaction will occur.",
        "Distinguish between physical and chemical change with examples.",
      ],
      criticalConcepts: [
        "Atoms are rearranged, never destroyed — hence balanced equations",
        "Reactivity is a property of the element, not the situation",
        "A change of mass on a balance often means a gas has entered or left",
      ],
      keyVocabulary: [
        "reactant",
        "product",
        "combustion",
        "oxidation",
        "displacement",
        "thermal decomposition",
        "conservation",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-chem-y8-earth-atmosphere",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "Chemistry",
      topic: "The Earth and its atmosphere",
      blurb:
        "The composition of the atmosphere, the carbon cycle and climate change.",
      programmeOfStudy:
        "Pupils should learn the composition of the Earth; the structure of the Earth; the rock cycle and the formation of igneous, sedimentary and metamorphic rocks; Earth as a source of limited resources and the efficacy of recycling; the carbon cycle; and the production of carbon dioxide by human activity and the impact on climate.",
      learningOutcomes: [
        "State the composition of the modern atmosphere by percentage.",
        "Describe the carbon cycle, including photosynthesis, respiration, combustion and decomposition.",
        "Explain how human activity (fossil fuels, deforestation) has increased atmospheric CO₂.",
        "Explain the greenhouse effect and link it to climate change.",
        "Distinguish between rock types and describe the rock cycle.",
      ],
      criticalConcepts: [
        "The atmosphere has a history — its composition has changed over geological time",
        "Cycles can be perturbed but not stopped — the question is what state they settle into",
        "Climate is the long-term pattern; weather is the day-to-day case",
      ],
      keyVocabulary: [
        "atmosphere",
        "carbon cycle",
        "greenhouse effect",
        "fossil fuel",
        "igneous",
        "sedimentary",
        "metamorphic",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-chem-y9-atomic-structure",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "Chemistry",
      topic: "Atomic structure",
      blurb:
        "Protons, neutrons and electrons — the structure inside an atom and how it explains the periodic table.",
      programmeOfStudy:
        "Pupils should learn a simple (Dalton) atomic model; differences between atoms, elements and compounds; chemical symbols and formulae for elements and compounds; conservation of mass changes of state and chemical reactions; and the structure of atoms in terms of protons, neutrons and electrons (with electron configurations for the first 20 elements).",
      learningOutcomes: [
        "Describe the structure of the atom in terms of nucleus and electron shells.",
        "State the relative mass and charge of protons, neutrons and electrons.",
        "Define atomic number and mass number and use them to identify protons, neutrons and electrons in an atom.",
        "Write the electron configuration of the first 20 elements.",
        "Explain how Rutherford's gold-leaf experiment changed the model of the atom.",
      ],
      criticalConcepts: [
        "The atom is mostly empty space",
        "Electron configuration determines chemistry — it explains the periodic table",
        "Scientific models are revised when evidence demands it",
      ],
      keyVocabulary: [
        "atom",
        "proton",
        "neutron",
        "electron",
        "nucleus",
        "atomic number",
        "mass number",
        "isotope",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-chem-y9-energetics",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "Chemistry",
      topic: "Energetics of reactions",
      blurb:
        "Exothermic and endothermic reactions, and how to measure energy change.",
      programmeOfStudy:
        "Pupils should learn energy changes on changes of state (qualitative); exothermic and endothermic chemical reactions (qualitative); and the application of energy considerations to evaluating chemical processes.",
      learningOutcomes: [
        "Distinguish between exothermic and endothermic reactions, with examples.",
        "Sketch and interpret energy level (reaction profile) diagrams for both types.",
        "Plan an experiment to measure temperature change during a reaction.",
        "Apply ideas of energy change to evaluate a practical process (hand warmer, cool pack).",
        "Identify sources of error in calorimetry experiments.",
      ],
      criticalConcepts: [
        "Energy is conserved — released energy went somewhere",
        "Exo/endo describes the surroundings, not the reaction's destiny",
        "A reaction profile encodes both energy change and activation energy",
      ],
      keyVocabulary: [
        "exothermic",
        "endothermic",
        "activation energy",
        "reaction profile",
        "calorimetry",
        "enthalpy",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-chem-y9-materials",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "Chemistry",
      topic: "Materials and recycling",
      blurb:
        "Ceramics, polymers and composites — and the case for recycling Earth's finite resources.",
      programmeOfStudy:
        "Pupils should learn the properties of ceramics, polymers and composites (qualitative); Earth as a source of limited resources and the efficacy of recycling; and the carbon cycle.",
      learningOutcomes: [
        "Distinguish between ceramics, polymers and composites and give examples of each.",
        "Relate the properties of a material to its use.",
        "Explain why recycling some materials is more energy-efficient than producing them from raw materials.",
        "Evaluate the environmental cost of producing and disposing of a chosen material.",
        "Distinguish between renewable and finite resources.",
      ],
      criticalConcepts: [
        "Properties drive uses — selection is engineering, not preference",
        "Recycling has its own energy and water cost; sometimes it is still the right choice",
        "Finite resources are a constraint on every product decision",
      ],
      keyVocabulary: [
        "ceramic",
        "polymer",
        "composite",
        "recycling",
        "finite",
        "renewable",
        "sustainability",
      ],
      suggestedMinutes: 40,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },

    // =================================================================
    // PHYSICS — KS3
    // =================================================================
    {
      id: "ks3-phys-y7-forces",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "Physics",
      topic: "Forces and their effects",
      blurb:
        "Contact and non-contact forces, balanced and unbalanced — and what they do to motion.",
      programmeOfStudy:
        "Pupils should learn forces as pushes or pulls, arising from the interaction between two objects; using force arrows in diagrams, adding forces in one dimension, balanced and unbalanced forces; moment as the turning effect of a force; forces: associated with deforming objects; stretching and squashing — springs; with rubbing and friction between surfaces, with sliding between solids; pressure in liquids, increasing with depth.",
      learningOutcomes: [
        "Identify forces as contact (friction, tension, normal) or non-contact (gravity, magnetism).",
        "Draw a free-body diagram and add forces acting along a single line.",
        "Predict the motion of an object from the resultant force.",
        "Investigate Hooke's law and extend it to plot a force–extension graph.",
        "Calculate the moment of a force about a pivot.",
      ],
      criticalConcepts: [
        "Forces come in pairs — Newton's third law",
        "An object at rest has balanced forces; an accelerating object has unbalanced forces",
        "A moment is force × perpendicular distance from the pivot",
      ],
      keyVocabulary: [
        "force",
        "newton",
        "resultant",
        "friction",
        "tension",
        "moment",
        "pivot",
        "Hooke's law",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-phys-y7-sound",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "Physics",
      topic: "Sound waves and hearing",
      blurb:
        "How sound is produced, how it travels, and how the ear detects it.",
      programmeOfStudy:
        "Pupils should learn frequencies of sound waves, measured in hertz (Hz); echoes, reflection and absorption of sound; sound needs a medium to travel, the speed of sound in air, in water, in solids; sound produced by vibrations of objects, in loud speakers, detected by their effects on microphone diaphragm and the ear drum; sound waves are longitudinal; auditory range of humans and animals.",
      learningOutcomes: [
        "Describe sound as a longitudinal wave caused by vibrations.",
        "Define frequency, amplitude and pitch, and relate amplitude to loudness.",
        "Explain why sound cannot travel through a vacuum.",
        "Compare the speed of sound in solids, liquids and gases.",
        "Describe how the ear converts vibrations into nerve impulses.",
      ],
      criticalConcepts: [
        "Sound is a vibration travelling through a medium",
        "Higher frequency = higher pitch; larger amplitude = louder",
        "All sound needs something to travel through — that something matters",
      ],
      keyVocabulary: [
        "frequency",
        "amplitude",
        "pitch",
        "longitudinal",
        "vibration",
        "echo",
        "hertz",
      ],
      suggestedMinutes: 40,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-phys-y7-energy",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "Physics",
      topic: "Energy stores and transfers",
      blurb:
        "Energy is conserved — it moves between stores by heating, working, radiating and electrical transfer.",
      programmeOfStudy:
        "Pupils should learn comparing energy values of different foods (from labels) (kJ); comparing power ratings of appliances in watts (W, kW); comparing amounts of energy transferred (J, kJ, kW hour); energy as a quantity that can be stored or transferred; the law of conservation of energy; the distinction between energy stores and energy transfers.",
      learningOutcomes: [
        "Identify the main energy stores (kinetic, gravitational, elastic, thermal, chemical, magnetic, nuclear) in a system.",
        "Describe energy transfers between stores using arrows or Sankey diagrams.",
        "State the principle of conservation of energy.",
        "Calculate efficiency from an input/output diagram.",
        "Compare power ratings of appliances in watts.",
      ],
      criticalConcepts: [
        "Energy is conserved — it is never created or destroyed",
        "'Wasted' energy still exists; usually it is thermal and dissipated",
        "Stores and transfers are different ideas — a transfer moves energy between stores",
      ],
      keyVocabulary: [
        "energy store",
        "transfer",
        "joule",
        "watt",
        "conservation",
        "efficiency",
        "dissipation",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-phys-y8-electricity",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "Physics",
      topic: "Electric circuits",
      blurb:
        "Current, voltage and resistance — and how they relate in series and parallel circuits.",
      programmeOfStudy:
        "Pupils should learn electric current, measured in amperes, in circuits, series and parallel circuits, currents add where branches meet and current as flow of charge; potential difference, measured in volts, battery and bulb ratings; resistance, measured in ohms, as the ratio of potential difference (p.d.) to current; differences in resistance between conducting and insulating components.",
      learningOutcomes: [
        "Draw and interpret circuit diagrams using standard symbols.",
        "Measure current and potential difference correctly in a circuit.",
        "Compare current and p.d. in series and parallel circuits.",
        "Use V = IR to calculate resistance, current or potential difference.",
        "Investigate how the length of a wire affects its resistance.",
      ],
      criticalConcepts: [
        "Current is the same all the way around a series loop",
        "Potential difference is shared in series, the same across parallel branches",
        "Resistance is a ratio — V to I — not a thing that 'opposes'",
      ],
      keyVocabulary: [
        "current",
        "ampere",
        "potential difference",
        "volt",
        "resistance",
        "ohm",
        "series",
        "parallel",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-phys-y8-light",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "Physics",
      topic: "Light: reflection, refraction and colour",
      blurb:
        "How light behaves at boundaries — and how the eye and a prism interpret white light.",
      programmeOfStudy:
        "Pupils should learn light waves travelling through a vacuum; speed of light; the transmission of light through materials: absorption, diffuse scattering and specular reflection at a surface; use of ray model to explain imaging in mirrors, the pinhole camera, the refraction of light and action of convex lens in focusing (qualitative); colours and the different frequencies of light, white light and prisms (qualitative only); differential colour effects in absorption and diffuse reflection.",
      learningOutcomes: [
        "Draw ray diagrams for reflection at a plane mirror, applying the law of reflection.",
        "Describe refraction and identify when light bends towards/away from the normal.",
        "Explain how a prism disperses white light into a spectrum.",
        "Describe how an object's colour depends on which wavelengths it reflects.",
        "Explain how the pinhole camera and the eye form images.",
      ],
      criticalConcepts: [
        "Light travels in straight lines unless it meets a boundary",
        "Colour is the wavelengths reflected, not 'in' the object",
        "Refraction happens because light changes speed in a new medium",
      ],
      keyVocabulary: [
        "reflection",
        "refraction",
        "ray",
        "spectrum",
        "wavelength",
        "incident",
        "normal",
        "lens",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-phys-y8-magnetism",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "Physics",
      topic: "Magnetism and electromagnetism",
      blurb:
        "Magnetic fields, the Earth's field, and how electricity and magnetism are linked.",
      programmeOfStudy:
        "Pupils should learn magnetic poles, attraction and repulsion; magnetic fields by plotting with compass, representation by field lines; Earth's magnetism, compass and navigation; the magnetic effect of a current, electromagnets, D.C. motors (principles only).",
      learningOutcomes: [
        "Describe the rules of magnetic attraction and repulsion.",
        "Plot a magnetic field around a bar magnet using a compass.",
        "Describe the Earth's magnetic field and how a compass works.",
        "Explain how an electromagnet is made and how its strength can be varied.",
        "Describe the basic principle of a D.C. motor.",
      ],
      criticalConcepts: [
        "Magnetic fields are invisible but real — field lines are a model of them",
        "Moving charge produces a magnetic field (and vice versa)",
        "An electromagnet's strength is engineered, not fixed",
      ],
      keyVocabulary: [
        "magnetic pole",
        "field line",
        "compass",
        "electromagnet",
        "solenoid",
        "induction",
        "motor",
      ],
      suggestedMinutes: 40,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-phys-y9-motion",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "Physics",
      topic: "Motion: speed and acceleration",
      blurb:
        "Calculating speed, interpreting motion graphs, and the basics of acceleration.",
      programmeOfStudy:
        "Pupils should learn speed and the quantitative relationship between average speed, distance and time (speed = distance ÷ time); the representation of a journey on a distance–time graph; relative motion: trains and cars passing one another.",
      learningOutcomes: [
        "Use speed = distance ÷ time to solve problems (and rearrange the formula).",
        "Interpret distance–time graphs to describe a journey.",
        "Calculate average speed from a distance–time graph.",
        "Distinguish between speed, velocity and acceleration.",
        "Describe relative motion using simple examples.",
      ],
      criticalConcepts: [
        "Average speed hides the journey — graphs reveal it",
        "Velocity is speed in a stated direction",
        "Acceleration is change in velocity, not change in position",
      ],
      keyVocabulary: [
        "speed",
        "velocity",
        "acceleration",
        "distance",
        "displacement",
        "scalar",
        "vector",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-phys-y9-space",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "Physics",
      topic: "Space physics: the Solar System and beyond",
      blurb:
        "The Sun, planets, seasons and the scale of the universe.",
      programmeOfStudy:
        "Pupils should learn gravity force, weight = mass × gravitational field strength (g), on Earth g = 10 N/kg, different on other planets and stars; gravity forces between Earth and Moon, and between Earth and Sun; our Sun as a star, other stars in our galaxy, other galaxies; the seasons and the Earth's tilt, day length at different times of year, in different hemispheres.",
      learningOutcomes: [
        "Calculate weight using W = m × g and explain why weight differs on the Moon.",
        "Explain the cause of seasons in terms of the Earth's axial tilt.",
        "Describe the relative scale of Earth, Solar System, galaxy and universe.",
        "Distinguish between a star, planet, moon and galaxy.",
        "Explain why all planets orbit the Sun (gravitational attraction).",
      ],
      criticalConcepts: [
        "Mass is intrinsic; weight depends on local gravity",
        "Seasons come from tilt, not distance",
        "The universe is bigger than intuition allows — orders of magnitude matter",
      ],
      keyVocabulary: [
        "gravity",
        "mass",
        "weight",
        "orbit",
        "axis",
        "galaxy",
        "Solar System",
        "light year",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },
    {
      id: "ks3-phys-y9-waves",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "Physics",
      topic: "Waves",
      blurb:
        "Transverse and longitudinal waves, the wave equation, and the electromagnetic spectrum.",
      programmeOfStudy:
        "Pupils should learn waves on water as undulations which travel through water with transverse motion; these waves can be reflected, and add or cancel — superposition; light waves travelling through a vacuum; speed of light; transmission of light; the electromagnetic spectrum — uses and dangers of each region (qualitative).",
      learningOutcomes: [
        "Distinguish between transverse and longitudinal waves with examples.",
        "Use the wave equation v = fλ in calculations.",
        "Describe and identify the regions of the electromagnetic spectrum and their uses.",
        "Identify which EM regions are hazardous to health and why.",
        "Describe reflection, refraction and superposition for waves.",
      ],
      criticalConcepts: [
        "All EM waves travel at the same speed in a vacuum",
        "Frequency and wavelength are inversely related (for fixed speed)",
        "A wave transfers energy without transferring matter",
      ],
      keyVocabulary: [
        "transverse",
        "longitudinal",
        "wavelength",
        "frequency",
        "amplitude",
        "electromagnetic",
        "spectrum",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Science programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study",
      },
    },

    // =================================================================
    // MATHEMATICS — KS3
    // =================================================================
    {
      id: "ks3-maths-y7-fractions-decimals-percentages",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "Mathematics",
      topic: "Fractions, decimals and percentages",
      blurb:
        "Converting between equivalent forms and using them in everyday contexts.",
      programmeOfStudy:
        "Pupils should be taught to: interpret fractions and percentages as operators; work interchangeably with terminating decimals and their corresponding fractions; define percentage as 'number of parts per hundred', interpret percentages and percentage changes as a fraction or a decimal; compare two quantities using percentages.",
      learningOutcomes: [
        "Convert between fractions, decimals and percentages fluently.",
        "Order a set of mixed-form quantities.",
        "Calculate a percentage of an amount with and without a calculator.",
        "Calculate a percentage change (increase or decrease).",
        "Apply fractions, decimals and percentages to real contexts (discount, tax, statistics).",
      ],
      criticalConcepts: [
        "All three forms are the same number in different clothes",
        "A percentage is a fraction with denominator 100",
        "A percentage change is relative — 50% off £40 is not the same as 50% off £400",
      ],
      keyVocabulary: [
        "numerator",
        "denominator",
        "equivalent",
        "percentage",
        "decimal",
        "convert",
        "proportion",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Mathematics programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study",
      },
    },
    {
      id: "ks3-maths-y7-angles",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "Mathematics",
      topic: "Angles and angle rules",
      blurb:
        "Naming angles, angle facts on straight lines and around a point, and angles in triangles.",
      programmeOfStudy:
        "Pupils should be taught to: derive and apply the properties and definitions of angles formed by parallel lines and transversals; angles in a triangle, quadrilateral and polygon; angles at a point, on a straight line, vertically opposite; apply these properties to solve problems and to find missing angles, including in geometric reasoning proofs.",
      learningOutcomes: [
        "Classify angles as acute, right, obtuse or reflex.",
        "Apply angle rules on a straight line, around a point and in vertically opposite angles.",
        "Calculate missing angles in a triangle (sum 180°) and quadrilateral (sum 360°).",
        "Apply alternate, corresponding and co-interior angle rules with parallel lines.",
        "Write short reasoning chains using correct angle vocabulary.",
      ],
      criticalConcepts: [
        "Angle facts work because of definitions, not just because",
        "A reason in geometry must name a rule",
        "Drawing a careful diagram solves half the problem",
      ],
      keyVocabulary: [
        "acute",
        "obtuse",
        "reflex",
        "vertically opposite",
        "alternate",
        "corresponding",
        "co-interior",
        "transversal",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Mathematics programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study",
      },
    },
    {
      id: "ks3-maths-y7-statistics",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "Mathematics",
      topic: "Statistics: averages and range",
      blurb:
        "Mean, median, mode and range — and choosing the right average for the data.",
      programmeOfStudy:
        "Pupils should be taught to: describe, interpret and compare observed distributions of a single variable through: appropriate graphical representation involving discrete, continuous and grouped data; and appropriate measures of central tendency (mean, mode, median) and spread (range, consideration of outliers).",
      learningOutcomes: [
        "Calculate the mean, median, mode and range from a list of values.",
        "Calculate the mean from a frequency table.",
        "Compare two data sets using an average and a measure of spread.",
        "Identify outliers and discuss whether to include them.",
        "Justify which average is most appropriate for a given context.",
      ],
      criticalConcepts: [
        "Different averages tell different truths about the same data",
        "Outliers move the mean but not the median",
        "The range is a crude measure of spread",
      ],
      keyVocabulary: [
        "mean",
        "median",
        "mode",
        "range",
        "outlier",
        "frequency",
        "distribution",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Mathematics programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study",
      },
    },
    {
      id: "ks3-maths-y8-ratio-proportion",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "Mathematics",
      topic: "Ratio and proportion",
      blurb:
        "Sharing in a ratio, scaling recipes and maps, and the difference between ratio and proportion.",
      programmeOfStudy:
        "Pupils should be taught to: use ratio notation, including reduction to simplest form; divide a given quantity into two parts in a given part:part or part:whole ratio; understand that a multiplicative relationship between two quantities can be expressed as a ratio or a fraction; solve problems involving direct and inverse proportion.",
      learningOutcomes: [
        "Simplify a ratio to its simplest form.",
        "Share a quantity in a given ratio.",
        "Solve direct proportion problems (recipes, exchange rates).",
        "Solve inverse proportion problems (speed, time, number of workers).",
        "Convert between ratio, fraction and percentage forms.",
      ],
      criticalConcepts: [
        "A ratio compares parts; a fraction compares a part to the whole",
        "Direct proportion: as one goes up, the other goes up by the same factor",
        "Inverse proportion: as one goes up, the other goes down so the product stays the same",
      ],
      keyVocabulary: [
        "ratio",
        "proportion",
        "direct",
        "inverse",
        "scale factor",
        "simplify",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Mathematics programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study",
      },
    },
    {
      id: "ks3-maths-y8-area-perimeter",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "Mathematics",
      topic: "Area, perimeter and circumference",
      blurb:
        "Areas of rectangles, triangles, parallelograms, trapezia and circles.",
      programmeOfStudy:
        "Pupils should be taught to: derive and apply formulae to calculate and solve problems involving: perimeter and area of triangles, parallelograms, trapezia; volume of cuboids (including cubes) and other prisms (including cylinders); and calculate and solve problems involving: perimeters of 2-D shapes (including circles), areas of circles and composite shapes.",
      learningOutcomes: [
        "Calculate the area of rectangles, triangles, parallelograms and trapezia.",
        "Calculate the circumference and area of a circle.",
        "Calculate the area of a composite shape.",
        "Choose the right formula for a real-world problem (carpet, paint, fencing).",
        "Use π appropriately, leaving answers in exact form when asked.",
      ],
      criticalConcepts: [
        "Area is two-dimensional, perimeter is one-dimensional — units make this visible",
        "Composite shapes decompose into shapes you already know",
        "A formula is a packaged piece of geometric reasoning",
      ],
      keyVocabulary: [
        "area",
        "perimeter",
        "circumference",
        "radius",
        "diameter",
        "pi",
        "parallelogram",
        "trapezium",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Mathematics programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study",
      },
    },
    {
      id: "ks3-maths-y8-probability",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "Mathematics",
      topic: "Probability basics",
      blurb:
        "Theoretical and experimental probability — and listing outcomes systematically.",
      programmeOfStudy:
        "Pupils should be taught to: record, describe and analyse the frequency of outcomes of simple probability experiments involving randomness, fairness, equally and unequally likely outcomes; relate relative expected frequencies to theoretical probability, using appropriate language and the 0–1 probability scale.",
      learningOutcomes: [
        "Place events on the 0–1 probability scale.",
        "Calculate the probability of a single event using P(event) = favourable ÷ total.",
        "List all outcomes of a two-event experiment systematically (sample space diagram).",
        "Compare relative frequency from an experiment to theoretical probability.",
        "Recognise mutually exclusive events and use P(A or B) = P(A) + P(B).",
      ],
      criticalConcepts: [
        "Probability predicts the long run, not the next event",
        "Mutually exclusive events cannot both happen at once",
        "More trials closes the gap between experimental and theoretical probability",
      ],
      keyVocabulary: [
        "outcome",
        "event",
        "probability",
        "relative frequency",
        "sample space",
        "mutually exclusive",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Mathematics programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study",
      },
    },
    {
      id: "ks3-maths-y9-pythagoras",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "Mathematics",
      topic: "Pythagoras' theorem",
      blurb:
        "The relationship between the sides of a right-angled triangle, and how to use it.",
      programmeOfStudy:
        "Pupils should be taught to: use Pythagoras' theorem to solve problems involving right-angled triangles; understand and use the relationship between parallel and perpendicular lines; understand and use the standard conventions for labelling and referring to the sides and angles of triangles.",
      learningOutcomes: [
        "State Pythagoras' theorem.",
        "Identify the hypotenuse as the side opposite the right angle.",
        "Find the length of the hypotenuse given the other two sides.",
        "Find the length of a shorter side given the hypotenuse and one side.",
        "Apply Pythagoras to real-life problems (ladders, screen sizes, navigation).",
      ],
      criticalConcepts: [
        "Pythagoras only works in right-angled triangles",
        "The hypotenuse is always the longest side and opposite the right angle",
        "Square root, then check — does the answer make sense?",
      ],
      keyVocabulary: [
        "hypotenuse",
        "right angle",
        "square",
        "square root",
        "theorem",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Mathematics programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study",
      },
    },
    {
      id: "ks3-maths-y9-quadratics-intro",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "Mathematics",
      topic: "Introduction to quadratic expressions",
      blurb:
        "Expanding double brackets, factorising simple quadratics, and plotting y = x².",
      programmeOfStudy:
        "Pupils should be taught to: simplify and manipulate algebraic expressions to maintain equivalence by: collecting like terms; multiplying a single term over a bracket; taking out common factors; expanding products of two binomials.",
      learningOutcomes: [
        "Expand a pair of brackets (a + b)(c + d) using the grid or FOIL method.",
        "Factorise a quadratic of the form x² + bx + c.",
        "Plot a quadratic curve y = x² and recognise its shape.",
        "Identify the line of symmetry of a simple quadratic graph.",
        "Solve a quadratic equation of the form x² + bx + c = 0 by factorising.",
      ],
      criticalConcepts: [
        "Expanding and factorising are inverse operations",
        "A quadratic graph is a parabola with one line of symmetry",
        "A product is zero only when one of its factors is zero",
      ],
      keyVocabulary: [
        "quadratic",
        "expand",
        "factorise",
        "binomial",
        "parabola",
        "coefficient",
        "root",
      ],
      suggestedMinutes: 50,
      source: {
        name: "UK DfE — Mathematics programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study",
      },
    },
    {
      id: "ks3-maths-y9-transformations",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "Mathematics",
      topic: "Geometric transformations",
      blurb:
        "Translations, rotations, reflections and enlargements on a coordinate grid.",
      programmeOfStudy:
        "Pupils should be taught to: identify properties of, and describe the results of, translations, rotations and reflections applied to given figures; identify and construct congruent triangles, and construct similar shapes by enlargement, with and without coordinate grids.",
      learningOutcomes: [
        "Translate a shape by a vector and describe a translation using a column vector.",
        "Reflect a shape in a given mirror line, including y = x and y = -x.",
        "Rotate a shape about a given point, by 90°, 180° or 270°.",
        "Enlarge a shape from a given centre with a given scale factor.",
        "Fully describe a single transformation, including all required information.",
      ],
      criticalConcepts: [
        "Translation, reflection and rotation preserve size and shape (congruence)",
        "Enlargement changes size but preserves shape (similarity)",
        "A 'full description' must give every parameter the transformation needs",
      ],
      keyVocabulary: [
        "translation",
        "reflection",
        "rotation",
        "enlargement",
        "scale factor",
        "centre",
        "congruent",
        "similar",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Mathematics programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study",
      },
    },

    // =================================================================
    // ENGLISH — KS3
    // =================================================================
    {
      id: "ks3-eng-y7-creative-writing",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "English",
      topic: "Creative writing: opening a story",
      blurb:
        "Planning and drafting a story opening that establishes character, setting and atmosphere.",
      programmeOfStudy:
        "Pupils should be taught to write accurately, fluently, effectively and at length for pleasure and information through: writing for a wide range of purposes and audiences, including stories, scripts, poetry and other imaginative writing; applying their growing knowledge of vocabulary, grammar and text structure to their writing and selecting the appropriate form.",
      learningOutcomes: [
        "Plan a story opening using a structure (e.g. setting → character → hook).",
        "Use sensory detail (sight, sound, smell, touch) to establish atmosphere.",
        "Choose precise vocabulary over general nouns and weak verbs.",
        "Vary sentence length and structure for effect.",
        "Edit a draft against specific success criteria.",
      ],
      criticalConcepts: [
        "Show through specific detail rather than tell with generalisation",
        "Sentence length controls pace",
        "Editing is rewriting, not just proofreading",
      ],
      keyVocabulary: [
        "atmosphere",
        "characterisation",
        "sensory",
        "imagery",
        "metaphor",
        "simile",
        "exposition",
      ],
      suggestedMinutes: 50,
      source: {
        name: "UK DfE — English programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-english-programmes-of-study",
      },
    },
    {
      id: "ks3-eng-y7-poetry-analysis",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "English",
      topic: "Reading poetry: imagery and form",
      blurb:
        "Reading and analysing a poem — what does it say, how does it say it, and why does that matter?",
      programmeOfStudy:
        "Pupils should be taught to read critically through: knowing how language, including figurative language, vocabulary choice, grammar, text structure and organisational features, presents meaning; recognising a range of poetic conventions and understanding how these have been used.",
      learningOutcomes: [
        "Identify imagery (metaphor, simile, personification) in a poem and explain its effect.",
        "Recognise common poetic forms (sonnet, ballad, free verse) and the effect of form on meaning.",
        "Use the rhyme scheme and rhythm to comment on mood and pace.",
        "Write a short PEE (point–evidence–explanation) paragraph analysing a chosen image.",
        "Compare two poems on a shared theme.",
      ],
      criticalConcepts: [
        "Form is meaning — a sonnet is not a vehicle, it shapes what can be said",
        "Effect is more important than label — naming a metaphor is the start, not the end",
        "A good analytical paragraph quotes precisely and zooms in on a word",
      ],
      keyVocabulary: [
        "imagery",
        "metaphor",
        "simile",
        "personification",
        "rhyme",
        "rhythm",
        "stanza",
        "form",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — English programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-english-programmes-of-study",
      },
    },
    {
      id: "ks3-eng-y7-grammar-punctuation",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "English",
      topic: "Sentence structure and punctuation",
      blurb:
        "Simple, compound and complex sentences — and using commas, semicolons and colons correctly.",
      programmeOfStudy:
        "Pupils should be taught to consolidate and build on their knowledge of grammar and vocabulary through: studying the effectiveness and impact of the grammatical features of the texts they read; drawing on new vocabulary and grammatical constructions from their reading and listening; using Standard English confidently in their own writing and speech.",
      learningOutcomes: [
        "Identify and write simple, compound and complex sentences.",
        "Use commas correctly in lists, after fronted adverbials and with subordinate clauses.",
        "Use semicolons to join two related main clauses.",
        "Use colons to introduce a list or an explanation.",
        "Edit a piece of writing to vary sentence structure for effect.",
      ],
      criticalConcepts: [
        "Punctuation encodes structure — a comma is a hinge, not a pause",
        "Sentence variety controls reader effort",
        "Standard English is a register, not the only correct way to speak",
      ],
      keyVocabulary: [
        "clause",
        "main clause",
        "subordinate clause",
        "conjunction",
        "semicolon",
        "colon",
        "comma",
      ],
      suggestedMinutes: 40,
      source: {
        name: "UK DfE — English programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-english-programmes-of-study",
      },
    },
    {
      id: "ks3-eng-y8-shakespeare-intro",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "English",
      topic: "Introducing Shakespeare: a scene from a play",
      blurb:
        "Reading a short scene from Shakespeare — making sense of unfamiliar language, then character and theme.",
      programmeOfStudy:
        "Pupils should be taught to read a wide range of fiction and non-fiction, including in particular whole books, short stories, poems and plays with a wide coverage of genres, historical periods, forms and authors. This includes at least two Shakespeare plays.",
      learningOutcomes: [
        "Use context to work out the meaning of unfamiliar Shakespearean vocabulary.",
        "Summarise the action of a scene in modern English.",
        "Identify a key character moment and what it reveals.",
        "Discuss the dramatic effect of a chosen technique (aside, soliloquy, dramatic irony).",
        "Write a short paragraph linking a scene to a theme of the play.",
      ],
      criticalConcepts: [
        "Shakespeare's language is unfamiliar, not impossible — work outwards from context",
        "A play is performed, not just read — staging matters",
        "Theme is what the play is about, not what happens in it",
      ],
      keyVocabulary: [
        "soliloquy",
        "aside",
        "dramatic irony",
        "iambic pentameter",
        "tragedy",
        "comedy",
        "theme",
      ],
      suggestedMinutes: 50,
      source: {
        name: "UK DfE — English programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-english-programmes-of-study",
      },
    },
    {
      id: "ks3-eng-y8-non-fiction-reading",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "English",
      topic: "Reading non-fiction: bias and viewpoint",
      blurb:
        "Reading newspaper articles for explicit and implicit meaning, and detecting bias.",
      programmeOfStudy:
        "Pupils should be taught to understand increasingly challenging texts through: learning new vocabulary, relating it explicitly to known vocabulary and understanding it with the help of context and dictionaries; making inferences and referring to evidence in the text; distinguishing between statements which are supported by evidence and those which are not.",
      learningOutcomes: [
        "Distinguish between fact and opinion in a non-fiction text.",
        "Identify writer's viewpoint and the language choices that signal it.",
        "Compare how two writers present the same issue.",
        "Make inferences supported by quotation from the text.",
        "Recognise common rhetorical and persuasive devices in journalism.",
      ],
      criticalConcepts: [
        "Bias is unavoidable — recognising it is the skill",
        "Inference is supported reading between the lines",
        "Two articles on the same event can both be true and very different",
      ],
      keyVocabulary: [
        "bias",
        "viewpoint",
        "inference",
        "fact",
        "opinion",
        "rhetoric",
        "source",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — English programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-english-programmes-of-study",
      },
    },
    {
      id: "ks3-eng-y9-novel-study",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "English",
      topic: "Studying a novel: character and structure",
      blurb:
        "Analysing how a novelist builds a character across a whole text — using a 19th-century novel as the case.",
      programmeOfStudy:
        "Pupils should be taught to read a wide range of fiction and non-fiction, including in particular whole books, short stories, poems and plays with a wide coverage of genres, historical periods, forms and authors, including pre-1914 literature; understanding how the work of dramatists is communicated effectively through performance and how alternative staging allows for different interpretations of a play.",
      learningOutcomes: [
        "Track a character across multiple chapters using quotation evidence.",
        "Identify a writer's structural choices (chapter openings, time-shifts, pacing) and their effect.",
        "Analyse how social and historical context shapes a character or theme.",
        "Write an extended analytical paragraph using a clear evidence-led structure.",
        "Compare two characters on a shared trait, citing both texts.",
      ],
      criticalConcepts: [
        "Characters are constructions — every detail is a choice",
        "Context informs meaning but does not replace it",
        "Structure is not just plot — it is how the reader is led through",
      ],
      keyVocabulary: [
        "protagonist",
        "antagonist",
        "characterisation",
        "narrator",
        "context",
        "structure",
        "motif",
        "foil",
      ],
      suggestedMinutes: 50,
      source: {
        name: "UK DfE — English programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-english-programmes-of-study",
      },
    },
    {
      id: "ks3-eng-y9-speaking-listening",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "English",
      topic: "Speaking and listening: structured debate",
      blurb:
        "Researching, structuring and delivering a short formal argument — and listening critically to others.",
      programmeOfStudy:
        "Pupils should be taught to speak confidently and effectively, including through: using Standard English confidently in a range of formal and informal contexts, including classroom discussion; giving short speeches and presentations, expressing their own ideas and keeping to the point; participating in formal debates and structured discussions, summarising and/or building on what has been said.",
      learningOutcomes: [
        "Research a motion using at least two credible sources.",
        "Structure an argument using claim → reason → evidence.",
        "Deliver a short speech (2–3 minutes) with appropriate pace and tone.",
        "Rebut a counter-argument by addressing it directly.",
        "Take structured notes on another speaker to formulate a response.",
      ],
      criticalConcepts: [
        "A claim without evidence is an opinion",
        "Listening well is half of arguing well",
        "Tone and pace persuade as much as content",
      ],
      keyVocabulary: [
        "motion",
        "proposition",
        "opposition",
        "rebuttal",
        "evidence",
        "claim",
        "register",
      ],
      suggestedMinutes: 50,
      source: {
        name: "UK DfE — English programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-english-programmes-of-study",
      },
    },
    {
      id: "ks3-eng-y9-analytical-essay",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "English",
      topic: "Writing an analytical essay",
      blurb:
        "Planning and writing an extended analytical response to a literary text.",
      programmeOfStudy:
        "Pupils should be taught to write accurately, fluently, effectively and at length for pleasure and information through: writing for a wide range of purposes and audiences, including well-structured formal expository and narrative essays; summarising and organising material, and supporting ideas and arguments with any necessary factual detail.",
      learningOutcomes: [
        "Write a clear thesis statement in response to an essay question.",
        "Structure an essay with introduction, body paragraphs and conclusion.",
        "Build paragraphs using a topic sentence → evidence → analysis → link structure.",
        "Embed quotations smoothly within a sentence.",
        "Edit a draft for argument clarity, not just spelling.",
      ],
      criticalConcepts: [
        "A thesis answers the question directly — and then the essay proves it",
        "Analysis explains how and why; evidence shows what",
        "An essay has a single argument; everything serves it",
      ],
      keyVocabulary: [
        "thesis",
        "topic sentence",
        "analysis",
        "evidence",
        "embed",
        "argument",
        "conclusion",
      ],
      suggestedMinutes: 50,
      source: {
        name: "UK DfE — English programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-english-programmes-of-study",
      },
    },

    // =================================================================
    // HISTORY — KS3
    // =================================================================
    {
      id: "ks3-hist-y7-norman-conquest",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "History",
      topic: "The Norman Conquest, 1066",
      blurb:
        "Why William won at Hastings, and how the Normans changed England forever.",
      programmeOfStudy:
        "Pupils should be taught about the development of Church, state and society in Medieval Britain 1066–1509, including the Norman Conquest. They should know and understand the history of Britain as a coherent, chronological narrative, from the earliest times to the present day.",
      learningOutcomes: [
        "Identify the three claimants to the English throne in 1066 and the strength of each claim.",
        "Explain the events and key turning points of the Battle of Hastings.",
        "Evaluate the reasons for William's victory (luck, leadership, weather, Harold's choices).",
        "Describe how the Normans secured their rule (castles, Domesday Book, feudal system).",
        "Compare a primary source (Bayeux Tapestry) with later interpretations.",
      ],
      criticalConcepts: [
        "Causation: outcomes depend on multiple, interacting factors",
        "A 'turning point' is judged in hindsight — the people in it did not know",
        "Sources reflect the perspective of who made them",
      ],
      keyVocabulary: [
        "claimant",
        "feudal system",
        "motte and bailey",
        "Domesday Book",
        "Witan",
        "vassal",
        "tapestry",
      ],
      suggestedMinutes: 50,
      source: {
        name: "UK DfE — History programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-history-programmes-of-study",
      },
    },
    {
      id: "ks3-hist-y7-magna-carta",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "History",
      topic: "Magna Carta and the limits of royal power",
      blurb:
        "Why the barons forced King John to seal Magna Carta in 1215 — and what it really did.",
      programmeOfStudy:
        "Pupils should be taught about the development of Church, state and society in Medieval Britain 1066–1509, including Magna Carta and the emergence of Parliament. They should construct informed responses by selecting and organising relevant historical information.",
      learningOutcomes: [
        "Describe the reasons for the barons' rebellion against King John.",
        "Identify two or three key clauses of Magna Carta and what they actually said.",
        "Evaluate the immediate significance of Magna Carta (and how little changed at first).",
        "Trace how Magna Carta has been reinterpreted across the centuries.",
        "Construct a short written response on the long-term significance of 1215.",
      ],
      criticalConcepts: [
        "Significance is a judgement made later, not a property of the event",
        "Most of Magna Carta was about narrow baronial grievances, not democracy",
        "Symbols are reinterpreted: the meaning of the document changed across time",
      ],
      keyVocabulary: [
        "Magna Carta",
        "baron",
        "charter",
        "clause",
        "Runnymede",
        "significance",
        "interpretation",
      ],
      suggestedMinutes: 50,
      source: {
        name: "UK DfE — History programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-history-programmes-of-study",
      },
    },
    {
      id: "ks3-hist-y7-black-death",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "History",
      topic: "The Black Death",
      blurb:
        "How a 14th-century pandemic reshaped medieval England — society, economy, faith.",
      programmeOfStudy:
        "Pupils should be taught about the development of Church, state and society in Medieval Britain 1066–1509, including the Black Death and its social and economic impact. They should gain and deploy a historically grounded understanding of abstract terms such as 'empire', 'civilisation', 'parliament' and 'peasantry'.",
      learningOutcomes: [
        "Describe how the plague spread to Europe and to England.",
        "Identify the symptoms and contemporary explanations for the disease.",
        "Explain the short-term effects (mortality, religious crisis, breakdown of services).",
        "Evaluate the long-term consequences for peasants and the labour market.",
        "Link the Black Death to the Peasants' Revolt of 1381 as a chain of causation.",
      ],
      criticalConcepts: [
        "Consequences ripple — labour shortage led to higher wages and shifted power",
        "Medieval explanations (miasma, divine punishment) were rational within their worldview",
        "The same event has different impacts on different social groups",
      ],
      keyVocabulary: [
        "plague",
        "pandemic",
        "miasma",
        "peasant",
        "feudalism",
        "Peasants' Revolt",
        "labour shortage",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — History programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-history-programmes-of-study",
      },
    },
    {
      id: "ks3-hist-y8-tudors-reformation",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "History",
      topic: "The English Reformation",
      blurb:
        "Why Henry VIII broke with Rome — and the religious upheaval that followed under his children.",
      programmeOfStudy:
        "Pupils should be taught about the development of Church, state and society in Britain 1509–1745, including the English Reformation and Counter Reformation (Henry VIII to Mary I); the Elizabethan religious settlement and conflict with Catholics (including Scotland, Spain and Ireland).",
      learningOutcomes: [
        "Identify the political, personal and religious reasons for Henry VIII's break with Rome.",
        "Describe the Dissolution of the Monasteries and its impact.",
        "Compare the religious changes under Edward VI, Mary I and Elizabeth I.",
        "Evaluate which Tudor monarch made the most significant religious change.",
        "Use sources to discuss the experience of ordinary people during the Reformation.",
      ],
      criticalConcepts: [
        "Personal motives (an heir) can drive systemic change",
        "Religious change touched every village, not just the court",
        "Continuity and change run together — the parish church survived, but its rules did not",
      ],
      keyVocabulary: [
        "Reformation",
        "Pope",
        "monastery",
        "Act of Supremacy",
        "Protestant",
        "Catholic",
        "schism",
      ],
      suggestedMinutes: 50,
      source: {
        name: "UK DfE — History programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-history-programmes-of-study",
      },
    },
    {
      id: "ks3-hist-y8-civil-war",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "History",
      topic: "The English Civil War",
      blurb:
        "Why Parliament went to war with its King in the 1640s — and what it meant to execute Charles I.",
      programmeOfStudy:
        "Pupils should be taught about the development of Church, state and society in Britain 1509–1745, including the causes and events of the civil wars throughout Britain; the Interregnum (including Cromwell in Ireland); the Restoration, Glorious Revolution and power of Parliament.",
      learningOutcomes: [
        "Identify the long-term and short-term causes of the Civil War (religion, money, power).",
        "Describe the key events from the Petition of Right to the execution of Charles I.",
        "Evaluate Cromwell as a leader — hero or tyrant?",
        "Explain how the Civil War shifted the balance of power between Crown and Parliament.",
        "Use a source on the trial of Charles I to discuss contemporary reactions.",
      ],
      criticalConcepts: [
        "Causation can be cumulative — small grievances compound",
        "Historical judgement (Cromwell as hero or villain) depends on values",
        "Constitutional change can be revolutionary even without a revolution",
      ],
      keyVocabulary: [
        "Cavalier",
        "Roundhead",
        "Parliamentarian",
        "Royalist",
        "Petition of Right",
        "Interregnum",
        "regicide",
      ],
      suggestedMinutes: 50,
      source: {
        name: "UK DfE — History programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-history-programmes-of-study",
      },
    },
    {
      id: "ks3-hist-y8-empire-slavery",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "History",
      topic: "Britain, empire and the transatlantic slave trade",
      blurb:
        "How Britain grew rich from the slave trade — and how, eventually, the trade was abolished.",
      programmeOfStudy:
        "Pupils should be taught about ideas, political power, industry and empire: Britain, 1745–1901, including Britain's transatlantic slave trade: its effects and its eventual abolition.",
      learningOutcomes: [
        "Describe the operation of the triangular trade between Europe, Africa and the Americas.",
        "Explain the conditions of the Middle Passage and the plantation system.",
        "Identify key abolitionists (Equiano, Wilberforce, Clarkson, the Quakers) and the campaign against the trade.",
        "Evaluate the reasons for the abolition of the slave trade in 1807.",
        "Use first-hand testimony (e.g. Equiano's narrative) as historical evidence.",
      ],
      criticalConcepts: [
        "Empire and economy were inseparable — wealth has a history",
        "Abolition involved enslaved people's resistance, not only white reformers",
        "Some sources speak for the silenced — read them carefully and centrally",
      ],
      keyVocabulary: [
        "abolition",
        "triangular trade",
        "Middle Passage",
        "plantation",
        "Quaker",
        "abolitionist",
        "Equiano",
      ],
      suggestedMinutes: 50,
      source: {
        name: "UK DfE — History programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-history-programmes-of-study",
      },
    },
    {
      id: "ks3-hist-y9-first-world-war",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "History",
      topic: "The First World War",
      blurb:
        "Causes, trench experience and consequences of the Great War, 1914–18.",
      programmeOfStudy:
        "Pupils should be taught about challenges for Britain, Europe and the wider world 1901 to the present day, including the First World War and the Peace Settlement.",
      learningOutcomes: [
        "Identify the long-term causes of the war (MAIN: Militarism, Alliances, Imperialism, Nationalism).",
        "Explain the short-term trigger (Sarajevo, July Crisis) and how local crisis escalated.",
        "Describe daily life in the trenches using soldiers' accounts and poetry.",
        "Evaluate the Treaty of Versailles as a peace settlement.",
        "Construct a balanced judgement on a key question (e.g. who was most responsible?).",
      ],
      criticalConcepts: [
        "Cause and trigger are different — the system was loaded before Sarajevo",
        "Soldier testimony is both evidence and shaped by genre and audience",
        "A peace can sow the next war — Versailles is the classic case",
      ],
      keyVocabulary: [
        "alliance",
        "militarism",
        "imperialism",
        "trench warfare",
        "armistice",
        "Versailles",
        "no man's land",
      ],
      suggestedMinutes: 50,
      source: {
        name: "UK DfE — History programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-history-programmes-of-study",
      },
    },
    {
      id: "ks3-hist-y9-nazi-germany",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "History",
      topic: "The rise of Nazi Germany",
      blurb:
        "How a democracy became a dictatorship — Weimar to Hitler, 1919–1934.",
      programmeOfStudy:
        "Pupils should be taught about challenges for Britain, Europe and the wider world 1901 to the present day, including the inter-war years: the Great Depression and the rise of dictators.",
      learningOutcomes: [
        "Identify the weaknesses of the Weimar Republic.",
        "Explain how the Great Depression made Nazi support grow rapidly between 1929 and 1932.",
        "Describe Hitler's appointment as Chancellor and the steps to dictatorship by 1934.",
        "Evaluate the role of propaganda, terror and consent in maintaining Nazi rule.",
        "Use posters and speeches as historical sources, attending to provenance.",
      ],
      criticalConcepts: [
        "Democracies can fail from within — not always by force",
        "Economic crisis radicalises politics",
        "Propaganda is most effective when it tells people what they already want to believe",
      ],
      keyVocabulary: [
        "Weimar",
        "hyperinflation",
        "propaganda",
        "Reichstag",
        "Enabling Act",
        "dictatorship",
        "fascism",
      ],
      suggestedMinutes: 50,
      source: {
        name: "UK DfE — History programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-history-programmes-of-study",
      },
    },
    {
      id: "ks3-hist-y9-cold-war",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "History",
      topic: "The Cold War: origins to Cuba",
      blurb:
        "How wartime allies became nuclear rivals — and how the world came close to catastrophe in 1962.",
      programmeOfStudy:
        "Pupils should be taught about challenges for Britain, Europe and the wider world 1901 to the present day, including the end of empire and the Cold War.",
      learningOutcomes: [
        "Explain the breakdown of the wartime alliance between the USA and USSR.",
        "Identify the key Cold War flashpoints: Berlin Blockade, Korea, Hungary, Berlin Wall, Cuba.",
        "Describe the Cuban Missile Crisis day by day and how it was resolved.",
        "Evaluate the role of personal leadership (Kennedy, Khrushchev) in October 1962.",
        "Use a contemporary source to discuss how the Crisis was experienced.",
      ],
      criticalConcepts: [
        "A 'cold' war was hot in many places — Korea, Vietnam, the Congo",
        "Brinkmanship is a strategy with no margin for error",
        "Ideology and national interest both drive foreign policy",
      ],
      keyVocabulary: [
        "Cold War",
        "Iron Curtain",
        "containment",
        "NATO",
        "Warsaw Pact",
        "brinkmanship",
        "détente",
      ],
      suggestedMinutes: 50,
      source: {
        name: "UK DfE — History programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-history-programmes-of-study",
      },
    },

    // =================================================================
    // GEOGRAPHY — KS3
    // =================================================================
    {
      id: "ks3-geo-y7-map-skills",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "Geography",
      topic: "Map skills and the OS map",
      blurb:
        "Grid references, scale, contour lines and using an Ordnance Survey map to read a landscape.",
      programmeOfStudy:
        "Pupils should build on their knowledge of globes, maps and atlases and apply and develop this knowledge routinely in the classroom and in the field; interpret Ordnance Survey maps in the classroom and the field, including using grid references and scale, topographical and other thematic mapping, and aerial and satellite photographs.",
      learningOutcomes: [
        "Use four-figure and six-figure grid references to locate a feature.",
        "Calculate distance on a map using the scale.",
        "Identify contour lines and infer the shape of the land from spacing.",
        "Use map symbols to interpret an OS map.",
        "Plan a route on an OS map, taking gradient and distance into account.",
      ],
      criticalConcepts: [
        "Eastings before northings — along the corridor, up the stairs",
        "Scale is a ratio — 1:25 000 means 1 cm on the map is 250 m on the ground",
        "Maps are abstractions — they choose what to show",
      ],
      keyVocabulary: [
        "grid reference",
        "scale",
        "contour",
        "symbol",
        "gradient",
        "key",
        "eastings",
        "northings",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Geography programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-geography-programmes-of-study",
      },
    },
    {
      id: "ks3-geo-y7-weather-climate",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "Geography",
      topic: "Weather and climate",
      blurb:
        "How weather forms in the UK, and the difference between weather and climate.",
      programmeOfStudy:
        "Pupils should understand, through the use of detailed place-based exemplars at a variety of scales, the key processes in physical geography relating to: weather and climate, including the change in climate from the Ice Age to the present.",
      learningOutcomes: [
        "Distinguish between weather and climate.",
        "Describe the four UK air masses and the weather each brings.",
        "Explain how relief, frontal and convectional rainfall form.",
        "Read and interpret a synoptic weather chart.",
        "Compare the UK climate with a contrasting climate elsewhere in the world.",
      ],
      criticalConcepts: [
        "Weather is short-term and local; climate is long-term and regional",
        "Rainfall has multiple mechanisms — relief, frontal, convectional",
        "A weather chart is a snapshot of moving systems",
      ],
      keyVocabulary: [
        "weather",
        "climate",
        "air mass",
        "front",
        "precipitation",
        "isobar",
        "depression",
        "anticyclone",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Geography programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-geography-programmes-of-study",
      },
    },
    {
      id: "ks3-geo-y7-rivers",
      keyStage: "KS3",
      yearGroup: 7,
      subject: "Geography",
      topic: "Rivers and their landscapes",
      blurb:
        "How rivers shape the land from source to mouth — erosion, transport and deposition.",
      programmeOfStudy:
        "Pupils should understand the key processes in physical geography relating to: geological timescales and plate tectonics; rocks, weathering and soils; weather and climate; and the hydrological cycle including rivers and the water cycle.",
      learningOutcomes: [
        "Label the long profile of a river from source to mouth.",
        "Describe the four processes of river erosion and the four of transport.",
        "Explain the formation of a waterfall, a meander and an ox-bow lake.",
        "Compare the upper, middle and lower courses of a river.",
        "Use a labelled case study (e.g. the River Tees) to support written answers.",
      ],
      criticalConcepts: [
        "A river is an energy system — what it can carry depends on velocity",
        "Landforms are the product of processes acting over time",
        "Erosion in one place is deposition somewhere else",
      ],
      keyVocabulary: [
        "source",
        "mouth",
        "erosion",
        "transportation",
        "deposition",
        "meander",
        "ox-bow lake",
        "flood plain",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Geography programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-geography-programmes-of-study",
      },
    },
    {
      id: "ks3-geo-y8-tectonics",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "Geography",
      topic: "Plate tectonics: earthquakes and volcanoes",
      blurb:
        "Why the Earth's surface moves — and what happens at plate boundaries.",
      programmeOfStudy:
        "Pupils should understand the key processes in physical geography relating to: geological timescales and plate tectonics; rocks, weathering and soils; and how human and physical processes interact to influence and change landscapes, environments and the climate.",
      learningOutcomes: [
        "Describe the structure of the Earth (core, mantle, crust).",
        "Identify the four types of plate boundary and the activity at each.",
        "Explain how an earthquake is measured (Richter, moment magnitude) and how its effects depend on more than magnitude.",
        "Describe how a volcano forms at a destructive and at a constructive boundary.",
        "Compare the impacts of a tectonic event in a HIC and an LIC.",
      ],
      criticalConcepts: [
        "Impacts depend on vulnerability, not just hazard magnitude",
        "Tectonic processes operate on geological time but strike in seconds",
        "Wealth changes the equation — preparedness reduces death tolls",
      ],
      keyVocabulary: [
        "tectonic plate",
        "constructive",
        "destructive",
        "conservative",
        "subduction",
        "magma",
        "Richter scale",
        "hazard",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Geography programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-geography-programmes-of-study",
      },
    },
    {
      id: "ks3-geo-y8-urbanisation",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "Geography",
      topic: "Urbanisation and the growing city",
      blurb:
        "Why cities grow, how they grow, and the challenges that come with it.",
      programmeOfStudy:
        "Pupils should understand the key processes in human geography relating to: population and urbanisation; international development; economic activity in the primary, secondary, tertiary and quaternary sectors; and the use of natural resources.",
      learningOutcomes: [
        "Define urbanisation and identify global patterns.",
        "Describe push and pull factors that drive rural-to-urban migration.",
        "Identify the land-use zones of a typical city (CBD, inner city, suburbs, outskirts).",
        "Explain the challenges of rapid urbanisation in an LIC (housing, services, jobs).",
        "Evaluate one strategy for managing a growing city.",
      ],
      criticalConcepts: [
        "Push and pull factors operate together — neither alone explains migration",
        "Urban growth is uneven within a city, not just between cities",
        "A megacity is a global phenomenon with local consequences",
      ],
      keyVocabulary: [
        "urbanisation",
        "migration",
        "push factor",
        "pull factor",
        "CBD",
        "megacity",
        "informal settlement",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Geography programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-geography-programmes-of-study",
      },
    },
    {
      id: "ks3-geo-y8-development",
      keyStage: "KS3",
      yearGroup: 8,
      subject: "Geography",
      topic: "Development and global inequality",
      blurb:
        "Measuring development, the development gap, and how aid and trade try to close it.",
      programmeOfStudy:
        "Pupils should understand the key processes in human geography relating to: population and urbanisation; international development; economic activity in the primary, secondary, tertiary and quaternary sectors; and the use of natural resources.",
      learningOutcomes: [
        "Define development and identify why it is more than just GDP.",
        "Compare countries using HDI, GDP per capita and life expectancy.",
        "Explain the development gap and its main causes.",
        "Compare aid, trade and investment as strategies for development.",
        "Evaluate the effectiveness of one named development project.",
      ],
      criticalConcepts: [
        "Development is multi-dimensional — money is not the only measure",
        "Aid can help and can also create dependency",
        "Trade rules are not neutral — they advantage some countries",
      ],
      keyVocabulary: [
        "GDP",
        "HDI",
        "development",
        "LIC",
        "HIC",
        "NEE",
        "aid",
        "trade",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Geography programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-geography-programmes-of-study",
      },
    },
    {
      id: "ks3-geo-y9-climate-change",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "Geography",
      topic: "Climate change: evidence, causes and response",
      blurb:
        "How we know the climate is changing, why it is, and how the world is (and isn't) responding.",
      programmeOfStudy:
        "Pupils should understand how human and physical processes interact to influence and change landscapes, environments and the climate; and how human activity relies on the effective functioning of natural systems.",
      learningOutcomes: [
        "Describe the evidence for recent climate change (temperature, ice cores, sea level).",
        "Distinguish between natural and anthropogenic causes of climate change.",
        "Explain how the greenhouse effect works.",
        "Identify regional impacts of climate change (UK, Sahel, low-lying island states).",
        "Evaluate mitigation versus adaptation as policy responses.",
      ],
      criticalConcepts: [
        "Correlation, attribution and projection are different — climate science addresses all three",
        "The impacts of climate change fall hardest on the people least responsible",
        "Mitigation reduces future change; adaptation manages what is coming",
      ],
      keyVocabulary: [
        "anthropogenic",
        "greenhouse gas",
        "mitigation",
        "adaptation",
        "carbon footprint",
        "ice core",
        "IPCC",
      ],
      suggestedMinutes: 50,
      source: {
        name: "UK DfE — Geography programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-geography-programmes-of-study",
      },
    },
    {
      id: "ks3-geo-y9-coasts",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "Geography",
      topic: "Coasts: processes and management",
      blurb:
        "How coasts are shaped by waves — and the engineering choices behind protecting them.",
      programmeOfStudy:
        "Pupils should understand the key processes in physical geography relating to: rocks, weathering and soils; and how human and physical processes interact to influence and change landscapes, environments and the climate.",
      learningOutcomes: [
        "Distinguish between constructive and destructive waves.",
        "Describe the four processes of coastal erosion.",
        "Explain the formation of headlands and bays, caves–arches–stacks, and beaches.",
        "Compare hard and soft engineering approaches to coastal management.",
        "Evaluate a named coastal management scheme.",
      ],
      criticalConcepts: [
        "Coasts are dynamic — they are always changing, even when they look fixed",
        "Hard engineering protects one bit of coast and often damages the next",
        "Managed retreat is sometimes the cheapest and most ethical option",
      ],
      keyVocabulary: [
        "destructive wave",
        "constructive wave",
        "longshore drift",
        "headland",
        "stack",
        "groyne",
        "managed retreat",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Geography programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-geography-programmes-of-study",
      },
    },
    {
      id: "ks3-geo-y9-resources",
      keyStage: "KS3",
      yearGroup: 9,
      subject: "Geography",
      topic: "Resources: food, water and energy",
      blurb:
        "Where the things we need come from — and what happens when supply and demand collide.",
      programmeOfStudy:
        "Pupils should understand the key processes in human geography relating to: the use of natural resources; and how human activity relies on the effective functioning of natural systems.",
      learningOutcomes: [
        "Describe global patterns of food, water and energy security and insecurity.",
        "Explain the causes of water scarcity in a chosen region.",
        "Compare renewable and non-renewable energy sources.",
        "Evaluate the trade-offs in a chosen energy strategy (UK nuclear, solar in Morocco, hydroelectric in Brazil).",
        "Apply the concept of sustainability to a resource problem.",
      ],
      criticalConcepts: [
        "Scarcity is often distribution, not absolute shortage",
        "Energy choices are political, not only technical",
        "Sustainability balances three pillars: environmental, social, economic",
      ],
      keyVocabulary: [
        "resource",
        "security",
        "scarcity",
        "renewable",
        "non-renewable",
        "sustainability",
        "footprint",
      ],
      suggestedMinutes: 45,
      source: {
        name: "UK DfE — Geography programmes of study, KS3",
        url: "https://www.gov.uk/government/publications/national-curriculum-in-england-geography-programmes-of-study",
      },
    },

    // =================================================================
    // KS4 (GCSE) — stretch entries: 2 per subject
    // =================================================================
    {
      id: "ks4-bio-y10-cell-transport",
      keyStage: "KS4",
      yearGroup: 10,
      subject: "Biology",
      topic: "Cell transport: diffusion, osmosis and active transport",
      blurb:
        "How substances move into and out of cells — and the energy costs involved.",
      programmeOfStudy:
        "Substances are transported into and out of cells by diffusion, osmosis and active transport. Diffusion is the spreading out of the particles of any substance in solution, or particles of a gas, resulting in a net movement from an area of higher concentration to an area of lower concentration. Osmosis is the diffusion of water across a partially permeable membrane. Active transport moves substances against a concentration gradient and requires energy from respiration.",
      learningOutcomes: [
        "Define diffusion, osmosis and active transport and give an example of each.",
        "Explain factors that affect the rate of diffusion (concentration gradient, temperature, surface area).",
        "Describe and explain the results of an osmosis investigation using potato chips.",
        "Calculate percentage change in mass for an osmosis experiment.",
        "Explain why active transport is required, e.g. root hair cells absorbing minerals.",
      ],
      criticalConcepts: [
        "Diffusion is passive; active transport costs ATP",
        "Osmosis only refers to water and only across a partially permeable membrane",
        "Surface area to volume ratio limits exchange — adaptations exist to increase it",
      ],
      keyVocabulary: [
        "diffusion",
        "osmosis",
        "active transport",
        "concentration gradient",
        "partially permeable",
        "ATP",
        "surface area",
      ],
      suggestedMinutes: 50,
      source: {
        name: "AQA GCSE Biology (8461) Specification",
        url: "https://www.aqa.org.uk/subjects/science/gcse/biology-8461",
      },
    },
    {
      id: "ks4-bio-y11-homeostasis",
      keyStage: "KS4",
      yearGroup: 11,
      subject: "Biology",
      topic: "Homeostasis and the nervous system",
      blurb:
        "How the body keeps conditions stable — receptors, the nervous system, reflexes and feedback.",
      programmeOfStudy:
        "Homeostasis is the regulation of the internal conditions of a cell or organism to maintain optimum conditions for function, in response to internal and external changes. All control systems include cells called receptors which detect stimuli, coordination centres (such as the brain, spinal cord and pancreas), and effectors, muscles or glands, which bring about responses.",
      learningOutcomes: [
        "Define homeostasis and explain why it is essential.",
        "Identify the receptor, coordination centre and effector in a given control system.",
        "Describe the structure and function of the nervous system, including the reflex arc.",
        "Plan a practical to measure reaction time and analyse the data.",
        "Explain negative feedback control with a specific example (blood glucose, body temperature).",
      ],
      criticalConcepts: [
        "Negative feedback returns the system to a set point",
        "A reflex bypasses the brain to be fast — it trades thought for speed",
        "Receptor → coordinator → effector is a transferable model",
      ],
      keyVocabulary: [
        "homeostasis",
        "receptor",
        "effector",
        "synapse",
        "reflex arc",
        "negative feedback",
        "stimulus",
      ],
      suggestedMinutes: 50,
      source: {
        name: "AQA GCSE Biology (8461) Specification",
        url: "https://www.aqa.org.uk/subjects/science/gcse/biology-8461",
      },
    },
    {
      id: "ks4-chem-y10-atomic-structure",
      keyStage: "KS4",
      yearGroup: 10,
      subject: "Chemistry",
      topic: "Atomic structure and the periodic table",
      blurb:
        "The full GCSE picture of atomic structure — isotopes, electronic structure and where it places an element on the table.",
      programmeOfStudy:
        "All substances are made of atoms. An atom contains a small nucleus made of protons and neutrons, around which there are electrons. The radius of an atom is about 1 × 10⁻¹⁰ m. Atoms of the same element have the same number of protons; atoms with the same number of protons but different numbers of neutrons are called isotopes. The relative atomic mass of an element is an average value that takes account of the abundance of the isotopes of the element.",
      learningOutcomes: [
        "State the relative mass and charge of subatomic particles.",
        "Calculate the number of protons, neutrons and electrons given atomic number and mass number.",
        "Define isotopes and calculate relative atomic mass from isotopic abundances.",
        "Write the electron configuration for the first 20 elements.",
        "Explain how Mendeleev's table differs from the modern periodic table.",
      ],
      criticalConcepts: [
        "Isotopes share chemistry (same electrons) but differ in mass",
        "Electron configuration determines group and chemical behaviour",
        "Models are improved by anomalies that an earlier model could not explain",
      ],
      keyVocabulary: [
        "atom",
        "isotope",
        "atomic number",
        "mass number",
        "relative atomic mass",
        "electron shell",
        "Mendeleev",
      ],
      suggestedMinutes: 50,
      source: {
        name: "AQA GCSE Chemistry (8462) Specification",
        url: "https://www.aqa.org.uk/subjects/science/gcse/chemistry-8462",
      },
    },
    {
      id: "ks4-chem-y11-rates-of-reaction",
      keyStage: "KS4",
      yearGroup: 11,
      subject: "Chemistry",
      topic: "Rates of reaction",
      blurb:
        "Measuring how fast a reaction goes, and what factors change the rate.",
      programmeOfStudy:
        "The rate of a chemical reaction can be found by measuring the quantity of a reactant used or the quantity of product formed over time. Factors which affect the rates of chemical reactions include: the concentrations of reactants in solution, the pressure of reacting gases, the surface area of solid reactants, the temperature, and the presence of catalysts.",
      learningOutcomes: [
        "Calculate the mean rate of reaction from data.",
        "Interpret rate-of-reaction graphs and find the rate at a specific time using a tangent.",
        "Explain how concentration, surface area, temperature and catalyst affect rate using collision theory.",
        "Plan a practical to investigate one rate factor, with appropriate controls.",
        "Define a catalyst and explain how it lowers activation energy without being consumed.",
      ],
      criticalConcepts: [
        "Collision theory: reactions need successful collisions — frequent and energetic enough",
        "A catalyst changes the path, not the destination",
        "A graph's gradient is the rate; its plateau is the end of the reaction",
      ],
      keyVocabulary: [
        "rate",
        "collision theory",
        "activation energy",
        "catalyst",
        "tangent",
        "concentration",
        "surface area",
      ],
      suggestedMinutes: 50,
      source: {
        name: "AQA GCSE Chemistry (8462) Specification",
        url: "https://www.aqa.org.uk/subjects/science/gcse/chemistry-8462",
      },
    },
    {
      id: "ks4-phys-y10-forces-motion",
      keyStage: "KS4",
      yearGroup: 10,
      subject: "Physics",
      topic: "Forces and Newton's laws of motion",
      blurb:
        "From free-body diagrams to F = ma — how force and motion are linked.",
      programmeOfStudy:
        "A force is a push or pull that acts on an object due to the interaction with another object. All forces between objects are either contact or non-contact forces. Newton's first law: if the resultant force acting on an object is zero, the object will remain stationary or continue at constant velocity. Newton's second law: the acceleration of an object is proportional to the resultant force and inversely proportional to its mass (F = ma). Newton's third law: when two objects interact, the forces they exert on each other are equal and opposite.",
      learningOutcomes: [
        "State Newton's three laws of motion and give an example of each.",
        "Use F = ma to solve quantitative problems.",
        "Draw free-body force diagrams for everyday situations.",
        "Calculate weight using W = mg and distinguish weight from mass.",
        "Plan and analyse an investigation into the relationship between force, mass and acceleration.",
      ],
      criticalConcepts: [
        "Resultant force, not motion, decides whether you're accelerating",
        "Mass is intrinsic; weight is a force and depends on gravity",
        "Action–reaction pairs act on different objects",
      ],
      keyVocabulary: [
        "force",
        "mass",
        "acceleration",
        "weight",
        "resultant",
        "Newton's laws",
        "inertia",
      ],
      suggestedMinutes: 50,
      source: {
        name: "AQA GCSE Physics (8463) Specification",
        url: "https://www.aqa.org.uk/subjects/science/gcse/physics-8463",
      },
    },
    {
      id: "ks4-phys-y11-electricity",
      keyStage: "KS4",
      yearGroup: 11,
      subject: "Physics",
      topic: "Electricity: circuits, power and energy",
      blurb:
        "Current, potential difference and resistance in series and parallel — and the energy and power that follow.",
      programmeOfStudy:
        "Electric current is a flow of electrical charge. The size of the electric current is the rate of flow of electrical charge. The current through a component depends on both the resistance of the component and the potential difference across the component. The greater the resistance of the component the smaller the current for a given potential difference (pd) across the component (V = IR). Energy is transferred by a battery to the mobile charge carriers in a circuit; this transfer of energy gives rise to a potential difference.",
      learningOutcomes: [
        "Apply V = IR and rearrange to find any variable.",
        "Compare current, p.d. and resistance behaviour in series and parallel circuits.",
        "Sketch and interpret I–V characteristics for a fixed resistor, filament lamp and diode.",
        "Calculate power dissipated using P = VI and P = I²R.",
        "Calculate energy transferred using E = Pt and E = QV.",
      ],
      criticalConcepts: [
        "Resistance is constant only for ohmic components — many real components are not",
        "Power is the rate of energy transfer, measured in watts",
        "A component's I–V graph is its signature",
      ],
      keyVocabulary: [
        "current",
        "potential difference",
        "resistance",
        "ohmic",
        "power",
        "diode",
        "charge",
      ],
      suggestedMinutes: 50,
      source: {
        name: "AQA GCSE Physics (8463) Specification",
        url: "https://www.aqa.org.uk/subjects/science/gcse/physics-8463",
      },
    },
    {
      id: "ks4-maths-y10-simultaneous-equations",
      keyStage: "KS4",
      yearGroup: 10,
      subject: "Mathematics",
      topic: "Simultaneous equations",
      blurb:
        "Solving pairs of linear equations algebraically and graphically.",
      programmeOfStudy:
        "Pupils should be taught to solve two simultaneous equations in two variables (linear/linear) algebraically; find approximate solutions using a graph; translate simple situations or procedures into algebraic expressions or formulae; derive two simultaneous equations, solve the equations and interpret the answer.",
      learningOutcomes: [
        "Solve a pair of linear simultaneous equations by elimination.",
        "Solve a pair of linear simultaneous equations by substitution.",
        "Find the approximate solution from the intersection of two graphs.",
        "Derive and solve simultaneous equations from a worded problem.",
        "Check solutions by substitution into the original equations.",
      ],
      criticalConcepts: [
        "A solution must satisfy both equations at once",
        "Elimination and substitution are two routes to the same destination",
        "The intersection of two lines is the geometric meaning of a simultaneous solution",
      ],
      keyVocabulary: [
        "simultaneous",
        "elimination",
        "substitution",
        "linear",
        "intersection",
        "variable",
      ],
      suggestedMinutes: 50,
      source: {
        name: "Edexcel GCSE Mathematics (9-1) Specification",
        url: "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/mathematics-2015.html",
      },
    },
    {
      id: "ks4-maths-y11-trigonometry",
      keyStage: "KS4",
      yearGroup: 11,
      subject: "Mathematics",
      topic: "Trigonometry in right-angled triangles",
      blurb:
        "Using sine, cosine and tangent to find missing sides and angles in right-angled triangles.",
      programmeOfStudy:
        "Pupils should be taught to know the formulae for: Pythagoras' theorem, a² + b² = c², and the trigonometric ratios, sinθ = opposite/hypotenuse, cosθ = adjacent/hypotenuse and tanθ = opposite/adjacent; apply them to find angles and lengths in right-angled triangles and, where possible, general triangles in two-dimensional figures.",
      learningOutcomes: [
        "Label the sides of a right-angled triangle relative to a given angle.",
        "Choose the correct trigonometric ratio for a given problem.",
        "Calculate a missing side using SOHCAHTOA.",
        "Calculate a missing angle using inverse trigonometric functions.",
        "Apply trigonometry to a real-world context (heights, angles of elevation/depression).",
      ],
      criticalConcepts: [
        "Trigonometric ratios depend on the angle, not the size of the triangle",
        "Choosing the right ratio is the hardest step — label sides first",
        "The inverse function returns an angle from a ratio",
      ],
      keyVocabulary: [
        "sine",
        "cosine",
        "tangent",
        "opposite",
        "adjacent",
        "hypotenuse",
        "inverse",
        "elevation",
      ],
      suggestedMinutes: 50,
      source: {
        name: "Edexcel GCSE Mathematics (9-1) Specification",
        url: "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/mathematics-2015.html",
      },
    },
    {
      id: "ks4-eng-y10-language-paper",
      keyStage: "KS4",
      yearGroup: 10,
      subject: "English",
      topic: "GCSE English Language: reading non-fiction (Paper 2)",
      blurb:
        "Reading 19th and 21st-century non-fiction texts — and writing about how writers use language to convey viewpoint.",
      programmeOfStudy:
        "Students should read a wide range of high-quality, challenging, classic literature and extended literary non-fiction, and other writing such as essays, reviews and journalism. This should include whole texts. Students should develop the habit of reading widely and often. They should: read and evaluate texts critically and make comparisons between texts; summarise and synthesise information or ideas from texts; use knowledge gained from wide reading to inform and improve their own writing.",
      learningOutcomes: [
        "Identify and interpret explicit and implicit information from a non-fiction text.",
        "Analyse how writers use language and structure to achieve effects and influence readers.",
        "Compare writers' viewpoints and how these are conveyed in two texts from different time periods.",
        "Evaluate texts critically with appropriate textual references.",
        "Write a focused short response in exam timing (45 minutes).",
      ],
      criticalConcepts: [
        "Comparison requires shared ground — name the link, then the difference",
        "Analyse effect, not technique — naming a device is not yet analysis",
        "Evidence must be embedded; quotation must be precise",
      ],
      keyVocabulary: [
        "viewpoint",
        "tone",
        "register",
        "synthesis",
        "implicit",
        "explicit",
        "comparison",
      ],
      suggestedMinutes: 50,
      source: {
        name: "AQA GCSE English Language (8700) Specification",
        url: "https://www.aqa.org.uk/subjects/english/gcse/english-language-8700",
      },
    },
    {
      id: "ks4-eng-y11-macbeth",
      keyStage: "KS4",
      yearGroup: 11,
      subject: "English",
      topic: "GCSE English Literature: Macbeth",
      blurb:
        "Studying Macbeth as a Shakespeare set text — character, theme, language and context.",
      programmeOfStudy:
        "Students should study a play by Shakespeare. They should be able to read and respond to texts with insight; explore how meanings are shaped by features of language and structure; understand the relationships between texts and the contexts in which they were written; show understanding of the relationships between writers' methods, the texts and their contexts.",
      learningOutcomes: [
        "Track Macbeth's character arc through the five acts.",
        "Analyse Shakespeare's use of imagery (blood, darkness, sleep) across the play.",
        "Explain the contextual relevance of Jacobean kingship and the supernatural.",
        "Write a thesis-led essay response to an extract question.",
        "Use embedded quotation precisely under timed exam conditions.",
      ],
      criticalConcepts: [
        "A tragic hero falls through a fatal flaw — but is that the whole story?",
        "Context informs the play; it does not determine our reading of it",
        "Shakespeare's language repays slow, word-by-word attention",
      ],
      keyVocabulary: [
        "tragedy",
        "hamartia",
        "soliloquy",
        "regicide",
        "supernatural",
        "ambition",
        "imagery",
        "blank verse",
      ],
      suggestedMinutes: 50,
      source: {
        name: "AQA GCSE English Literature (8702) Specification",
        url: "https://www.aqa.org.uk/subjects/english/gcse/english-literature-8702",
      },
    },
    {
      id: "ks4-hist-y10-weimar-nazi",
      keyStage: "KS4",
      yearGroup: 10,
      subject: "History",
      topic: "GCSE History: Weimar and Nazi Germany, 1918–1939",
      blurb:
        "From the birth of the Weimar Republic through Hitler's rise to the consolidation of dictatorship.",
      programmeOfStudy:
        "Students should study Weimar and Nazi Germany 1918–1939 as a modern depth study. This option focuses on the development of Germany during a turbulent period, from the establishment of a parliamentary democracy after the First World War to the Nazi dictatorship. Students will study the political, economic, social and cultural aspects of these two developments and the role of key individuals and groups in shaping change.",
      learningOutcomes: [
        "Explain the challenges facing the Weimar Republic 1919–1923.",
        "Describe the recovery of Germany under Stresemann, 1924–1929.",
        "Identify the reasons for Nazi electoral growth, 1929–1932.",
        "Explain how Hitler consolidated power between January 1933 and August 1934.",
        "Analyse the impact of Nazi policies on different groups (women, young people, minorities).",
      ],
      criticalConcepts: [
        "Recovery in the 1920s was partial — strong on the surface, fragile underneath",
        "Hitler came to power by legal means and then changed the law",
        "Different groups experienced Nazi rule very differently",
      ],
      keyVocabulary: [
        "Weimar",
        "Reichstag",
        "putsch",
        "Stresemann",
        "Enabling Act",
        "Gleichschaltung",
        "Volksgemeinschaft",
        "Gestapo",
      ],
      suggestedMinutes: 50,
      source: {
        name: "Edexcel GCSE History (1HI0) Specification",
        url: "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/history-2016.html",
      },
    },
    {
      id: "ks4-hist-y11-medicine-britain",
      keyStage: "KS4",
      yearGroup: 11,
      subject: "History",
      topic: "GCSE History: Medicine in Britain, c.1250–present",
      blurb:
        "A long-arc thematic study tracing how ideas about cause, prevention and treatment have changed.",
      programmeOfStudy:
        "Students should study Medicine in Britain, c1250–present as a thematic study and historic environment. They should develop and extend their knowledge and understanding of specified key events, periods and societies in British history; and how change has shaped the world.",
      learningOutcomes: [
        "Identify continuities and changes in ideas about the cause of disease from the medieval to the modern period.",
        "Describe key turning points (germ theory, anaesthetics, antibiotics, the NHS).",
        "Evaluate the role of individuals (Vesalius, Harvey, Jenner, Pasteur, Nightingale, Fleming) in medical progress.",
        "Explain how war and government have driven medical change.",
        "Construct a thematic argument across centuries using selected evidence.",
      ],
      criticalConcepts: [
        "Progress is uneven — periods of stagnation can be longer than periods of breakthrough",
        "Ideas about cause shape practice — bad theory leads to harmful treatment",
        "Individuals matter, but rarely alone — wider context enables them",
      ],
      keyVocabulary: [
        "germ theory",
        "miasma",
        "Four Humours",
        "vaccination",
        "antiseptic",
        "antibiotic",
        "NHS",
        "epidemic",
      ],
      suggestedMinutes: 50,
      source: {
        name: "Edexcel GCSE History (1HI0) Specification",
        url: "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/history-2016.html",
      },
    },
    {
      id: "ks4-geo-y10-uk-physical",
      keyStage: "KS4",
      yearGroup: 10,
      subject: "Geography",
      topic: "GCSE Geography: UK physical landscapes",
      blurb:
        "Glacial, coastal and river landscapes of the UK — processes, landforms and management.",
      programmeOfStudy:
        "Students should study the diverse landscapes of the UK, including upland and lowland landscapes and the river systems and coastal landscapes that have shaped them. They should understand the physical processes that operate on these landscapes and the ways in which they are managed.",
      learningOutcomes: [
        "Locate the main upland and lowland areas of the UK.",
        "Explain the formation of named coastal landforms from a UK case study.",
        "Explain the formation of named river landforms from a UK case study.",
        "Compare hard and soft engineering strategies for managing coasts and rivers.",
        "Evaluate a named UK flood management scheme.",
      ],
      criticalConcepts: [
        "UK landscapes are the product of long-term geology and short-term processes",
        "Management decisions trade-off cost, environment and community",
        "Case studies anchor abstract processes in specific places",
      ],
      keyVocabulary: [
        "glaciation",
        "longshore drift",
        "meander",
        "ox-bow lake",
        "hard engineering",
        "soft engineering",
        "managed retreat",
        "flood plain",
      ],
      suggestedMinutes: 50,
      source: {
        name: "AQA GCSE Geography (8035) Specification",
        url: "https://www.aqa.org.uk/subjects/geography/gcse/geography-8035",
      },
    },
    {
      id: "ks4-geo-y11-changing-economic-world",
      keyStage: "KS4",
      yearGroup: 11,
      subject: "Geography",
      topic: "GCSE Geography: the changing economic world",
      blurb:
        "Global development inequalities, strategies for closing the gap, and economic change in the UK.",
      programmeOfStudy:
        "Students should study how there are global variations in economic development and quality of life; various strategies exist for reducing the global development gap; some LICs and NEEs are experiencing rapid economic development which leads to significant social, environmental and cultural change; and major changes in the economy of the UK have affected, and will continue to affect, employment patterns and regional growth.",
      learningOutcomes: [
        "Compare countries using a range of development indicators (HDI, GNI, life expectancy, literacy).",
        "Explain how a country (e.g. Nigeria, India) is changing as a Newly Emerging Economy.",
        "Evaluate strategies to reduce the development gap (aid, trade, debt relief, fair trade, microfinance).",
        "Describe how the UK economy has changed since the 1970s.",
        "Explain the impact of one UK economic change on a named region.",
      ],
      criticalConcepts: [
        "Development indicators each capture only part of the story",
        "Rapid growth brings benefits and costs — neither side is the whole truth",
        "Globalisation is uneven within countries as well as between them",
      ],
      keyVocabulary: [
        "development",
        "HDI",
        "NEE",
        "globalisation",
        "TNC",
        "fair trade",
        "deindustrialisation",
        "post-industrial",
      ],
      suggestedMinutes: 50,
      source: {
        name: "AQA GCSE Geography (8035) Specification",
        url: "https://www.aqa.org.uk/subjects/geography/gcse/geography-8035",
      },
    },
  ],
};

export function findSyllabus(id: string) {
  return SYLLABUS_LIBRARY.entries.find((e) => e.id === id);
}
