// Authored content for the TEST-DATA seed (src/seed/testData.ts). Pure data + tiny markdown
// builders — no DB, no AI. Everything here is invented for manual testing; no real pupil exists.
import { CURRIC, SKILLS, GCSE, SOUND, BCS, AIMS, VI } from './data';

// ── Pupils ───────────────────────────────────────────────────────────────────────────────────
// A pool of clearly-fictional but realistic names. Per group we take a deterministic slice, so
// classes differ and names don't repeat within a class. (Names live only locally; the AI wrapper
// tokenises them before any egress — see CLAUDE.md.)
export const FIRST_NAMES = [
  'Amelia', 'Oliver', 'Isla', 'Noah', 'Ava', 'Leo', 'Mia', 'Arthur', 'Ivy', 'Freddie',
  'Florence', 'Theo', 'Willow', 'Archie', 'Rosie', 'Jude', 'Maya', 'Reuben', 'Elsie', 'Finley',
  'Aisha', 'Mohammed', 'Priya', 'Kai', 'Zara', 'Harvey', 'Nadia', 'Dylan', 'Sofia', 'Ethan',
  'Lily', 'Jacob', 'Grace', 'Logan', 'Ruby', 'Mason', 'Esme', 'Charlie', 'Daisy', 'Alfie',
  'Hannah', 'George', 'Layla', 'Oscar', 'Niamh', 'Harry', 'Chloe', 'Joshua', 'Erin', 'Samuel',
  'Tia', 'Bilal', 'Megan', 'Ryan', 'Anya', 'Callum', 'Heidi', 'Marcus', 'Saskia', 'Toby',
];
export const LAST_NAMES = [
  'Ahmed', 'Bennett', 'Carter', 'Davies', 'Evans', 'Fletcher', 'Gibson', 'Hughes', 'Iqbal', 'Jenkins',
  'Khan', 'Lewis', 'Morgan', 'Nguyen', "O'Brien", 'Patel', 'Quinn', 'Roberts', 'Singh', 'Taylor',
  'Underwood', 'Vaughan', 'Walsh', 'Yates', 'Adeyemi', 'Brennan', 'Clarke', 'Dawson', 'Ellis', 'Fox',
];

// How many pupils to enrol per group (by group name). Realistic class sizes.
export const GROUP_SIZE: Record<string, number> = {
  '7ARO': 28, '7RAL': 27, '7JMI': 26,
  '8PFA': 25, '8SJO': 24, '8MDU': 26,
  '9TDU': 22, '9EME': 23, '9SCL': 21,
  'Y10 GCSE CS': 18, 'Y11 GCSE CS Gp1': 12, 'Y11 GCSE CS Gp2': 13,
  'Post-16 Computing': 7,
};

// ── Worksheets ─────────────────────────────────────────────────────────────────────────────────
export interface WorksheetDef {
  title: string;
  intro: string;
  questions: { q: string; a: string }[]; // a = the expected/model answer (drives marking)
  codeQuestions?: { q: string; a: string }[]; // a code-writing answer box ("Type your code here")
  parsons?: { instruction: string; lines: string[] }; // a Parson's Problem; lines in CORRECT order
  checks: string[];
  blank?: { sentence: string; answer: string }; // sentence MUST contain "[[ ]]"
}

/** Build pupil-facing worksheet markdown from a structured def: an answer table (→ text fields), an
 *  optional code-writing table (→ code fields), an optional Parson's block (→ a parsons field), a
 *  self-check list (→ check fields) and an optional fill-in-the-blank (→ blank field). */
export function worksheetMarkdown(ws: WorksheetDef): string {
  const rows = ws.questions.map((it) => `| ${it.q} | Type your answer here |`).join('\n');
  const checks = ws.checks.map((c) => `- [ ] ${c}`).join('\n');
  const blank = ws.blank ? `\n\n> Key idea: ${ws.blank.sentence}\n` : '';
  const code = ws.codeQuestions?.length
    ? `\n\n## Write code\n| Task | Your code |\n|---|---|\n${ws.codeQuestions.map((it) => `| ${it.q} | Type your code here |`).join('\n')}\n`
    : '';
  const parsons = ws.parsons
    ? `\n\n## Put the code in order\n${ws.parsons.instruction}\n\n\`\`\`parsons\n${ws.parsons.lines.join('\n')}\n\`\`\`\n`
    : '';
  return `# ${ws.title}

${ws.intro}

## Questions
| Question | Your answer |
|---|---|
${rows}${code}${parsons}

## Check your understanding
${checks}${blank}
`;
}

