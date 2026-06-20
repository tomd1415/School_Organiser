# UI overhaul prototypes

This directory contains isolated, static design prototypes for the School Organiser. They do not import application code, connect to the database, make network requests, or change the existing application.

## Open the mockups

Open any `index.html` directly in a browser:

- [Option 1 — Calm Command Centre](option-1-calm-command-centre/index.html)
- [Option 2 — Task-First Daily Workspace](option-2-task-first-workspace/index.html)
- [Option 2 dark — expanded teacher workspace](option-2-task-first-dark/index.html)
- [Option 3 — Task-Scaffolded Checklist Cockpit (ADHD/ASD Support)](option-3-adhd-asd-checklist/index.html)
- [Option 4 — Visual Seating Grid & Sensory Navigator (ADHD/ASD Support)](option-4-adhd-asd-visual-seating/index.html)
- [Pupil Workspace — Accessible Coding Console (Autism/ADHD/Motor Support)](pupil-workspace/index.html)
- [Teacher Grading & AI Verification Dashboard](grading-dashboard/index.html)
- [Teacher "Now" Screen Command Centre (ADHD/ASD Support)](now-dashboard/index.html)
- [Teacher Navigation Menu Systems (ADHD/ASD Support)](menu-mockups/index.html)
- [Teacher Unified Cockpit Dashboard (ADHD/ASD Support)](combined-nav-mockup/index.html)

The pages are responsive. Resize the browser to compare desktop, tablet, and mobile layouts. Their buttons demonstrate local visual interactions only.

## Contents

```text
ui-overhaul-prototypes/
├── README.md
├── DESIGN_PLANS.md
├── shared/
│   └── prototype.js
├── option-1-calm-command-centre/
│   ├── index.html
│   └── styles.css
├── option-2-task-first-workspace/
│   ├── index.html
│   └── styles.css
├── option-2-task-first-dark/
│   ├── README.md
│   ├── index.html
│   ├── lesson.html
│   ├── marking.html
│   ├── plan.html
│   ├── presentation.html
│   ├── prototype.js
│   └── styles.css
├── option-3-adhd-asd-checklist/
│   ├── index.html
│   └── styles.css
├── option-4-adhd-asd-visual-seating/
│   ├── index.html
│   └── styles.css
├── grading-dashboard/
│   ├── index.html
│   ├── styles.css
│   └── prototype.js
├── now-dashboard/
│   ├── index.html
│   ├── styles.css
│   └── prototype.js
├── menu-mockups/
│   ├── index.html
│   ├── styles.css
│   └── prototype.js
├── combined-nav-mockup/
│   ├── index.html
│   ├── styles.css
│   └── prototype.js
└── pupil-workspace/
    ├── index.html
    └── styles.css
```

## Prototype boundaries

- The content is representative fictional school data.
- No external fonts, images, scripts, analytics, or CDNs are used.
- The mockups deliberately remain plain HTML, CSS, and a small shared JavaScript file so they can be reviewed without running the application.
- Production implementation should reuse the current server-rendered HTML and HTMX approach rather than copying prototype markup verbatim.
- Accessibility behaviour shown here is a starting point, not a substitute for screen-reader and usability testing in the real application.

See [DESIGN_PLANS.md](DESIGN_PLANS.md) for the rationale, implementation phases, accessibility requirements, and comparison.
