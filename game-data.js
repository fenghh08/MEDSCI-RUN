/* ============================================================================
   game-data.js — all game CONTENT for Runner Game (cancer-runner-group.html)
   and the Contributor tool (contributor.html) live in this one file.

   Nothing in here is executable game logic — it's just numbers, labels and
   study-guide content. The game and the contributor tool both load this file
   as a plain <script> (NOT type="module", so it still works when you just
   double-click the .html file — no local server needed) and read everything
   off `window.RUNNER_DATA`.

   HOW TO ADD CONTENT
   -------------------
   • Easiest: open contributor.html, fill in the form, it writes the object
     literal for you in the exact shape below — paste it in.
   • By hand: follow the shape of an existing entry and keep the same keys.

   SHAPE OVERVIEW
   ---------------
   COURSES        — real university courses (e.g. MEDS3002), each broken into
                     Classes (individual lectures, e.g. "L14").
   TOPICS         — the fixed topic taxonomy (genetics, immunology, ...).
   THEMES         — Theme (e.g. "cancer") → Topic → study-guide Item. Each
                     item can point at a COURSES entry via `course` + `class`,
                     and carries its own `questions` array — the MCQs players
                     get asked about that item. A question only needs its own
                     `course`/`class` (or, rarely, a literal `relatedCourse`
                     string) if it genuinely differs from its item's — most
                     just inherit the item's.
   STAGES         — Theme → ordered list of Runner-mode stages.
   RUNNABLE_THEMES— which theme ids have a STAGES entry (playable in Runner
                     mode vs. Study & Practice-only).
   GAME_CONFIG    — every tunable gameplay number.
   LIFE_CONFIG    — per-theme label/icon for the "life" resource.
   COMPLETE_SCENARIO — text shown after the last stage.
   ============================================================================ */