/** A tiny markdown slide deck for a lesson (kind='slides', title ends .md). Each slide carries a
 *  private `> 🧑‍🏫` teacher note (engagement/tips) — shown on the presenter view, stripped from pupils. */
const SLIDE_TIPS = [
  'Take 2–3 hands on a quick question before revealing the answer.',
  'Turn-to-your-partner: 30 seconds to explain this, then cold-call one pair.',
  'Mini-whiteboards here — everyone shows an answer so you spot misconceptions fast.',
  'Drop in a real-world example and ask who has seen it before.',
];
export function slidesMarkdown(title: string, bullets: string[]): string {
  const slides = bullets
    .map((b, i) => `---\n\n## ${i + 1}. ${b.split(' — ')[0]}\n\n${b.split(' — ')[1] ?? b}\n\n> 🧑‍🏫 ${SLIDE_TIPS[i % SLIDE_TIPS.length]}`)
    .join('\n\n');
  return `# ${title}\n\n${slides}\n`;
}

// ── Lessons & schemes ────────────────────────────────────────────────────────────────────────
export interface LessonDef {
  title: string;
  objectives: string; // newline-separated, "- " bullets
  outline: string;
  duration?: number; // default 50
  kit?: string;
  worksheet?: WorksheetDef;
  extraWorksheets?: WorksheetDef[]; // additional worksheets on the same lesson (→ pupil tabs)
  slides?: string[]; // slide bullet lines "Heading — body"
}
export interface UnitDef {
  title: string;
  lessons: LessonDef[];
}
export interface SchemeDef {
  course: string; // course name (from data.ts)
  title: string;
  units: UnitDef[];
}

const obj = (...lines: string[]): string => lines.map((l) => `- ${l}`).join('\n');

