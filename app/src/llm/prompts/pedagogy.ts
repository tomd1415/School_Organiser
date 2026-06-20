// The NCCE "12 Principles of Computing Pedagogy" (teachcomputing.org/pedagogy) — the single source of
// truth for both (a) the AI planning prompts, which append PEDAGOGY_GUIDANCE so generated schemes,
// lessons and resources are grounded in evidence-based computing pedagogy, and (b) the read-only
// /pedagogy reference page, which renders PEDAGOGY_PRINCIPLES. Keep the two in lock-step by never
// hard-coding the list anywhere else. Source: National Centre for Computing Education (NCCE).
export const PEDAGOGY_VERSION = 'ncce_pedagogy@1';
export const PEDAGOGY_SOURCE_URL = 'https://teachcomputing.org/pedagogy';

export interface PedagogyPrinciple {
  n: number;
  name: string;
  summary: string;
}

export const PEDAGOGY_PRINCIPLES: PedagogyPrinciple[] = [
  { n: 1, name: 'Lead with concepts', summary: 'Support learners with key concepts and vocabulary — glossaries, concept maps and displays, and regular recall and revision.' },
  { n: 2, name: 'Work together', summary: 'Encourage collaboration: pair programming, peer instruction and structured group tasks that stimulate dialogue and shared understanding.' },
  { n: 3, name: 'Get hands-on', summary: 'Use physical computing and making — electronics, programming and creative projects — to give a concrete, engaging context for concepts.' },
  { n: 4, name: 'Unplug, unpack, repack', summary: 'Teach with semantic waves: explore an idea in unplugged, familiar contexts, then repack that understanding back into the original concept.' },
  { n: 5, name: 'Model everything', summary: 'Model processes — from debugging to binary conversion — using worked examples and live coding.' },
  { n: 6, name: 'Foster program comprehension', summary: 'Consolidate understanding of how programs work with tracing, debugging and Parson’s Problems.' },
  { n: 7, name: 'Create projects', summary: 'Use project-based learning: pupils develop an artefact for a user or purpose and evaluate it against criteria.' },
  { n: 8, name: 'Add variety', summary: 'Offer tasks across a range of direction and scaffolding, from highly structured to open and exploratory.' },
  { n: 9, name: 'Challenge misconceptions', summary: 'Use formative questioning to surface misconceptions and adapt teaching to address them as they arise.' },
  { n: 10, name: 'Make concrete', summary: 'Bring abstract ideas to life with real-world, contextual examples and links to other subjects.' },
  { n: 11, name: 'Structure lessons', summary: 'Use research-based frameworks — PRIMM (Predict, Run, Investigate, Modify, Make) and Use–Modify–Create — to scaffold and differentiate.' },
  { n: 12, name: 'Read and explore code first', summary: 'When teaching programming, focus on reading and exploring code before writing it — reading proficiency supports writing.' },
];

// A compact, actionable appendix appended to the system prompt of the content-generating planning
// features. Phrased so the model applies the principles that FIT the topic rather than forcing all
// twelve into every lesson. Static guidance (no pupil data) — safe in the system string.
export const PEDAGOGY_GUIDANCE =
  '\n\nGROUND YOUR DESIGN IN THE NCCE 12 PRINCIPLES OF COMPUTING PEDAGOGY (apply the ones that fit the ' +
  'topic and age group; do not force all twelve into one lesson): lead with concepts (key vocabulary, ' +
  'concept maps, regular recall and revision); read and explore code before writing it; structure ' +
  'programming with PRIMM (Predict–Run–Investigate–Modify–Make) or Use–Modify–Create; model everything ' +
  'with worked examples and live coding; foster program comprehension through tracing, debugging and ' +
  'Parson’s Problems; challenge misconceptions with formative questioning; add variety (tasks ranging ' +
  'from highly structured to exploratory); make abstract ideas concrete with real-world contexts and ' +
  'unplugged activities (unplug–unpack–repack / semantic waves); get hands-on with physical computing ' +
  'where it fits; encourage collaboration (pair programming, peer instruction); and build purposeful ' +
  'projects evaluated against criteria.';