(function(){

/* ======================================================================
   COURSES — real university courses, broken into Classes (individual
   lectures). Items and questions reference these via `course` (the course
   code, e.g. 'MEDS3002') + `class` (the class key, e.g. 'L14') instead of
   writing the whole label out by hand every time. The display string
   ("MEDS3002 · L14 · Cancer Hallmarks") is generated automatically — see
   courseDisplayString() in cancer-runner-group.html.
   ====================================================================== */
          const COURSES = {
    'MEDS3002': {
      'code': 'MEDS3002',
      'label': 'Cancer / Medical Science',
      'classes': {
        'L9': {
          'label': 'Immune cell differentiation and haematopoiesis',
        },
        'L11': {
          'label': 'Immune surveillance and cancer',
        },
        'L12': {
          'label': 'Immune cell profiling and biomarkers',
        },
        'L13': {
          'label': 'Cancer diagnostic',
        },
        'L14': {
          'label': 'Cancer Hallmarks',
        },
        'L15': {
          'label': 'Combination therapies in Cancer',
        },
        'L22': {
          'label': 'PK PD challenges cancer',
        },
        'L28': {
          'label': 'Intro to HSCT',
        },
        'L32': {
          'label': 'Overview of adoptive T cell therapies',
        },
      },
    },
    'MEDS2003': {
      'code': 'MEDS2003',
      'label': 'Biochemistry',
      'classes': {
        'L1': {
          'label': 'Intro to Metabolism',
        },
        'L6': {
          'label': 'Gluconeogenesis, Proteolysis and Ketone Body Synthesis',
        },
        'L25': {
          'label': 'Eukaryotic Transcription',
        },
      },
    },
  };

/* ======================================================================
   TOPICS — the fixed taxonomy every question/item is filed under.
   ====================================================================== */
          const TOPICS = {
    'genetics': {
      'label': 'Genetics',
      'icon': '🧬',
      'color': '#c58bff',
    },
    'immunology': {
      'label': 'Immunology',
      'icon': '🛡️',
      'color': '#3ec6e0',
    },
    'pharmacology': {
      'label': 'Pharmacology',
      'icon': '💊',
      'color': '#ff4d6d',
    },
    'oncology': {
      'label': 'Oncology',
      'icon': '🎗️',
      'color': '#ffab4d',
    },
    'metabolism': {
      'label': 'Metabolism',
      'icon': '🔥',
      'color': '#ffd23f',
    },
    'molecularBiology': {
      'label': 'Molecular Biology',
      'icon': '🔬',
      'color': '#7cff6b',
    },
  };

/* ======================================================================
   GAME_CONFIG — every tunable number lives here in one place.
   ====================================================================== */
  const GAME_CONFIG = {
    baseSpeed: 700,            // px/s at Stage I
    speedRampPerStage: 20,     // added per stage index (0-based) — one-time bump on stage change
    speedRampPerSecond: 10,    // added continuously for every second survived — this is what makes it feel gradual
    maxSpeed: 900,             // speed never exceeds this
    startingGlucose: 100,
    glucosePickupValue: 5,     // gained per life pickup collected
    wrongAnswerPenalty: 40,    // life lost per wrong MCQ answer
    obstacleSpawnBaseMs: 900,  // topic-block spawn interval = base + random(0..rand)
    obstacleSpawnRandMs: 300,
    glucoseSpawnBaseMs: 550,   // life-pickup spawn interval = base + random(0..rand)
    glucoseSpawnRandMs: 300,
    initialObstacleDelayMs: 1200, // delay before the very first topic block spawns
    initialGlucoseDelayMs: 500,   // delay before the very first life pickup spawns
    bombDamage: 40,               // life lost when a bomb is hit (instant, no question)
    bombSpawnBaseMs: 1000,        // bomb spawn interval — base + random(0..rand)
    bombSpawnRandMs: 1000,
    scoreCorrectWeight: 50,    // Group Race ranking score = correct*this - incorrect*this + life*this + stageIndex*stageWeight
    scoreIncorrectWeight: 35,
    scoreLifeWeight: 1,
    stageWeight: 300,          // added per stage reached (stageIndex is 0-based, so Stage I contributes 0)
  };

/* ======================================================================
   LIFE — the "health" resource is themed per Runner-playable theme. Change
   the label/icon here any time — every place it's shown (HUD, pickups,
   penalties, the bomb warning) reads from this automatically.
   ====================================================================== */
  const LIFE_CONFIG = {
    cancer:       { label:'Glucose', icon:'🩸' },
    biochemistry: { label:'ATP',     icon:'⚡' },
  };

/* ======================================================================
   THEMES — Theme -> Topic -> Item. Each item can carry "hashtags" (which
   cancer type / sub-area it belongs to, e.g. ['Leukemia']), course + class
   fields pointing into COURSES above (e.g. course:'MEDS3002', class:'L14'),
   and its own "questions" array — the MCQs players get asked when they hit
   this item's topic in Runner mode or match it in Study & Practice. A
   question only needs its own course/class if it genuinely differs from
   its item's (e.g. a question spanning several classes at once) — most
   questions just inherit the item's.
   ====================================================================== */
          const THEMES = {
    'cancer': {
      'label': 'Cancer',
      'icon': '🎗️',
      'blurb': 'Genetics, immunology, pharmacology and oncology across cancer types — MEDS3002.',
      'topics': {
        'genetics': {
          'items': {
            'bcrabl': {
              'label': 'BCR-ABL fusion / Philadelphia chromosome',
              'images': [],
              'description': 'A reciprocal translocation t(9;22) fuses BCR and ABL1, creating an always-on tyrosine kinase. Diagnostic hallmark of CML.',
              'mechanism': 'The fusion protein has constitutive (unregulated) tyrosine kinase activity, driving continuous proliferation signals independent of normal growth control.',
              'funFacts': ['The first mutation ever linked directly to a specific human cancer (1960).', 'Named the "Philadelphia chromosome" after the city where it was discovered.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L14',
              'questions': [
                {
                  'id': 'q-genetics-938x',
                  'prompt': 'This is a test question',
                  'options': ['A', 'B', 'C', 'D'],
                  'correctIndex': 0,
                  'explanation': 'Ex',
                  'hashtags': ['Metabolism'],
                  'course': 'MEDS3002',
                  'class': 'L11',
                },
              ],
            },
            'flt3itd': {
              'label': 'FLT3-ITD',
              'images': [],
              'description': 'An internal tandem duplication in the FLT3 receptor gene, found in ~25% of AML cases.',
              'mechanism': 'The duplication locks the FLT3 receptor kinase domain in an active conformation, giving continuous proliferative signalling.',
              'funFacts': ['Associated with higher relapse risk in AML.', 'Targeted directly by FLT3 inhibitors like midostaurin and gilteritinib.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L14',
            },
            'npm1': {
              'label': 'NPM1 mutation',
              'images': [],
              'description': 'One of the most common AML mutations; usually favorable prognosis when FLT3-ITD is absent.',
              'mechanism': 'Mutant NPM1 gains an extra nuclear export signal, causing the normally nucleolar protein to mislocalize to the cytoplasm — used diagnostically.',
              'funFacts': ['Often tested alongside FLT3-ITD since the combination changes prognosis.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L14',
            },
            'cebpa': {
              'label': 'CEBPA mutation',
              'images': [],
              'description': 'Mutation in a transcription factor gene essential for normal myeloid differentiation.',
              'mechanism': 'Loss of normal CEBPA function blocks myeloid cells from maturing properly, trapping them at an immature, proliferative stage.',
              'funFacts': ['Biallelic (double) CEBPA mutations carry a more favorable prognosis than single-allele mutations.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L14',
            },
            'tp53': {
              'label': 'TP53 mutation',
              'images': [],
              'description': 'Loss-of-function mutation in the classic tumor-suppressor gene, associated with high-risk, treatment-resistant disease.',
              'mechanism': 'TP53 normally halts the cell cycle or triggers apoptosis in damaged cells; losing it lets genetically unstable cells survive and divide.',
              'funFacts': ['TP53 is sometimes called the "guardian of the genome."'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L14',
            },
            'testitem_yz13': {
              'label': 'Test item',
              'images': [],
              'description': 'Yoooo',
              'mechanism': 'Yooooo',
              'funFacts': ['Hey'],
              'refs': [
                {
                  'label': 'Lecture 5 slides',
                  'url': '',
                },
              ],
              'hashtags': ['Transcription'],
              'course': 'MEDS3002',
              'class': 'L12',
              'questions': [
                {
                  'id': 'q-genetics-4cz0',
                  'prompt': 'This is a test question',
                  'options': ['AA', 'AAB', 'BB', 'Dawd'],
                  'correctIndex': 0,
                  'explanation': 'No explanation',
                  'hashtags': ['Hey'],
                  'course': 'MEDS3002',
                  'class': 'L11',
                },
                {
                  'id': 'q-genetics-4cz0',
                  'prompt': 'This is a test question',
                  'options': ['AA', 'AAB', 'BB', 'Dawd'],
                  'correctIndex': 0,
                  'explanation': 'No explanation',
                  'hashtags': ['Hey'],
                  'course': 'MEDS3002',
                  'class': 'L11',
                },
                {
                  'id': 'q-genetics-cetp',
                  'prompt': 'awdawdawd',
                  'options': ['awd', 'awd'],
                  'correctIndex': 0,
                  'explanation': 'awd',
                  'hashtags': ['awd'],
                },
              ],
            },
          },
        },
        'immunology': {
          'items': {
            'pdl1checkpoint': {
              'label': 'PD-1 / PD-L1 checkpoint',
              'images': [],
              'description': 'PD-L1 on tumor cells binds PD-1 on T cells, delivering a "stand down" signal that suppresses the immune attack.',
              'mechanism': 'Some leukemic blasts upregulate PD-L1 specifically in response to ongoing T-cell attack ("adaptive immune resistance"), dynamically shielding themselves.',
              'funFacts': ['Blocking this interaction is the basis of checkpoint-inhibitor drugs.', 'The PD-1/PD-L1 pathway discovery contributed to the 2018 Nobel Prize in Medicine.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L11',
            },
            'cart': {
              'label': 'CAR-T cell therapy',
              'images': [
                {
                  'url': 'images/car_t_cell.png',
                  'caption': 'CAR-T cell therapy',
                },
              ],
              'description': 'A patient\'s own T cells are genetically engineered to express a chimeric antigen receptor (commonly anti-CD19) targeting leukemic cells.',
              'mechanism': 'The engineered receptor lets T cells recognize the tumor antigen directly, independent of normal MHC-restricted antigen presentation.',
              'funFacts': ['A major side effect is cytokine release syndrome from massive T-cell activation.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L32',
            },
            'gvl': {
              'label': 'Graft-versus-leukemia effect',
              'images': [],
              'description': 'After allogeneic stem cell transplant, donor immune cells (T cells and NK cells) can recognize and eliminate residual leukemic cells.',
              'mechanism': 'Donor lymphocytes react against minor antigen differences between donor and recipient, incidentally also attacking leukemic cells.',
              'funFacts': ['NK cells can kill abnormal cells without needing prior antigen sensitization, unlike T cells.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L9',
            },
            'mrd': {
              'label': 'Minimal residual disease (MRD)',
              'images': [],
              'description': 'Small numbers of leukemic cells remaining after treatment, below the detection threshold of standard microscopy.',
              'mechanism': 'Detected using sensitive techniques like multi-parameter flow cytometry or PCR, which can find one leukemic cell among tens of thousands of normal cells.',
              'funFacts': ['MRD status after treatment is one of the strongest predictors of relapse risk.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L12',
            },
          },
        },
        'pharmacology': {
          'items': {
            'imatinib': {
              'label': 'Imatinib',
              'images': [],
              'description': 'A small-molecule tyrosine kinase inhibitor that blocks the ATP-binding pocket of BCR-ABL.',
              'mechanism': 'By occupying the ATP site, imatinib prevents BCR-ABL from phosphorylating its downstream targets, switching off the proliferative signal.',
              'funFacts': ['Brand name Gleevec — turned CML from often-fatal into a manageable chronic condition for most patients.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L22',
            },
            'cytarabine': {
              'label': 'Cytarabine',
              'images': [],
              'description': 'A nucleoside analog chemotherapy drug that mimics cytosine and disrupts DNA synthesis.',
              'mechanism': 'Incorporated into DNA in place of cytosine, it stalls the replication machinery in actively dividing cells.',
              'funFacts': ['Backbone of the classic "7+3" AML induction regimen, paired with an anthracycline like daunorubicin.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L15',
            },
            'midostaurin': {
              'label': 'Midostaurin',
              'images': [],
              'description': 'A FLT3 inhibitor added to induction chemotherapy specifically for FLT3-mutated AML.',
              'mechanism': 'Blocks the constitutively active FLT3 kinase domain, reducing the proliferative drive from the mutant receptor.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L15',
            },
            'atra': {
              'label': 'All-trans retinoic acid (ATRA)',
              'images': [],
              'description': 'A differentiation-inducing drug used as targeted therapy for acute promyelocytic leukemia (APL).',
              'mechanism': 'ATRA overcomes the differentiation block caused by the PML-RARA fusion protein, pushing abnormal promyelocytes to mature into normal granulocytes.',
              'funFacts': ['One of the first examples of "differentiation therapy" rather than cell-killing chemotherapy.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L15',
            },
            'venetoclax': {
              'label': 'Venetoclax',
              'images': [],
              'description': 'A BCL-2 inhibitor that promotes apoptosis in leukemic cells reliant on BCL-2 for survival.',
              'mechanism': 'Blocks BCL-2, an anti-apoptotic protein, tipping the balance back toward programmed cell death in leukemic blasts.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L15',
            },
          },
        },
        'oncology': {
          'items': {
            'blastcrisis': {
              'label': 'Blast crisis',
              'images': [],
              'description': 'The terminal, aggressive phase of CML, where the disease transforms into something behaving like acute leukemia.',
              'mechanism': 'A rising percentage of immature blasts in blood/marrow signals progression from chronic phase through an accelerated phase into blast crisis.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L13',
            },
            'tls': {
              'label': 'Tumor lysis syndrome',
              'images': [],
              'description': 'A metabolic emergency where rapid destruction of cancer cells releases intracellular contents faster than the body can clear them.',
              'mechanism': 'Releases potassium, phosphate, and uric acid, risking arrhythmias and urate-related kidney injury — most common after starting treatment on a high tumor burden.',
              'funFacts': ['Allopurinol is commonly given beforehand to reduce uric acid production and lower the risk.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L13',
            },
            'bmbiopsy': {
              'label': 'Bone marrow biopsy/aspirate',
              'images': [],
              'description': 'The key diagnostic and monitoring procedure in leukemia, directly sampling marrow cellularity and blast percentage.',
              'mechanism': 'A needle sample from the marrow (usually the pelvis) allows direct microscopic, flow cytometric, and genetic assessment of the leukemic clone.',
              'funFacts': ['Auer rods — needle-like cytoplasmic inclusions — are a classic AML finding seen on these samples.'],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L13',
            },
            'remission': {
              'label': 'Complete remission',
              'images': [],
              'description': 'Defined by blast count falling below a set threshold (commonly <5%) with normal blood counts restored.',
              'mechanism': 'Remission criteria are based on marrow blast percentage and peripheral count recovery — not the same as undetectable MRD.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L13',
            },
            'transplant': {
              'label': 'Stem cell transplant',
              'images': [],
              'description': 'Allogeneic transplant uses a matched donor\'s cells; autologous transplant reinfuses the patient\'s own harvested cells.',
              'mechanism': 'Allogeneic transplant can trigger the graft-versus-leukemia effect via donor immune cells; autologous transplant does not carry that benefit.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Leukemia'],
              'course': 'MEDS3002',
              'class': 'L28',
            },
          },
        },
      },
    },
    'biochemistry': {
      'label': 'Biochemistry',
      'icon': '🧪',
      'blurb': 'Metabolism and molecular biology — MEDS2003. Starter content only; expand freely.',
      'topics': {
        'metabolism': {
          'items': {
            'warburgeffect': {
              'label': 'The Warburg effect',
              'images': [],
              'description': 'Cancer cells (and this game\'s namesake) often ferment glucose to lactate for energy even when oxygen is available.',
              'mechanism': 'Aerobic glycolysis is faster but far less ATP-efficient per glucose molecule than oxidative phosphorylation — a trade favouring rapid proliferation over efficiency.',
              'funFacts': ['Named after Otto Warburg, who first described it in the 1920s.', 'Basis for FDG-PET scans, which locate tumours by their glucose hunger.'],
              'refs': [],
              'hashtags': ['Metabolism'],
              'course': 'MEDS2003',
              'class': 'L1',
            },
            'gluconeogenesis': {
              'label': 'Gluconeogenesis',
              'images': [],
              'description': 'The synthesis of new glucose from non-carbohydrate precursors (lactate, glycerol, amino acids), mainly in the liver.',
              'mechanism': 'Largely reverses glycolysis but bypasses its three irreversible steps using distinct enzymes (e.g. PEPCK, fructose-1,6-bisphosphatase, glucose-6-phosphatase).',
              'funFacts': ['Essential during fasting to maintain blood glucose once glycogen stores run low.'],
              'refs': [],
              'hashtags': ['Fasting state'],
              'course': 'MEDS2003',
              'class': 'L6',
            },
          },
        },
        'molecularBiology': {
          'items': {
            'transcriptionbasics': {
              'label': 'Transcription (overview)',
              'images': [],
              'description': 'RNA polymerase synthesises an RNA copy of a DNA template, the first step of gene expression.',
              'mechanism': 'Initiation, elongation, and termination phases; in eukaryotes, RNA Pol II requires general transcription factors to assemble at the promoter.',
              'funFacts': [],
              'refs': [],
              'hashtags': ['Transcription'],
              'course': 'MEDS2003',
              'class': 'L25',
            },
          },
        },
      },
    },
  };

/* ======================================================================
   STAGES — per theme. Each stage has correct-answer requirements (reset
   each stage) and a narrative shown on the transition screen before that
   stage begins.
   ====================================================================== */
  const STAGES = {
    cancer: [
      /* "scenario" is patient-facing narrative — this is also where a real
         case study can be dropped in later (per stage). */
      { n:1, roman:'I', requirements:{ genetics:10 },
        scenario:"Patient presents with fatigue and unexplained bruising. Bloodwork shows an abnormal white cell count — the care team orders genetic testing to find out exactly what's driving it." },
      { n:2, roman:'II', requirements:{ genetics:5, immunology:10 },
        scenario:"The genetic picture is in. Now the patient's own immune system is in the fight — how well it can recognise and respond to the disease will shape what comes next." },
      { n:3, roman:'III', requirements:{ genetics:3, immunology:8, pharmacology:10 },
        scenario:"With the genetics and immunology understood, the patient starts treatment. Which drugs will actually work against this specific leukemia?" },
      { n:4, roman:'IV', requirements:{ genetics:3, immunology:5, pharmacology:7, oncology:10 },
        scenario:"The patient is now deep into treatment. Staging, complications, and what happens next define the road ahead." },
    ],
    // Deliberately short right now — biochemistry only has a handful of
    // seed questions so far. Expand requirements as you add more content
    // (see the contributor tool or dev notes).
    biochemistry: [
      { n:1, roman:'I', requirements:{ metabolism:2 },
        scenario:"You're tracing how a cell fuels itself — starting with how it handles glucose and energy production." },
      { n:2, roman:'II', requirements:{ metabolism:1, molecularBiology:1 },
        scenario:"From metabolism to the molecular machinery that reads and copies the genome — the next layer of the picture." },
    ],
  };
  const COMPLETE_SCENARIO = "You've worked through the full case — review your answers below, or start again to reinforce what you've learned. (Real case studies coming soon.)";

  const RUNNABLE_THEMES = ['cancer', 'biochemistry']; // themes with a matching STAGES config, playable in Runner mode


  window.RUNNER_DATA = {
    COURSES, TOPICS, GAME_CONFIG, LIFE_CONFIG, THEMES,
    STAGES, COMPLETE_SCENARIO, RUNNABLE_THEMES,
  };

})();