// ----- shared worksheet definitions (reused where it makes sense) --------------------------------
const wsBinary: WorksheetDef = {
  title: 'Binary numbers',
  intro: 'Work through each conversion. Show the place values if it helps.',
  questions: [
    { q: 'Convert the binary number 0101 to denary.', a: '5' },
    { q: 'Convert the binary number 1010 to denary.', a: '10' },
    { q: 'Convert the denary number 12 to 4-bit binary.', a: '1100' },
    { q: 'What is the largest number you can store in 4 bits?', a: '15' },
  ],
  checks: ['I can convert binary to denary', 'I can convert denary to binary', 'I can explain place value'],
  blank: { sentence: 'each place value [[ ]] as you move from right to left.', answer: 'doubles' },
};
const wsAscii: WorksheetDef = {
  title: 'Representing text (ASCII)',
  intro: 'Use the ASCII table on the board to answer these.',
  questions: [
    { q: 'How many bits does standard ASCII use per character?', a: '7 bits' },
    { q: 'The letter A is 65. What is the denary code for C?', a: '67' },
    { q: 'Why does a computer need a character set?', a: 'so it can store and exchange text as binary codes consistently' },
  ],
  checks: ['I can describe what a character set is', 'I can work out a character code'],
  blank: { sentence: 'a character set maps each symbol to a unique [[ ]] number.', answer: 'binary' },
};
const wsSafety: WorksheetDef = {
  title: 'Staying safe online',
  intro: 'Think about your own online habits as you answer.',
  questions: [
    { q: 'Give one feature of a strong password.', a: 'long with a mix of letters, numbers and symbols' },
    { q: 'What should you do if a stranger messages you online?', a: 'do not reply and tell a trusted adult' },
    { q: 'Explain one risk of oversharing personal information.', a: 'it can be used to identify, locate or impersonate you' },
  ],
  checks: ['I can describe a strong password', 'I know who to tell if something worries me'],
  blank: { sentence: 'you should never share your password, not even with a [[ ]].', answer: 'friend' },
};
const wsCpu: WorksheetDef = {
  title: 'The CPU and von Neumann architecture',
  intro: 'Answer in full sentences using the correct technical terms.',
  questions: [
    { q: 'What is the purpose of the CPU?', a: 'to fetch, decode and execute instructions' },
    { q: 'What does the ALU do?', a: 'performs arithmetic and logic operations' },
    { q: 'What does the Control Unit (CU) do?', a: 'coordinates the components and manages the fetch-execute cycle' },
    { q: 'In von Neumann architecture, what is stored in the same memory?', a: 'both data and instructions (programs)' },
  ],
  checks: ['I can name the parts of the CPU', 'I can explain the role of the ALU and CU'],
  blank: { sentence: 'in the von Neumann model, instructions and data share the same [[ ]].', answer: 'memory' },
};
const wsFetch: WorksheetDef = {
  title: 'The fetch-execute cycle',
  intro: 'Put the cycle in your own words.',
  questions: [
    { q: 'Name the three stages of the cycle, in order.', a: 'fetch, decode, execute' },
    { q: 'Which register holds the address of the next instruction?', a: 'the Program Counter (PC)' },
    { q: 'What happens to the Program Counter during fetch?', a: 'it is incremented to point at the next instruction' },
  ],
  checks: ['I can list the stages of the cycle', 'I can describe the role of the PC and MAR'],
  blank: { sentence: 'the [[ ]] holds the address of the next instruction to fetch.', answer: 'program counter' },
};
const wsStorage: WorksheetDef = {
  title: 'Secondary storage',
  intro: 'Compare the three main types of secondary storage.',
  questions: [
    { q: 'Give one example of magnetic storage.', a: 'hard disk drive (HDD)' },
    { q: 'Give one advantage of solid-state storage over magnetic.', a: 'faster access and no moving parts' },
    { q: 'Why is optical storage (e.g. DVD) less used today?', a: 'low capacity and slow compared with SSDs and the cloud' },
  ],
  checks: ['I can name three types of secondary storage', 'I can compare their pros and cons'],
  blank: { sentence: 'solid-state drives store data using [[ ]] memory with no moving parts.', answer: 'flash' },
};
const wsSearch: WorksheetDef = {
  title: 'Searching algorithms',
  intro: 'Assume the lists are stored in an array.',
  questions: [
    { q: 'What must be true about the data before a binary search?', a: 'it must be sorted/in order' },
    { q: 'How does a linear search work?', a: 'it checks each item in turn from the start until it finds the target' },
    { q: 'Why is binary search usually faster than linear search?', a: 'it halves the search space each step' },
  ],
  checks: ['I can describe a linear search', 'I can describe a binary search'],
  blank: { sentence: 'a binary search repeatedly [[ ]] the list in half.', answer: 'divides' },
};
const wsSpreadsheet: WorksheetDef = {
  title: 'Spreadsheet cells and formulas',
  intro: 'Use the sample sheet on screen.',
  questions: [
    { q: 'What symbol must every formula start with?', a: 'an equals sign (=)' },
    { q: 'Write a formula to add cells A1 and A2.', a: '=A1+A2' },
    { q: 'What is a cell reference?', a: 'the column letter and row number that name a cell, e.g. B3' },
  ],
  checks: ['I can enter a formula', 'I can use a cell reference'],
  blank: { sentence: 'a formula always begins with an [[ ]] sign.', answer: 'equals' },
};
const wsWaves: WorksheetDef = {
  title: 'What is sound?',
  intro: 'Think about how sound is captured and stored.',
  questions: [
    { q: 'Sound travels as what kind of wave?', a: 'a pressure / longitudinal wave' },
    { q: 'What does sample rate measure?', a: 'how many samples are taken per second' },
    { q: 'What is the effect of a higher bit depth?', a: 'greater dynamic range and more accurate amplitude' },
  ],
  checks: ['I can define sample rate', 'I can define bit depth'],
  blank: { sentence: 'sample rate is measured in [[ ]].', answer: 'hertz' },
};
const wsSelection: WorksheetDef = {
  title: 'Selection (if / else)',
  intro: 'Read the code first, then write and order some of your own.',
  questions: [
    { q: 'What does selection let a program do?', a: 'choose between different paths based on a condition' },
    { q: 'Predict the output: if 7 > 4 then print("yes") else print("no")', a: 'yes' },
    { q: 'What is the role of else?', a: 'it runs when the if condition is false' },
  ],
  codeQuestions: [
    { q: 'Write an if statement that prints "Pass" when score is 40 or more.', a: 'if score >= 40:\n    print("Pass")' },
  ],
  parsons: {
    instruction: 'Drag these lines into order so the program asks for a score and prints Pass or Fail.',
    lines: ['score = int(input("Score? "))', 'if score >= 40:', '    print("Pass")', 'else:', '    print("Fail")'],
  },
  checks: ['I can write an if statement', 'I can use else', 'I can read code before writing it'],
  blank: { sentence: 'selection chooses a path using a [[ ]].', answer: 'condition' },
};

// A short EXTENSION worksheet — bound to the same lesson as wsSelection to show MULTIPLE worksheets
// per lesson (the pupil gets tabs; the teacher marks each from the modal's worksheet picker).
const wsSelectionExt: WorksheetDef = {
  title: 'Selection — extension',
  intro: 'Stretch tasks once you have finished the main worksheet.',
  questions: [
    { q: 'Give a real-world example where a program must choose between two actions.', a: 'e.g. a thermostat turning heating on if the temperature is below target' },
    { q: 'What is a nested if?', a: 'an if statement inside another if' },
  ],
  codeQuestions: [
    { q: 'Write code that prints "Even" or "Odd" for a number n.', a: 'if n % 2 == 0:\n    print("Even")\nelse:\n    print("Odd")' },
  ],
  checks: ['I tried a stretch task'],
};
const wsRobot: WorksheetDef = {
  title: 'Driving and turning',
  intro: 'Plan your robot moves before you test them.',
  questions: [
    { q: 'How do you make a two-wheel robot turn left on the spot?', a: 'drive the wheels in opposite directions' },
    { q: 'Why test moves in small steps?', a: 'so errors are easy to spot and correct' },
  ],
  checks: ['I can program a forward move', 'I can program a turn'],
  blank: { sentence: 'to turn on the spot, the wheels spin in [[ ]] directions.', answer: 'opposite' },
};
const wsAccess: WorksheetDef = {
  title: 'Magnification and contrast',
  intro: 'Try each tool as you go.',
  questions: [
    { q: 'Name one built-in magnifier shortcut.', a: 'Windows key and plus (+)' },
    { q: 'Why might high-contrast mode help some users?', a: 'it makes text stand out and reduces eye strain' },
  ],
  checks: ['I can turn on magnification', 'I can switch to high contrast'],
  blank: { sentence: 'high-contrast mode changes the [[ ]] to make text easier to read.', answer: 'colours' },
};

// ----- the schemes (one per course) -------------------------------------------------------------
export const SCHEMES: SchemeDef[] = [
  {
    course: CURRIC,
    title: 'KS3 Computing — How Computers Work & Online Life',
    units: [
      {
        title: 'How computers work',
        lessons: [
          { title: 'Inside a computer', objectives: obj('Name the main hardware components', 'Describe the role of the CPU, memory and storage'), outline: 'Tour of a desktop: CPU, RAM, storage, input/output. Card-sort of components to roles.', kit: 'Stripped-down PC / component cards', slides: ['Hardware tour — the four jobs: input, process, store, output', 'The CPU — the brain that processes instructions', 'Memory vs storage — fast & temporary vs slow & permanent'] },
          { title: 'Binary numbers', objectives: obj('Convert between binary and denary', 'Explain place value in binary'), outline: 'Place-value mat, count in binary, paired conversion practice, then the worksheet.', worksheet: wsBinary, slides: ['Why binary? — computers are made of switches: on/off', 'Place values — 8 4 2 1', 'Converting — add the place values that are on'] },
          { title: 'Binary addition', objectives: obj('Add two binary numbers', 'Identify an overflow error'), outline: 'Column addition in binary, carry bits, spotting overflow in a byte.' },
          { title: 'Representing text', objectives: obj('Explain what a character set is', 'Use ASCII codes'), outline: 'From numbers to letters: ASCII, the worksheet, then a "secret message" decode.', worksheet: wsAscii },
          { title: 'Representing images', objectives: obj('Explain how a bitmap stores an image', 'Define resolution and colour depth'), outline: 'Pixel grids on squared paper, then how more bits = more colours.' },
          { title: 'Unit quiz: how computers work', objectives: obj('Recall key facts from the unit'), outline: 'Low-stakes quiz + DIRT (dedicated improvement & reflection time).' },
        ],
      },
      {
        title: 'Networks & online life',
        lessons: [
          { title: 'What is a network?', objectives: obj('Define LAN and WAN', 'Describe why we connect computers'), outline: 'Networks around school, then LAN vs WAN sorting.' },
          { title: 'The Internet and the Web', objectives: obj('Explain the difference between the Internet and the WWW'), outline: 'A short history, packets, and what a URL is made of.' },
          { title: 'Staying safe online', objectives: obj('Describe strong passwords', 'Know how to report concerns'), outline: 'Scenario cards, the worksheet, and where to get help.', worksheet: wsSafety },
          { title: 'Search engines & reliable sources', objectives: obj('Refine a search', 'Judge whether a source is reliable'), outline: 'Search challenge, then the CRAAP test on three sites.' },
          { title: 'Unit quiz: networks & online life', objectives: obj('Recall key facts from the unit'), outline: 'Quiz + reflection, set next half-term project.' },
        ],
      },
    ],
  },
  {
    course: SKILLS,
    title: 'KS3 Digital Skills',
    units: [
      {
        title: 'Spreadsheets',
        lessons: [
          { title: 'Cells, references and formulas', objectives: obj('Enter a formula', 'Use a cell reference'), outline: 'Build a tuck-shop sheet; the worksheet checks the basics.', worksheet: wsSpreadsheet },
          { title: 'Functions: SUM and AVERAGE', objectives: obj('Use SUM and AVERAGE', 'Autofill a formula'), outline: 'Extend the sheet with totals and averages.' },
          { title: 'Charts that tell a story', objectives: obj('Choose an appropriate chart', 'Label a chart clearly'), outline: 'Turn the data into a bar and a pie chart; critique each.' },
          { title: 'Mini-project: event budget', objectives: obj('Apply formulas to a real task'), outline: 'Plan a budget for a school event; peer review.' },
        ],
      },
      {
        title: 'Documents & presentations',
        lessons: [
          { title: 'Formatting documents well', objectives: obj('Use headings and styles', 'Apply consistent formatting'), outline: 'Fix a "badly formatted" document against a checklist.' },
          { title: 'Designing a clear presentation', objectives: obj('Apply the 6x6 guideline', 'Use contrast and images well'), outline: 'Redesign a cluttered slide; before/after gallery.' },
        ],
      },
    ],
  },
  {
    course: GCSE,
    title: 'OCR J277 — Paper 1 (Summer term)',
    units: [
      {
        title: '1.1 Systems architecture',
        lessons: [
          { title: 'The CPU & von Neumann architecture', objectives: obj('Describe the purpose of the CPU', 'Identify ALU, CU and registers'), outline: 'Components and their roles; the worksheet consolidates terms.', worksheet: wsCpu, slides: ['Purpose of the CPU — fetch, decode, execute', 'Inside the CPU — ALU, CU, registers, cache', 'Von Neumann — data and instructions share memory'] },
          { title: 'The fetch-execute cycle', objectives: obj('Describe each stage of the cycle', 'Explain the role of key registers'), outline: 'Walk a tiny program through the cycle; worksheet.', worksheet: wsFetch },
          { title: 'Registers and buses', objectives: obj('Name the special-purpose registers', 'Describe the address, data and control buses'), outline: 'Trace data along the buses; MAR/MDR/PC/ACC roles.' },
          { title: 'CPU performance', objectives: obj('Explain how clock speed, cores and cache affect performance'), outline: 'Compare two spec sheets; which is faster and why?' },
          { title: 'Embedded systems', objectives: obj('Define an embedded system', 'Give examples'), outline: 'Spot the computer: washing machine, car, smartwatch.' },
        ],
      },
      {
        title: '1.2 Memory & storage',
        lessons: [
          { title: 'RAM, ROM and cache', objectives: obj('Compare RAM and ROM', 'Explain the purpose of cache'), outline: 'Volatile vs non-volatile; where cache sits.' },
          { title: 'Virtual memory', objectives: obj('Explain what virtual memory is and why it is used'), outline: 'What happens when RAM runs out; the swap file.' },
          { title: 'Secondary storage', objectives: obj('Compare magnetic, optical and solid-state storage'), outline: 'Pros/cons table; the worksheet; pick storage for scenarios.', worksheet: wsStorage },
          { title: 'Units and capacity calculations', objectives: obj('Convert between data units', 'Calculate file sizes'), outline: 'Bit→byte→KB→MB→GB; image and sound size sums.' },
          { title: 'Data compression', objectives: obj('Compare lossy and lossless compression'), outline: 'Why compress; when each type is appropriate.' },
        ],
      },
      {
        title: '2.1 Algorithms',
        lessons: [
          { title: 'Computational thinking', objectives: obj('Define decomposition, abstraction and pattern recognition'), outline: 'Break a big problem down; spot patterns.' },
          { title: 'Pseudocode and flowcharts', objectives: obj('Read and write simple pseudocode', 'Draw a flowchart'), outline: 'Standard symbols; convert between the two.' },
          { title: 'Searching algorithms', objectives: obj('Describe linear and binary search', 'Compare their efficiency'), outline: 'Card-based searches; the worksheet.', worksheet: wsSearch },
          { title: 'Sorting algorithms', objectives: obj('Describe bubble, merge and insertion sort'), outline: 'Human sorting demo; trace each on six values.' },
        ],
      },
    ],
  },
  {
    course: SOUND,
    title: 'Year 10 Sound Engineering — Capture & Mix',
    units: [
      {
        title: 'Sound fundamentals',
        lessons: [
          { title: 'What is sound?', objectives: obj('Describe sound as a wave', 'Define sample rate and bit depth'), outline: 'From air pressure to samples; the worksheet.', worksheet: wsWaves, kit: 'Headphones, DAW' },
          { title: 'Digital audio & sampling', objectives: obj('Explain analogue-to-digital conversion'), outline: 'Sampling demo; the effect of low sample rates.' },
          { title: 'Microphones & signal flow', objectives: obj('Identify mic types', 'Trace signal from mic to speaker'), outline: 'Dynamic vs condenser; gain staging.', kit: 'Mics, interface' },
        ],
      },
      {
        title: 'Recording & mixing',
        lessons: [
          { title: 'Setting levels & gain', objectives: obj('Set a clean recording level', 'Avoid clipping'), outline: 'Record a short clip; check meters.', kit: 'DAW, interface' },
          { title: 'EQ & dynamics', objectives: obj('Use EQ to shape a sound', 'Apply basic compression'), outline: 'Sweep EQ; tame a vocal with a compressor.' },
        ],
      },
    ],
  },
  {
    course: BCS,
    title: 'Thinking Like a Coder',
    units: [
      {
        title: 'Core constructs',
        lessons: [
          { title: 'Sequencing', objectives: obj('Order instructions correctly'), outline: 'Algorithm for a everyday task; debug a jumbled one.' },
          { title: 'Selection (if / else)', objectives: obj('Write an if/else', 'Use comparison operators'), outline: 'Branching challenges; the worksheet.', worksheet: wsSelection, extraWorksheets: [wsSelectionExt] },
          { title: 'Iteration (loops)', objectives: obj('Use a count-controlled loop', 'Use a condition-controlled loop'), outline: 'Repeat with for and while; trace the output.' },
        ],
      },
      {
        title: 'Structuring code',
        lessons: [
          { title: 'Functions & parameters', objectives: obj('Write a function', 'Pass a parameter'), outline: 'Refactor repeated code into a function.' },
          { title: 'Lists and data', objectives: obj('Store data in a list', 'Loop over a list'), outline: 'Build and process a list of scores.' },
        ],
      },
    ],
  },
  {
    course: AIMS,
    title: 'AIMS Robotics',
    units: [
      {
        title: 'Robot basics',
        lessons: [
          { title: 'Meet the robot', objectives: obj('Identify the robot’s parts', 'Run a first program'), outline: 'Safe handling; upload a hello-move.', kit: 'Robot kits, laptops' },
          { title: 'Driving and turning', objectives: obj('Program forward, reverse and turns'), outline: 'Maze warm-up; the worksheet plans the moves.', worksheet: wsRobot, kit: 'Robot kits, masking-tape track' },
          { title: 'Sequencing movements', objectives: obj('Combine moves into a route'), outline: 'Program a square; measure the error.' },
        ],
      },
      {
        title: 'Sensing the world',
        lessons: [
          { title: 'Touch & distance sensors', objectives: obj('Read a sensor', 'React to an obstacle'), outline: 'Stop before a wall; bumper reflex.', kit: 'Robot kits' },
          { title: 'Line following', objectives: obj('Use a light sensor to follow a line'), outline: 'Tune thresholds on the track.', kit: 'Robot kits, line track' },
        ],
      },
    ],
  },
  {
    course: VI,
    title: 'Accessible Computing for VI Pupils',
    units: [
      {
        title: 'Access tools',
        lessons: [
          { title: 'Magnification & contrast', objectives: obj('Use a screen magnifier', 'Switch to high contrast'), outline: 'Set up the workstation; the worksheet.', worksheet: wsAccess },
          { title: 'Keyboard navigation', objectives: obj('Navigate without a mouse', 'Use common shortcuts'), outline: 'Tab, arrow and shortcut practice.' },
        ],
      },
      {
        title: 'Screen readers',
        lessons: [
          { title: 'Introduction to screen readers', objectives: obj('Start a screen reader', 'Read a line of text'), outline: 'First steps with the reader; verbosity settings.', kit: 'Headphones' },
          { title: 'Navigating documents by audio', objectives: obj('Move by heading and paragraph'), outline: 'Jump around a structured document by audio.' },
        ],
      },
    ],
  },
];
