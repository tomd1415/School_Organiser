# Computing progression — 3-level planning view (course · unit · lesson), by stage & strand

> **Purpose.** The same Teach Computing content as
> [LEVEL_SYSTEM_FULL_PROGRESSION.md](LEVEL_SYSTEM_FULL_PROGRESSION.md), re-organised into the **three
> planning grains** you plan at, so each level is self-contained:
>
> - 🗓 **COURSE planning (coarsest)** — a whole **stage (year) × strand**: the year-long arc of each
>   strand. Use when mapping a year's coverage.
> - 📦 **UNIT planning (middle)** — a **unit** (≈ a half-term block) and the objectives it delivers. Use
>   when planning a unit/medium-term plan.
> - 📝 **LESSON planning (finest)** — a **learning objective / lesson** and its **"I can…"** success
>   criteria. Use when planning an individual lesson and deciding what to assess.
>
> **Strands are preserved throughout.** Mapping is one-stage-per-year (Stage 6 = Year 1 … Stage 14 =
> Year 9); KS1 = Stages 6–7, KS2 = 8–11, KS3 = 12–14. Source: `docs/TeachComputing_docs/` (Teach
> Computing Curriculum © Raspberry Pi Foundation). No pupil data involved.

**The hierarchy (how the levels nest):**

```
STAGE (year)                 ← course planning: the year
└─ STRAND (e.g. Programming) ← course planning: the year-long thread of one strand
   └─ UNIT (e.g. 'Scratch')  ← UNIT planning: a half-term block
      └─ LESSON / objective  ← LESSON planning: one lesson's aim
         └─ 'I can…' criteria ← LESSON planning: what the pupil evidences (the tickable items)
```

**Strand key:** **CS** Computing systems · **NW** Networks · **PG** Programming · **AL** Algorithms · **DI** Data & information · **CM** Creating media · **DD** Design & development · **ET** Effective use of tools · **IT** Impact of technology · **SS** Safety & security

---

## ⭐ Per-pupil tracking and the planning principle (non-negotiable)

This progression is **not** a class-wide checklist — it is tracked **per individual pupil**. The system must
keep, for **every pupil**, exactly **which "I can…" statements they have achieved** (evidenced and ticked),
so each pupil's current stage **per strand** and overall rolls up from *their own* ticks.

**The planning goal that follows from this:** every **lesson plan** generated should be aimed at **pushing
each individual pupil up a stage** — the lesson's "I can…" targets are chosen to be that pupil's *next
un-achieved* criteria, so that across a **unit** the pupil clears a strand's criteria for the next stage,
and across the **year** they advance a full stage. Planning is therefore **differentiated by where each
pupil already is**, not pitched at the class average.

Concretely, at each grain:

- 📝 **Lesson plan** — for each pupil, target **their** next un-ticked "I can…" criteria (the gap between
  what they've evidenced and the next stage), with Support/Core/Challenge framed around that gap. The
  lesson's success criteria = the criteria you intend *that* pupil to evidence in it.
- 📦 **Unit plan** — sequence a unit's lessons so that, by the end, each pupil has had the chance to
  evidence **all** of the next stage's criteria for the strand(s) the unit covers — i.e. the unit is
  what moves them up a stage in those strands. The **end-of-unit assessment** then *confirms* it: it is
  built around the unit's **stage criteria / learning objectives** (covering a band around the unit's
  stage), so its result is **the stage that most accurately reflects each pupil's ability** in those
  strands — not just a percentage. Optionally **individualised per pupil** (a paper centred on that pupil's
  own boundary criteria) for classes with a wide spread.
- 🗓 **Course (year) plan** — across the year's units, ensure every pupil has a path to evidence a full
  stage's worth of criteria in **every** strand, so the year's net effect is **+1 stage** for each pupil
  (faster where a pupil is ahead, with extra scaffolding where they are behind).

**What this requires of the data** (see [LEVEL_SYSTEM_DB_DESIGN.md](LEVEL_SYSTEM_DB_DESIGN.md)): a per-pupil
record of every achieved "I can…" criterion (`pupil_criteria_evidence`), a computed per-strand current
stage + overall roll-up, and a "next criteria for this pupil" query (the un-evidenced criteria at their
next stage) that lesson generation reads to set each pupil's targets. Evidence can be a manual tick or
auto-suggested from marking — **always teacher-confirmed**, and is **per-pupil PII** (no pupil name to AI;
cleared on erasure).

**Where each pupil starts — the start-of-year baseline.** Before the "+1 stage" planning can run, each
pupil needs a **starting stage**. A short **baseline assessment** at the start of the year establishes it
(Phase 16A.7): for **Year 7** (cold start, no history) a broad, low-resolution probe *locates* the pupil's
level; for **other years** the prior-year stage *guides* a tighter, shorter baseline. Baselines are kept
**deliberately short** (objective, auto-marked, adaptive early-stop) because pupils dislike long
assessments and **click randomly when overwhelmed** — and that randomness would poison the placement, so
fast/patterned responses are flagged low-confidence for the teacher to review rather than trusted. The
baseline result seeds each pupil's starting per-strand stage; everything above plans **up** from there.

---

# 🗓 Stage 6 — Year 1 · age 5–6 (KS1)  ·  *course-planning level*

*This year: 6 strands · 36 learning objectives · 108 "I can…" criteria.*

**Course overview — strands × units this year:**

| Strand | Units (this year) |
|---|---|
| **Computing systems** (CS) | Computing systems and networks – Technology around us |
| **Programming** (PG) | Programming A – Moving a robot; Programming B – Introduction to animation |
| **Algorithms** (AL) | Programming A – Moving a robot; Programming B – Introduction to animation |
| **Data & information** (DI) | Data and information – Grouping data |
| **Creating media** (CM) | Creating media – Digital painting; Creating media – Digital writing |
| **Design & development** (DD) | Programming B – Introduction to animation |

## 📦 Stage 6 › Computing systems (CS)  ·  *unit-planning level*

### Computing systems and networks – Technology around us
*6 lessons.*  

- 📝 **To identify technology**  *(also: IT)*
    - I can explain how these technology examples help us
    - I can explain technology as something that helps us
    - I can locate examples of technology in the classroom
- 📝 **To identify a computer and its main parts**
    - I can name the main parts of a computer
    - I can switch on and log into a computer
    - I can use a mouse to click and drag
- 📝 **To use a mouse in different ways**  *(also: ET)*
    - I can click and drag to make objects on a screen
    - I can use a mouse to create a picture
    - I can use a mouse to open a program
- 📝 **To use a keyboard to type on a computer**  *(also: ET)*
    - I can save my work to a file
    - I can say what a keyboard is for
    - I can type my name on a computer
- 📝 **To use the keyboard to edit text**  *(also: ET)*
    - I can delete letters
    - I can open my work from a file
    - I can use the arrow keys to move the cursor
- 📝 **To create rules for using technology responsibly**  *(also: ET, SS)*
    - I can discuss how we benefit from these rules
    - I can give examples of some of these rules
    - I can identify rules to keep us safe and healthy when we are using technology in and beyond the home

## 📦 Stage 6 › Programming (PG)  ·  *unit-planning level*

### Programming A – Moving a robot
*2 lessons.*  

- 📝 **To combine forwards and backwards commands to make a sequence**
    - I can compare forwards and backwards movements
    - I can predict the outcome of a sequence involving forwards and backwards commands
    - I can start a sequence from the same place
- 📝 **To combine four direction commands to make sequences**
    - I can compare left and right turns
    - I can experiment with turn and move commands to move a robot
    - I can predict the outcome of a sequence involving up to four commands

### Programming B – Introduction to animation
*4 lessons.*  

- 📝 **To choose a command for a given purpose**
    - I can compare different programming tools
    - I can find which commands to move a sprite
    - I can use commands to move a sprite
- 📝 **To show that a series of commands can be joined together**
    - I can run my program
    - I can use a Start block in a program
    - I can use more than one block by joining them together
- 📝 **To identify the effect of changing a value**
    - I can change the value
    - I can find blocks that have numbers
    - I can say what happens when I change a value
- 📝 **To explain that each sprite has its own instructions**
    - I can add blocks to each of my sprites
    - I can delete a sprite
    - I can show that a project can include more than one sprite

## 📦 Stage 6 › Algorithms (AL)  ·  *unit-planning level*

### Programming A – Moving a robot
*4 lessons.*  

- 📝 **To explain what a given command will do**
    - I can match a command to an outcome
    - I can predict the outcome of a command on a device
    - I can run a command on a device
- 📝 **To act out a given word**  *(also: IT)*
    - I can follow an instruction
    - I can give directions
    - I can recall words that can be acted out
- 📝 **To plan a simple program**  *(also: DD)*
    - I can choose the order of commands in a sequence
    - I can debug my program
    - I can explain what my program should do
- 📝 **To find more than one solution to a problem**
    - I can identify several possible solutions
    - I can plan two programs
    - I can use two different programs to get to the same place

### Programming B – Introduction to animation
*1 lessons.*  

- 📝 **To use my algorithm to create a program**  *(also: DD, PG)*
    - I can add programming blocks based on my algorithm
    - I can test the programs I have created
    - I can use sprites that match my design

## 📦 Stage 6 › Data & information (DI)  ·  *unit-planning level*

### Data and information – Grouping data
*6 lessons.*  

- 📝 **To label objects**
    - I can describe objects using labels
    - I can identify the label for a group of objects
    - I can match objects to groups
- 📝 **To identify that objects can be counted**
    - I can count a group of objects
    - I can count objects
    - I can group objects
- 📝 **To describe objects in different ways**
    - I can describe an object
    - I can describe a property of an object
    - I can find objects with similar properties
- 📝 **To count objects with the same properties**
    - I can count how many objects share a property
    - I can group objects in more than one way
    - I can group similar objects
- 📝 **To compare groups of objects**
    - I can choose how to group objects
    - I can describe groups of objects
    - I can record how many objects are in a group
- 📝 **To answer questions about groups of objects**
    - I can compare groups of objects
    - I can decide how to group objects to answer a question
    - I can record and share what I have found

## 📦 Stage 6 › Creating media (CM)  ·  *unit-planning level*

### Creating media – Digital painting
*6 lessons.*  

- 📝 **To describe what different freehand tools do**  *(also: ET)*
    - I can draw lines on a screen and explain which tools I used
    - I can make marks on a screen and explain which tools I used
    - I can use the paint tools to draw a picture
- 📝 **To use the shape tool and the line tools**  *(also: ET)*
    - I can make marks with the square and line tools
    - I can use the shape and line tools effectively
    - I can use the shape and line tools to recreate the work of an artist
- 📝 **To make careful choices when painting a digital picture**  *(also: ET)*
    - I can choose appropriate shapes
    - I can create a picture in the style of an artist
    - I can make appropriate colour choices
- 📝 **To explain why I chose the tools I used**  *(also: DD, ET)*
    - I can choose appropriate paint tools and colours to recreate the work of an artist
    - I can say which tools were helpful and why
    - I know that different paint tools do different jobs
- 📝 **To use a computer on my own to paint a picture**  *(also: ET)*
    - I can change the colour and brush sizes
    - I can make dots of colour on the page
    - I can use dots of colour to create a picture in the style of an artist on my own
- 📝 **To compare painting a picture on a computer and on paper**  *(also: DD, ET)*
    - I can explain that pictures can be made in lots of different ways
    - I can say whether I prefer painting using a computer or using paper
    - I can spot the differences between painting on a computer and on paper

### Creating media – Digital writing
*6 lessons.*  

- 📝 **To use a computer to write**  *(also: ET)*
    - I can identify and find keys on a keyboard
    - I can open a word processor
    - I can recognise keys on a keyboard
- 📝 **To add and remove text on a computer**  *(also: ET)*
    - I can enter text into a computer
    - I can use backspace to remove text
    - I can use letter, number, and space keys
- 📝 **To identify that the look of text can be changed on a computer**  *(also: ET)*
    - I can explain what the keys that I have learnt about already do
    - I can identify the toolbar and use bold, italic, and underline
    - I can type capital letters
- 📝 **To make careful choices when changing text**  *(also: ET)*
    - I can change the font
    - I can select all of the text by clicking and dragging
    - I can select a word by double-clicking
- 📝 **To explain why I used the tools that I chose**  *(also: DD, ET)*
    - I can decide if my changes have improved my writing
    - I can say what tool I used to change the text
    - I can use 'undo' to remove changes
- 📝 **To compare typing on a computer to writing on paper**  *(also: ET)*
    - I can explain the differences between typing and writing
    - I can make changes to text on a computer
    - I can say why I prefer typing or writing

## 📦 Stage 6 › Design & development (DD)  ·  *unit-planning level*

### Programming B – Introduction to animation
*1 lessons.*  

- 📝 **To design the parts of a project**  *(also: PG)*
    - I can choose appropriate artwork for my project
    - I can create an algorithm for each sprite
    - I can decide how each sprite will move

---

# 🗓 Stage 7 — Year 2 · age 6–7 (KS1)  ·  *course-planning level*

*This year: 6 strands · 36 learning objectives · 108 "I can…" criteria.*

**Course overview — strands × units this year:**

| Strand | Units (this year) |
|---|---|
| **Computing systems** (CS) | Computing systems and networks – IT around us |
| **Programming** (PG) | Programming B – An introduction to quizzes |
| **Algorithms** (AL) | Programming A – Robot algorithms |
| **Data & information** (DI) | Data and information – Pictograms |
| **Creating media** (CM) | Creating media – Digital photography; Creating media – Making music |
| **Design & development** (DD) | Programming B – An introduction to quizzes |

## 📦 Stage 7 › Computing systems (CS)  ·  *unit-planning level*

### Computing systems and networks – IT around us
*6 lessons.*  

- 📝 **To recognise the uses and features of information technology**  *(also: NW, SS)*
    - I can describe some uses of computers
    - I can identify examples of computers
    - I can identify that a computer is a part of IT
- 📝 **To identify the uses of information technology in the school**  *(also: IT, NW)*
    - I can identify examples of IT
    - I can identify that some IT can be used in more than one way
    - I can sort school IT by what it's used for
- 📝 **To identify information technology beyond school**  *(also: IT, NW)*
    - I can find examples of information technology
    - I can sort IT by where it is found
    - I can talk about uses of information technology
- 📝 **To explain how information technology helps us**  *(also: IT, NW)*
    - I can demonstrate how IT devices work together
    - I can recognise common types of technology
    - I can say why we use IT
- 📝 **To explain how to use information technology safely**  *(also: NW, SS)*
    - I can list different uses of information technology
    - I can say how rules can help keep me safe
    - I can talk about different rules for using IT
- 📝 **To recognise that choices are made when using information technology**  *(also: IT, NW, SS)*
    - I can explain the need to use IT in different ways
    - I can identify the choices that I make when using IT
    - I can use IT for different types of activities

## 📦 Stage 7 › Programming (PG)  ·  *unit-planning level*

### Programming B – An introduction to quizzes
*2 lessons.*  

- 📝 **To explain that a sequence of commands has a start**
    - I can identify that a program needs to be started
    - I can identify the start of a sequence
    - I can show how to run my program
- 📝 **To explain that a sequence of commands has an outcome**
    - I can change the outcome of a sequence of commands
    - I can match two sequences with the same outcome
    - I can predict the outcome of a sequence of commands

## 📦 Stage 7 › Algorithms (AL)  ·  *unit-planning level*

### Programming A – Robot algorithms
*6 lessons.*  

- 📝 **To describe a series of instructions as a sequence**
    - I can choose a series of words that can be enacted as a sequence
    - I can follow instructions given by someone else
    - I can give clear and unambiguous instructions
- 📝 **To explain what happens when we change the order of instructions**
    - I can create different algorithms for a range of sequences (using the same commands)
    - I can show the difference in outcomes between two sequences that consist of the same commands
    - I can use an algorithm to program a sequence on a floor robot
- 📝 **To use logical reasoning to predict the outcome of a program (series of commands)**  *(also: PG)*
    - I can compare my prediction to the program outcome
    - I can follow a sequence
    - I can predict the outcome of a sequence
- 📝 **To explain that programming projects can have code and artwork**  *(also: DD, PG)*
    - I can explain the choices I made for my mat design
    - I can identify different routes around my mat
    - I can test my mat to make sure that it is usable
- 📝 **To design an algorithm**  *(also: DD)*
    - I can create an algorithm to meet my goal
    - I can explain what my algorithm should achieve
    - I can use my algorithm to create a program
- 📝 **To create and debug a program that I have written**  *(also: DD, PG)*
    - I can plan algorithms for different parts of a task
    - I can put together the different parts of my program
    - I can test and debug each part of the program

## 📦 Stage 7 › Data & information (DI)  ·  *unit-planning level*

### Data and information – Pictograms
*6 lessons.*  

- 📝 **To recognise that we can count and compare objects using tally charts**
    - I can compare totals in a tally chart
    - I can record data in a tally chart
    - I can represent a tally count as a total
- 📝 **To recognise that objects can be represented as pictures**  *(also: ET)*
    - I can enter data onto a computer
    - I can use a computer to view data in a different format
    - I can use pictograms to answer simple questions about objects
- 📝 **To create a pictogram**  *(also: ET)*
    - I can explain what the pictogram shows
    - I can organise data in a tally chart
    - I can use a tally chart to create a pictogram
- 📝 **To select objects by attribute and make comparisons**  *(also: ET)*
    - I can answer 'more than'/'less than' and 'most/least' questions about an attribute
    - I can create a pictogram to arrange objects by an attribute
    - I can tally objects using a common attribute
- 📝 **To recognise that people can be described by attributes**  *(also: ET)*
    - I can choose a suitable attribute to compare people
    - I can collect the data I need
    - I can create a pictogram and draw conclusions from it
- 📝 **To explain that we can present information using a computer**  *(also: ET, SS)*
    - I can give simple examples of why information should not be shared
    - I can share what I have found out using a computer
    - I can use a computer program to present information in different ways

## 📦 Stage 7 › Creating media (CM)  ·  *unit-planning level*

### Creating media – Digital photography
*6 lessons.*  

- 📝 **To use a digital device to take a photograph**  *(also: CS)*
    - I can explain what I did to capture a digital photo
    - I can recognise what devices can be used to take photographs
    - I can talk about how to take a photograph
- 📝 **To make choices when taking a photograph**  *(also: CS, ET)*
    - I can explain the process of taking a good photograph
    - I can explain why a photo looks better in portrait or landscape format
    - I can take photos in both landscape and portrait format
- 📝 **To describe what makes a good photograph**  *(also: DD)*
    - I can discuss how to take a good photograph
    - I can identify what is wrong with a photograph
    - I can improve a photograph by retaking it
- 📝 **To decide how photographs can be improved**  *(also: DD, ET)*
    - I can experiment with different light sources
    - I can explain why a picture may be unclear
    - I can explore the effect that light has on a photo
- 📝 **To use tools to change an image**  *(also: ET)*
    - I can explain my choices
    - I can recognise that images can be changed
    - I can use a tool to achieve a desired effect
- 📝 **To recognise that photos can be changed**  *(also: ET)*
    - I can apply a range of photography skills to capture a photo
    - I can identify which photos are real and which have been changed
    - I can recognise which photos have been changed

### Creating media – Making music
*6 lessons.*  

- 📝 **To say how music can make us feel**
    - I can describe how music makes me feel, e.g. happy or sad
    - I can identify simple differences in pieces of music
    - I can listen with concentration to a range of music (links to the Music curriculum)
- 📝 **To identify that there are patterns in music**
    - I can create a rhythm pattern
    - I can explain that music is created and played by humans
    - I can play an instrument following a rhythm pattern
- 📝 **To show how music is made from a series of notes**  *(also: DI)*
    - I can identify that music is a sequence of notes
    - I can refine my musical pattern on a computer
    - I can use a computer to create a musical pattern using three notes
- 📝 **To show how music is made from a series of notes**  *(also: DI)*
    - I can identify that music is a sequence of notes
    - I can refine my musical pattern on a computer
    - I can use a computer to create a musical pattern using three notes
- 📝 **To create music for a purpose**  *(also: DD, ET)*
    - I can describe an animal using sounds
    - I can explain my choices
    - I can save my work
- 📝 **To review and refine our computer work**  *(also: ET)*
    - I can explain how I made my work better
    - I can listen to music and describe how it makes me feel
    - I can reopen my work

## 📦 Stage 7 › Design & development (DD)  ·  *unit-planning level*

### Programming B – An introduction to quizzes
*4 lessons.*  

- 📝 **To create a program using a given design**  *(also: PG)*
    - I can build the sequences of blocks I need
    - I can decide which blocks to use to meet the design
    - I can work out the actions of a sprite in an algorithm
- 📝 **To change a given design**  *(also: PG)*
    - I can choose backgrounds for the design
    - I can choose characters for the design
    - I can create a program based on the new design
- 📝 **To create a program using my own design**  *(also: PG)*
    - I can build sequences of blocks to match my design
    - I can choose the images for my own design
    - I can create an algorithm
- 📝 **To decide how my project can be improved**  *(also: PG)*
    - I can compare my project to my design
    - I can debug my program
    - I can improve my project by adding features

---

# 🗓 Stage 8 — Year 3 · age 7–8 (KS2)  ·  *course-planning level*

*This year: 7 strands · 36 learning objectives · 108 "I can…" criteria.*

**Course overview — strands × units this year:**

| Strand | Units (this year) |
|---|---|
| **Computing systems** (CS) | Computing systems and networks – Connecting computers |
| **Programming** (PG) | Programming A – Sequence in music; Programming B – Events and actions |
| **Algorithms** (AL) | Programming A – Sequence in music |
| **Data & information** (DI) | Data and information – Branching databases |
| **Creating media** (CM) | Creating media – Animation; Creating media – Desktop publishing |
| **Design & development** (DD) | Data and information – Branching databases; Programming A – Sequence in music; Programming B – Events and actions |
| **Effective use of tools** (ET) | Programming A – Sequence in music; Programming B – Events and actions |

## 📦 Stage 8 › Computing systems (CS)  ·  *unit-planning level*

### Computing systems and networks – Connecting computers
*6 lessons.*  

- 📝 **To explain how digital devices function**
    - I can explain that digital devices accept inputs
    - I can explain that digital devices produce outputs
    - I can follow a process
- 📝 **To identify input and output devices**
    - I can classify input and output devices
    - I can describe a simple process
    - I can design a digital device
- 📝 **To recognise how digital devices can change the way we work**  *(also: IT)*
    - I can explain how I use digital devices for different activities
    - I can recognise similarities between using digital devices and non-digital tools
    - I can suggest differences between using digital devices and non-digital tools
- 📝 **To explain how a computer network can be used to share information**  *(also: NW)*
    - I can discuss why we need a network switch
    - I can explain how messages are passed through multiple connections
    - I can recognise different connections
- 📝 **To explore how digital devices can be connected**  *(also: NW)*
    - I can demonstrate how information can be passed between devices
    - I can explain the role of a switch, server, and wireless access point in a network
    - I can recognise that a computer network is made up of a number of devices
- 📝 **To recognise the physical components of a network**  *(also: NW)*
    - I can identify how devices in a network are connected together
    - I can identify networked devices around me
    - I can identify the benefits of computer networks

## 📦 Stage 8 › Programming (PG)  ·  *unit-planning level*

### Programming A – Sequence in music
*3 lessons.*  

- 📝 **To identify that commands have an outcome**
    - I can choose a word which describes an on-screen action for my plan
    - I can create a program following a design
    - I can identify that each sprite is controlled by the commands I choose
- 📝 **To explain that a program has a start**
    - I can create a sequence of connected commands
    - I can explain that the objects in my project will respond exactly to the code
    - I can start a program in different ways
- 📝 **To recognise that a sequence of commands can have an order**
    - I can combine sound commands
    - I can explain what a sequence is
    - I can order notes into a sequence

### Programming B – Events and actions
*2 lessons.*  

- 📝 **To adapt a program to a new context**
    - I can choose blocks to set up my program
    - I can consider the real world when making design choices
    - I can use a programming extension
- 📝 **To develop my program by adding features**
    - I can build more sequences of commands to make my design work
    - I can choose suitable keys to turn on additional features
    - I can identify additional features (from a given set of blocks)

## 📦 Stage 8 › Algorithms (AL)  ·  *unit-planning level*

### Programming A – Sequence in music
*1 lessons.*  

- 📝 **To create a project from a task description**  *(also: CM, DD, PG)*
    - I can identify and name the objects I will need for a project
    - I can implement my algorithm as code
    - I can relate a task description to a design

## 📦 Stage 8 › Data & information (DI)  ·  *unit-planning level*

### Data and information – Branching databases
*4 lessons.*  

- 📝 **To create questions with yes/no answers**
    - I can create two groups of objects separated by one attribute
    - I can investigate questions with yes/no answers
    - I can make up a yes/no question about a collection of objects
- 📝 **To identify the object attributes needed to collect relevant data**
    - I can arrange objects into a tree structure
    - I can create a group of objects within an existing group
    - I can select an attribute to separate objects into groups
- 📝 **To create a branching database**  *(also: ET)*
    - I can group objects using my own yes/no questions
    - I can prove my branching database works
    - I can select objects to arrange in a branching database
- 📝 **To identify objects using a branching database**  *(also: ET)*
    - I can create questions and apply them to a tree structure
    - I can select a theme and choose a variety of objects
    - I can use my branching database to answer questions

## 📦 Stage 8 › Creating media (CM)  ·  *unit-planning level*

### Creating media – Animation
*6 lessons.*  

- 📝 **To explain that animation is a sequence of drawings or photographs**  *(also: ET)*
    - I can create an effective flip book—style animation
    - I can draw a sequence of pictures
    - I can explain how an animation/flip book works
- 📝 **To relate animated movement with a sequence of images**  *(also: ET)*
    - I can create an effective stop-frame animation
    - I can explain why little changes are needed for each frame
    - I can predict what an animation will look like
- 📝 **To plan an animation**  *(also: DD)*
    - I can break down a story into settings, characters and events
    - I can create a storyboard
    - I can describe an animation that is achievable on screen
- 📝 **To identify the need to work consistently and carefully**  *(also: DD, ET)*
    - I can evaluate the quality of my animation
    - I can review a sequence of frames to check my work
    - I can use onion skinning to help me make small changes between frames
- 📝 **To review and improve an animation**  *(also: DD, ET)*
    - I can evaluate another learner's animation
    - I can explain ways to make my animation better
    - I can improve my animation based on feedback
- 📝 **To evaluate the impact of adding other media to an animation**  *(also: DD, ET)*
    - I can add other media to my animation
    - I can evaluate my final film
    - I can explain why I added other media to my animation

### Creating media – Desktop publishing
*6 lessons.*  

- 📝 **To recognise how text and images convey information**
    - I can explain the difference between text and images
    - I can identify the advantages and disadvantages of using text and images
    - I can recognise that text and images can communicate messages clearly
- 📝 **To recognise that text and layout can be edited**  *(also: ET)*
    - I can change font style, size, and colours for a given purpose
    - I can edit text
    - I can explain that text can be changed to communicate more clearly
- 📝 **To choose appropriate page settings**  *(also: ET)*
    - I can create a template for a particular purpose
    - I can define the term 'page orientation'
    - I can recognise placeholders and say why they are important
- 📝 **To add content to a desktop publishing publication**  *(also: ET)*
    - I can choose the best locations for my content
    - I can make changes to content after I've added it
    - I can paste text and images to create a magazine cover
- 📝 **To consider how different layouts can suit different purposes**  *(also: DD, ET)*
    - I can choose a suitable layout for a given purpose
    - I can identify different layouts
    - I can match a layout to a purpose
- 📝 **To consider the benefits of desktop publishing**  *(also: DD, ET, IT)*
    - I can compare work made on desktop publishing to work created by hand
    - I can identify the uses of desktop publishing in the real world
    - I can say why desktop publishing might be helpful

## 📦 Stage 8 › Design & development (DD)  ·  *unit-planning level*

### Data and information – Branching databases
*2 lessons.*  

- 📝 **To explain why it is helpful for a database to be well structured**  *(also: DI, ET)*
    - I can compare two branching database structures
    - I can create yes/no questions using given attributes
    - I can explain that questions need to be ordered carefully to split objects into similarly sized groups
- 📝 **To compare the information shown in a pictogram with a branching database**  *(also: DI)*
    - I can compare two ways of presenting information
    - I can explain what a branching database tells me
    - I can explain what a pictogram tells me

### Programming A – Sequence in music
*1 lessons.*  

- 📝 **To change the appearance of my project**  *(also: PG)*
    - I can build a sequence of commands
    - I can decide the actions for each sprite in a program
    - I can make design choices for my artwork

### Programming B – Events and actions
*2 lessons.*  

- 📝 **To identify and fix bugs in a program**  *(also: PG)*
    - I can match a piece of code to an outcome
    - I can modify a program using a design
    - I can test a program against a given design
- 📝 **To design and create a maze-based challenge**  *(also: PG)*
    - I can evaluate my project
    - I can implement my design
    - I can make design choices and justify them

## 📦 Stage 8 › Effective use of tools (ET)  ·  *unit-planning level*

### Programming A – Sequence in music
*1 lessons.*  

- 📝 **To explore a new programming environment**  *(also: PG)*
    - I can explain that objects in Scratch have attributes (linked to)
    - I can identify the objects in a Scratch project (sprites, backdrops)
    - I can recognise that commands in Scratch are represented as blocks

### Programming B – Events and actions
*2 lessons.*  

- 📝 **To explain how a sprite moves in an existing project**  *(also: PG)*
    - I can choose which keys to use for actions and explain my choices
    - I can explain the relationship between an event and an action
    - I can identify a way to improve a program
- 📝 **To create a program to move a sprite in four directions**  *(also: PG)*
    - I can choose a character for my project
    - I can choose a suitable size for a character in a maze
    - I can program movement

---

# 🗓 Stage 9 — Year 4 · age 8–9 (KS2)  ·  *course-planning level*

*This year: 9 strands · 36 learning objectives · 108 "I can…" criteria.*

**Course overview — strands × units this year:**

| Strand | Units (this year) |
|---|---|
| **Computing systems** (CS) | Creating media – Audio editing; Data and information – Data logging |
| **Networks** (NW) | Computing systems and networks – The Internet |
| **Programming** (PG) | Programming A – Repetition in shapes; Programming B – Repetition in games |
| **Algorithms** (AL) | Programming A – Repetition in shapes; Programming B – Repetition in games |
| **Data & information** (DI) | Data and information – Data logging |
| **Creating media** (CM) | Computing systems and networks – The Internet; Creating media – Audio editing; Creating media – Photo editing |
| **Design & development** (DD) | Programming B – Repetition in games |
| **Effective use of tools** (ET) | Programming A – Repetition in shapes |
| **Impact of technology** (IT) | Computing systems and networks – The Internet |

## 📦 Stage 9 › Computing systems (CS)  ·  *unit-planning level*

### Creating media – Audio editing
*1 lessons.*  

- 📝 **To identify that sound can be digitally recorded**  *(also: DI)*
    - I can identify digital devices that can record sound and play it back
    - I can identify the inputs and outputs required to play audio or record sound
    - I can recognise the range of sounds that can be recorded

### Data and information – Data logging
*4 lessons.*  

- 📝 **To use a digital device to collect data automatically**  *(also: DI, ET)*
    - I can explain that sensors are input devices
    - I can identify that data from sensors can be recorded
    - I can use data from a sensor to answer a given question
- 📝 **To explain that a data logger collects 'data points' from sensors over time**  *(also: DI, ET)*
    - I can identify a suitable place to collect data
    - I can identify the intervals used to collect data
    - I can talk about the data that I have captured
- 📝 **To identify the data needed to answer questions**  *(also: DI, ET)*
    - I can plan how to collect data using a data logger
    - I can propose a question that can be answered using logged data
    - I can use a data logger to collect data
- 📝 **To use collected data to answer questions**  *(also: DI)*
    - I can draw conclusions from the data that I have collected
    - I can explain the benefits of using a data logger
    - I can interpret data that has been collected using a data logger

## 📦 Stage 9 › Networks (NW)  ·  *unit-planning level*

### Computing systems and networks – The Internet
*4 lessons.*  

- 📝 **To describe how networks physically connect to other networks**  *(also: SS)*
    - I can demonstrate how information is shared across the internet
    - I can describe the internet as a network of networks
    - I can discuss why a network needs protecting
- 📝 **To recognise how networked devices make up the internet**
    - I can describe networked devices and how they connect
    - I can explain that the internet is used to provide many services
    - I can recognise that the World Wide Web contains websites and web pages
- 📝 **To outline how websites can be shared via the World Wide Web (WWW)**
    - I can describe how to access websites on the WWW
    - I can describe where websites are stored when uploaded to the WWW
    - I can explain the types of media that can be shared on the WWW
- 📝 **To recognise how the content of the WWW is created by people**
    - I can explain that there are rules to protect content
    - I can explain that websites and their content are created by people
    - I can suggest who owns the content on websites

## 📦 Stage 9 › Programming (PG)  ·  *unit-planning level*

### Programming A – Repetition in shapes
*2 lessons.*  

- 📝 **To modify a count-controlled loop to produce a given outcome**
    - I can choose which values to change in a loop
    - I can identify the effect of changing the number of times a task is repeated
    - I can predict the outcome of a program containing a count-controlled loop
- 📝 **To create a program that uses count-controlled loops to produce a given outcome**
    - I can design a program that includes count-controlled loops
    - I can develop my program by debugging it
    - I can make use of my design to write a program

### Programming B – Repetition in games
*1 lessons.*  

- 📝 **To modify an infinite loop in a given program**
    - I can explain the effect of my changes
    - I can identify which parts of a loop can be changed
    - I can re-use existing code snippets on new sprites

## 📦 Stage 9 › Algorithms (AL)  ·  *unit-planning level*

### Programming A – Repetition in shapes
*3 lessons.*  

- 📝 **To identify that accuracy in programming is important**  *(also: PG)*
    - I can create a code snippet for a given purpose
    - I can explain the effect of changing a value of a command
    - I can program a computer by typing commands
- 📝 **To explain what 'repeat' means**  *(also: PG)*
    - I can identify everyday tasks that include repetition as part of a sequence, eg brushing teeth, dance moves
    - I can identify patterns in a sequence
    - I can use a count-controlled loop to produce a given outcome
- 📝 **To decompose a task into small steps**  *(also: PG)*
    - I can explain that a computer can repeatedly call a procedure
    - I can identify 'chunks' of actions in the real world
    - I can use a procedure in a program

### Programming B – Repetition in games
*1 lessons.*  

- 📝 **To explain that in programming there are infinite loops and count controlled loops**  *(also: PG)*
    - I can choose when to use a count-controlled and an infinite loop
    - I can modify loops to produce a given outcome
    - I can recognise that some programming languages enable more than one process to be run at once

## 📦 Stage 9 › Data & information (DI)  ·  *unit-planning level*

### Data and information – Data logging
*2 lessons.*  

- 📝 **To explain that data gathered over time can be used to answer questions**
    - I can choose a data set to answer a given question
    - I can identify data that can be gathered over time
    - I can suggest questions that can be answered using a given data set
- 📝 **To use data collected over a long duration to find information**  *(also: ET)*
    - I can import a data set
    - I can use a computer program to sort data
    - I can use a computer to view data in different ways

## 📦 Stage 9 › Creating media (CM)  ·  *unit-planning level*

### Computing systems and networks – The Internet
*1 lessons.*  

- 📝 **To describe how content can be added and accessed on the World Wide Web (WWW)**  *(also: NW)*
    - I can explain that internet services can be used to create content online
    - I can explain what media can be found on websites
    - I can recognise that I can add content to the WWW

### Creating media – Audio editing
*5 lessons.*  

- 📝 **To use a digital device to record sound**  *(also: CS, DD, ET)*
    - I can discuss what other people include when recording sound for a podcast
    - I can suggest how to improve my recording
    - I can use a device to record audio and play back sound
- 📝 **To explain that a digital recording is stored as a file**  *(also: DD, DI, ET)*
    - I can discuss why it is useful to be able to save digital recordings
    - I can plan and write the content for a podcast
    - I can save a digital recording as a file
- 📝 **To explain that audio can be changed through editing**  *(also: ET)*
    - I can discuss ways in which audio recordings can be altered
    - I can edit sections of of an audio recording
    - I can open a digital recording from a file
- 📝 **To show that different types of audio can be combined and played together**  *(also: ET)*
    - I can choose suitable sounds to include in a podcast
    - I can discuss sounds that other people combine
    - I can use editing tools to arrange sections of audio
- 📝 **To evaluate editing choices made**  *(also: DD)*
    - I can discuss the features of a digital recording I like
    - I can explain that digital recordings need to be exported to share them
    - I can suggest improvements to a digital recording

### Creating media – Photo editing
*6 lessons.*  

- 📝 **To explain that digital images can be changed**  *(also: ET)*
    - I can explain the effect that editing can have on an image
    - I can explore how images can be changed in real life
    - I can identify changes that we can make to an image
- 📝 **To change the composition of an image**  *(also: ET, IT)*
    - I can change the composition of an image by selecting parts of it
    - I can consider why someone might want to change the composition of an image
    - I can explain what has changed in an edited image
- 📝 **To describe how images can be changed for different uses**  *(also: DD, ET)*
    - I can choose effects to make my image fit a scenario
    - I can explain why my choices fit a scenario
    - I can talk about changes made to images
- 📝 **To make good choices when selecting different tools**  *(also: ET)*
    - I can choose appropriate tools to retouch an image
    - I can give examples of positive and negative effects that retouching can have on an image
    - I can identify how an image has been retouched
- 📝 **To recognise that not all images are real**  *(also: ET, SS)*
    - I can combine parts of images to create new images
    - I can sort images into 'fake' or 'real' and explain my choices
    - I can talk about fake images around me
- 📝 **To evaluate how changes can improve an image**  *(also: DD, ET)*
    - I can compare the original image with my completed publication
    - I can consider the effect of adding other elements to my work
    - I can evaluate the impact of my publication on others through feedback

## 📦 Stage 9 › Design & development (DD)  ·  *unit-planning level*

### Programming B – Repetition in games
*4 lessons.*  

- 📝 **To develop the use of count-controlled loops in a different programming environment**  *(also: PG)*
    - I can list an everyday task as a set of instructions including repetition
    - I can modify a snippet of code to create a given outcome
    - I can predict the outcome of a snippet of code
- 📝 **To develop a design that includes two or more loops which run at the same time**  *(also: PG)*
    - I can choose which action will be repeated for each object
    - I can evaluate the effectiveness of the repeated sequences used in my program
    - I can explain what the outcome of the repeated action should be
- 📝 **To design a project that includes repetition**  *(also: PG)*
    - I can develop my own design explaining what my project will do
    - I can evaluate the use of repetition in a project
    - I can select key parts of a given project to use in my own design
- 📝 **To create a project that includes repetition**  *(also: PG)*
    - I can build a program that follows my design
    - I can evaluate the steps I followed when building my project
    - I can refine the algorithm in my design

## 📦 Stage 9 › Effective use of tools (ET)  ·  *unit-planning level*

### Programming A – Repetition in shapes
*1 lessons.*  

- 📝 **To create a program in a text-based language**  *(also: PG)*
    - I can test my algorithm in a text-based language
    - I can use a template to create a design for my program
    - I can write an algorithm to produce a given outcome

## 📦 Stage 9 › Impact of technology (IT)  ·  *unit-planning level*

### Computing systems and networks – The Internet
*1 lessons.*  

- 📝 **To evaluate the consequences of unreliable content**  *(also: NW, SS)*
    - I can explain that not everything on the World Wide Web is true
    - I can explain why I need to think carefully before I share or reshare content
    - I can explain why some information I find online may not be honest, accurate, or legal

---

# 🗓 Stage 10 — Year 5 · age 9–10 (KS2)  ·  *course-planning level*

*This year: 9 strands · 36 learning objectives · 108 "I can…" criteria.*

**Course overview — strands × units this year:**

| Strand | Units (this year) |
|---|---|
| **Computing systems** (CS) | Computing systems and networks – Sharing information; Programming A – Selection in physical computing |
| **Networks** (NW) | Computing systems and networks – Sharing information |
| **Programming** (PG) | Programming A – Selection in physical computing |
| **Algorithms** (AL) | Programming B – Selection in quizzes |
| **Data & information** (DI) | Data and information – Flat-file databases |
| **Creating media** (CM) | Creating media – Vector drawing; Creating media – Video editing |
| **Design & development** (DD) | Computing systems and networks – Sharing information; Data and information – Flat-file databases; Programming B – Selection in quizzes |
| **Effective use of tools** (ET) | Computing systems and networks – Sharing information |
| **Impact of technology** (IT) | Computing systems and networks – Sharing information |

## 📦 Stage 10 › Computing systems (CS)  ·  *unit-planning level*

### Computing systems and networks – Sharing information
*2 lessons.*  

- 📝 **To explain that computers can be connected together to form systems**
    - I can describe that a computer system features inputs, processes, and outputs
    - I can explain that computer systems communicate with other devices
    - I can explain that systems are built using a number of parts
- 📝 **To recognise the role of computer systems in our lives**  *(also: IT)*
    - I can explain the benefits of a given computer system
    - I can identify tasks that are managed by computer systems
    - I can identify the human elements of a computer system

### Programming A – Selection in physical computing
*5 lessons.*  

- 📝 **To control a simple circuit connected to a computer**  *(also: PG)*
    - I can create a simple circuit and connect it to a microcontroller
    - I can explain what an infinite loop does
    - I can program a microcontroller to make an LED switch on
- 📝 **To write a program that includes count-controlled loops**  *(also: PG)*
    - I can connect more than one output component to a microcontroller
    - I can design sequences that use count-controlled loops
    - I can use a count-controlled loop to control outputs
- 📝 **To explain that a loop can stop when a condition is met**  *(also: PG)*
    - I can design a conditional loop
    - I can explain that a condition is either true or
    - I can program a microcontroller to respond to an input
- 📝 **To design a physical project that includes selection**  *(also: DD, PG)*
    - I can create a detailed drawing of my project
    - I can describe what my project will do
    - I can identify a real-world example of a condition starting an action
- 📝 **To create a program that controls a physical computing project**  *(also: DD, PG)*
    - I can test and debug my project
    - I can use selection to produce an intended outcome
    - I can write an algorithm that describes what my model will do

## 📦 Stage 10 › Networks (NW)  ·  *unit-planning level*

### Computing systems and networks – Sharing information
*1 lessons.*  

- 📝 **To recognise how information is transferred over the internet**
    - I can explain that data is transferred over networks in packets
    - I can explain that networked digital devices have unique addresses
    - I can recognise that data is transferred using agreed methods

## 📦 Stage 10 › Programming (PG)  ·  *unit-planning level*

### Programming A – Selection in physical computing
*1 lessons.*  

- 📝 **To explain that a loop can be used to repeatedly check whether a condition has been met**
    - I can explain that a condition being met can start an action
    - I can identify a condition and an action in my project
    - I can use selection (an 'if…then…' statement) to direct the flow of a program

## 📦 Stage 10 › Algorithms (AL)  ·  *unit-planning level*

### Programming B – Selection in quizzes
*3 lessons.*  

- 📝 **To explain how selection is used in computer programs**  *(also: PG)*
    - I can identify conditions in a program
    - I can modify a condition in a program
    - I can recall how conditions are used in selection
- 📝 **To relate that a conditional statement connects a condition to an outcome**  *(also: PG)*
    - I can create a program with different outcomes using selection
    - I can identify the condition and outcomes in an 'if... then… else...' statement
    - I can use selection in an infinite loop to check a condition
- 📝 **To explain how selection directs the flow of a program**  *(also: PG)*
    - I can design the flow of a program which contains 'if… then… else…'
    - I can explain that program flow can branch according to a condition
    - I can show that a condition can direct program flow in one of two ways

## 📦 Stage 10 › Data & information (DI)  ·  *unit-planning level*

### Data and information – Flat-file databases
*5 lessons.*  

- 📝 **To use a form to record information**  *(also: ET)*
    - I can create multiple questions about the same field
    - I can explain how information can be recorded
    - I can order, sort, and group my data cards
- 📝 **To outline how grouping and then sorting data allows us to answer questions**
    - I can combine grouping and sorting to answer more specific questions
    - I can explain how information can be grouped
    - I can group information to answer questions
- 📝 **To explain that tools can be used to select specific data**  *(also: ET)*
    - I can choose multiple criteria to answer a given question
    - I can choose which field and value are required to answer a given question
    - I can outline how 'AND' and 'OR' can be used to refine data selection
- 📝 **To explain that computer programs can be used to compare data visually**  *(also: ET)*
    - I can explain the benefits of using a computer to create graphs
    - I can refine a chart by selecting a particular filter
    - I can select an appropriate chart to visually compare data
- 📝 **To apply my knowledge of a database to ask and answer real-world questions**  *(also: ET)*
    - I can ask questions that will need more than one field to answer
    - I can present my findings to a group
    - I can refine a search in a real-world context

## 📦 Stage 10 › Creating media (CM)  ·  *unit-planning level*

### Creating media – Vector drawing
*6 lessons.*  

- 📝 **To identify that drawing tools can be used to produce different outcomes**  *(also: DI, ET)*
    - I can discuss how a vector drawing is different from paper-based drawings
    - I can identify the main drawing tools
    - I can recognise that vector drawings are made using shapes
- 📝 **To create a vector drawing by combining shapes**  *(also: ET)*
    - I can explain that each element added to a vector drawing is an object
    - I can identify the shapes used to make a vector drawing
    - I can move, resize, and rotate objects I have duplicated
- 📝 **To use tools to achieve a desired effect**  *(also: ET)*
    - I can explain how alignment grids and resize handles can be used to improve consistency
    - I can modify objects to create different effects
    - I can use the zoom tool to help me add detail to my drawings
- 📝 **To recognise that vector drawings consist of layers**  *(also: ET)*
    - I can change the order of layers in a vector drawing
    - I can identify that each added object creates a new layer in the drawing
    - I can identify which objects are in the front layer or in the back layer of a drawing
- 📝 **To group objects to make them easier to work with**  *(also: ET)*
    - I can copy part of a drawing by duplicating several objects
    - I can group to create a single object
    - I can reuse a group of objects to further develop my vector drawing
- 📝 **To evaluate my vector drawing**  *(also: DD)*
    - I can apply what I have learned about vector drawings
    - I can suggest improvements to a vector drawing
    - I create alternatives to vector drawings

### Creating media – Video editing
*6 lessons.*  

- 📝 **To explain what makes a video effective**  *(also: DD)*
    - I can compare features in different videos
    - I can explain that video is a visual media format
    - I can identify features of videos
- 📝 **To identify digital devices that can record video**  *(also: CS)*
    - I can experiment with different camera angles
    - I can identify and find features on a digital video recording device
    - I can make use of a microphone
- 📝 **To capture video using a range of techniques**  *(also: SS)*
    - I can capture video using a range of filming techniques
    - I can review how effective my video is
    - I can suggest filming techniques for a given purpose
- 📝 **To create a storyboard**  *(also: DD, ET)*
    - I can create and save video content
    - I can decide which filming techniques I will use
    - I can outline the scenes of my video
- 📝 **To identify that video can be improved through reshooting and editing**  *(also: ET)*
    - I can explain how to improve a video by reshooting and editing
    - I can select the correct tools to make edits to my video
    - I can store, retrieve, and export my recording to a computer
- 📝 **To consider the impact of the choices made when making and sharing a video**  *(also: DD, ET)*
    - I can evaluate my video and share my opinions
    - I can make edits to my video and improve the final outcome
    - I can recognise that my choices when making a video will impact on the quality of the final outcome

## 📦 Stage 10 › Design & development (DD)  ·  *unit-planning level*

### Computing systems and networks – Sharing information
*1 lessons.*  

- 📝 **To evaluate different ways of working together online**  *(also: ET, NW)*
    - I can explain how the internet enables effective collaboration
    - I can identify different ways of working together online
    - I can recognise that working together on the internet can be public or private

### Data and information – Flat-file databases
*1 lessons.*  

- 📝 **To compare paper and computer-based databases**  *(also: DI)*
    - I can choose which field to sort data by to answer a given question
    - I can explain what a 'field' and a 'record' is in a database
    - I can navigate a flat-file database to compare different views of information

### Programming B – Selection in quizzes
*3 lessons.*  

- 📝 **To design a program which uses selection**  *(also: PG)*
    - I can identify the outcome of user input in an algorithm
    - I can outline a given task
    - I can use a design format to outline my project
- 📝 **To create a program which uses selection**  *(also: PG)*
    - I can implement my algorithm to create the first section of my program
    - I can share my program with others
    - I can test my program
- 📝 **To evaluate my program**  *(also: PG)*
    - I can extend my program further
    - I can identify the setup code I need in my program
    - I can identify ways the program could be improved

## 📦 Stage 10 › Effective use of tools (ET)  ·  *unit-planning level*

### Computing systems and networks – Sharing information
*1 lessons.*  

- 📝 **To contribute to a shared project online**  *(also: NW)*
    - I can compare working online with working offline
    - I can make thoughtful suggestions on my group's work
    - I can suggest strategies to ensure successful group work

## 📦 Stage 10 › Impact of technology (IT)  ·  *unit-planning level*

### Computing systems and networks – Sharing information
*1 lessons.*  

- 📝 **To explain how sharing information online lets people in different places work together**  *(also: NW)*
    - I can explain that the internet allows different media to be shared
    - I can recognise that connected digital devices can allow us to access shared files stored online
    - I can send information over the internet in different ways

---

# 🗓 Stage 11 — Year 6 · age 10–11 (KS2)  ·  *course-planning level*

*This year: 6 strands · 36 learning objectives · 108 "I can…" criteria.*

**Course overview — strands × units this year:**

| Strand | Units (this year) |
|---|---|
| **Computing systems** (CS) | Programming B – Sensing |
| **Programming** (PG) | Programming A – Variables in games |
| **Data & information** (DI) | Data and information – Spreadsheets |
| **Creating media** (CM) | Creating media – 3D Modelling; Creating media – Web page creation; Data and information – Spreadsheets |
| **Design & development** (DD) | Computing systems and networks – Communication; Programming A – Variables in games |
| **Effective use of tools** (ET) | Computing systems and networks – Communication |

## 📦 Stage 11 › Computing systems (CS)  ·  *unit-planning level*

### Programming B – Sensing
*6 lessons.*  

- 📝 **To create a program to run on a controllable device**  *(also: PG)*
    - I can apply my knowledge of programming to a new environment
    - I can test my program on an emulator
    - I can transfer my program to a controllable device
- 📝 **To explain that selection can control the flow of a program**  *(also: PG)*
    - I can determine the flow of a program using selection
    - I can identify examples of conditions in the real world
    - I can use a variable in an if, then, else statement to select the flow of a program
- 📝 **To update a variable with a user input**  *(also: PG)*
    - I can experiment with different physical inputs
    - I can explain that if you read a variable, the value remains
    - I can use a condition to change a variable
- 📝 **To use an conditional statement to compare a variable to a value**  *(also: PG)*
    - I can explain the importance of the order of conditions in else, if statements
    - I can modify a program to achieve a different outcome
    - I can use an operand (e.g. <>=) in an if, then statement
- 📝 **To design a project that uses inputs and outputs on a controllable device**  *(also: DD, PG)*
    - I can decide what variables to include in a project
    - I can design the algorithm for my project
    - I can design the program flow for my project
- 📝 **To develop a program to use inputs and outputs on a controllable device**  *(also: DD, PG)*
    - I can create a program based on my design
    - I can test my program against my design
    - I can use a range of approaches to find and fix bugs

## 📦 Stage 11 › Programming (PG)  ·  *unit-planning level*

### Programming A – Variables in games
*2 lessons.*  

- 📝 **To define a 'variable' as something that is changeable**
    - I can explain that the way that a variable changes can be defined
    - I can identify examples of information that is variable
    - I can identify that variables can hold numbers or letters
- 📝 **To explain why a variable is used in a program**
    - I can explain that a variable has a name and a value
    - I can identify a program variable as a placeholder in memory for a single value
    - I can recognise that the value of a variable can be changed

## 📦 Stage 11 › Data & information (DI)  ·  *unit-planning level*

### Data and information – Spreadsheets
*5 lessons.*  

- 📝 **To identify questions which can be answered using data**
    - I can answer questions from an existing data set
    - I can ask simple relevant questions which can be answered using data
    - I can explain the relevance of data headings
- 📝 **To explain that objects can be described using data**
    - I can apply an appropriate number format to a cell
    - I can build a data set in a spreadsheet application
    - I can explain what an item of data is
- 📝 **To explain that formulas can be used to produce calculated data**  *(also: ET, PG)*
    - I can construct a formula in a spreadsheet
    - I can explain the relevance of a cell's data type
    - I can identify that changing inputs changes outputs
- 📝 **To apply formulas to data, including duplicating**  *(also: ET, PG)*
    - I can apply a formula to multiple cells by duplicating it
    - I can create a formula which includes a range of cells
    - I can recognise that data can be calculated using different operations
- 📝 **To create a spreadsheet to plan an event**  *(also: ET)*
    - I can apply a formula to calculate the data I need to answer questions
    - I can explain why data should be organised
    - I can use a spreadsheet to answer questions

## 📦 Stage 11 › Creating media (CM)  ·  *unit-planning level*

### Creating media – 3D Modelling
*6 lessons.*  

- 📝 **To use a computer to create and manipulate three-dimensional (3D) digital objects**  *(also: ET)*
    - I can discuss the similarities and differences between 2D and 3D shapes
    - I can explain why we might represent 3D objects on a computer
    - I can select, move, and delete a digital 3D shape
- 📝 **To compare working digitally with 2D and 3D graphics**  *(also: ET)*
    - I can change the colour of a 3D object
    - I can identify how graphical objects can be modified
    - I can resize a 3D object
- 📝 **To construct a digital 3D model of a physical object**  *(also: ET)*
    - I can position 3D objects in relation to each other
    - I can rotate a 3D object
    - I can select and duplicate multiple 3D objects
- 📝 **To identify that physical objects can be broken down into a collection of 3D shapes**  *(also: ET)*
    - I can create digital 3D objects of an appropriate size
    - I can group a digital 3D shape and a placeholder to create a hole in an object
    - I can identify the 3D shapes needed to create a model of a real-world object
- 📝 **To design a digital model by combining 3D objects**  *(also: DD, ET)*
    - I can choose which 3D objects I need to construct my model
    - I can modify multiple 3D objects
    - I can plan my 3D model
- 📝 **To develop and improve a digital 3D model**  *(also: DD, ET)*
    - I can decide how my model can be improved
    - I can evaluate my model against a given criterion
    - I can modify my model to improve it

### Creating media – Web page creation
*6 lessons.*  

- 📝 **To review an existing website and consider its structure**  *(also: DD, NW)*
    - I can discuss the different types of media used on websites
    - I can explore a website
    - I know that websites are written in HTML
- 📝 **To plan the features of a web page**  *(also: DD)*
    - I can draw a web page layout that suits my purpose
    - I can recognise the common features of a web page
    - I can suggest media to include on my page
- 📝 **To consider the ownership and use of images (copyright)**  *(also: DD, SS)*
    - I can describe what is meant by the term 'fair use'
    - I can find copyright-free images
    - I can say why I should use copyright-free images
- 📝 **To recognise the need to preview pages**  *(also: DD, ET)*
    - I can add content to my own web page
    - I can evaluate what my web page looks like on different devices and suggest/make edits
    - I can preview what my web page looks like
- 📝 **To outline the need for a navigation path**  *(also: DD, ET, NW)*
    - I can describe why navigation paths are useful
    - I can explain what a navigation path is
    - I can make multiple web pages and link them using hyperlinks
- 📝 **To recognise the implications of linking to content owned by other people**  *(also: DD, ET, IT, NW)*
    - I can create hyperlinks to link to other people's work
    - I can evaluate the user experience of a website
    - I can explain the implication of linking to content owned by others

### Data and information – Spreadsheets
*1 lessons.*  

- 📝 **To choose suitable ways to present data**  *(also: DI, ET)*
    - I can produce a graph
    - I can suggest when to use a table or graph
    - I can use a graph to show the answer to questions

## 📦 Stage 11 › Design & development (DD)  ·  *unit-planning level*

### Computing systems and networks – Communication
*1 lessons.*  

- 📝 **To evaluate different methods of online communication**  *(also: ET, NW)*
    - I can compare different methods of communicating on the internet
    - I can decide when I should and should not share
    - I can explain that communication on the internet may not be private

### Programming A – Variables in games
*4 lessons.*  

- 📝 **To choose how to improve a game by using variables**  *(also: PG)*
    - I can decide where in a program to change a variable
    - I can make use of an event in a program to set a variable
    - I can recognise that the value of a variable can be used by a program
- 📝 **To design a project that builds on a given example**  *(also: PG)*
    - I can choose the artwork for my project
    - I can create algorithms for my project
    - I can explain my design choices
- 📝 **To use my design to create a project**  *(also: PG)*
    - I can choose a name that identifies the role of a variable
    - I can create the artwork for my project
    - I can test the code that I have written
- 📝 **To evaluate my project**  *(also: PG)*
    - I can extend my game further using more variables
    - I can identify ways that my game could be improved
    - I can share my game with others

## 📦 Stage 11 › Effective use of tools (ET)  ·  *unit-planning level*

### Computing systems and networks – Communication
*5 lessons.*  

- 📝 **To identify how to use a search engine**  *(also: NW)*
    - I can compare results from different search engines
    - I can complete a web search to find specific information
    - I can refine my search
- 📝 **To describe how search engines select results**  *(also: NW)*
    - I can explain why we need tools to find things online
    - I can recognise the role of web crawlers in creating an index
    - I can relate a search term to the search engine's index
- 📝 **To explain how search results are ranked**  *(also: NW)*
    - I can explain that a search engine follows rules to rank relevant pages
    - I can explain that search results are ordered
    - I can suggest some of the criteria that a search engine checks to decide on the order of results
- 📝 **To recognise why the order of results is important, and to whom**  *(also: IT, NW)*
    - I can describe some of the ways that search results can be influenced
    - I can explain how search engines make money
    - I can recognise some of the limitations of search engines
- 📝 **To recognise how we communicate using technology**  *(also: NW)*
    - I can choose methods of communication to suit particular purposes
    - I can explain the different ways in which people communicate
    - I can identify that there are a variety of ways of communicating over the internet

---

# 🗓 Stage 12 — Year 7 · age 11–12 (KS3)  ·  *course-planning level*

*This year: 9 strands · 48 lessons · 98 "I can…" criteria.*

**Course overview — strands × units this year:**

| Strand | Units (this year) |
|---|---|
| **Computing systems** (CS) | Networks from semaphores to the Internet |
| **Networks** (NW) | Networks from semaphores to the Internet |
| **Algorithms** (AL) | Programming essentials in Scratch – part I; Programming essentials in Scratch – part II |
| **Data & information** (DI) | Modelling data – Spreadsheets |
| **Creating media** (CM) | Impact of technology – Collaborating online respectfully; Using media – Gaining support for a cause |
| **Design & development** (DD) | Using media – Gaining support for a cause |
| **Effective use of tools** (ET) | Impact of technology – Collaborating online respectfully; Modelling data – Spreadsheets; Using media – Gaining support for a cause |
| **Impact of technology** (IT) | Impact of technology – Collaborating online respectfully; Networks from semaphores to the Internet; Using media – Gaining support for a cause |
| **Safety & security** (SS) | Impact of technology – Collaborating online respectfully |

## 📦 Stage 12 › Computing systems (CS)  ·  *unit-planning level*

### Networks from semaphores to the Internet
*2 lessons.*  

- 📝 **Lesson 2**
    - List examples of the hardware necessary for connecting devices to networks  *(also: NW)*
- 📝 **Lesson 3**
    - Compare wired to wireless connections and list examples of specific technologies currently used to implement such connections  *(also: NW)*

## 📦 Stage 12 › Networks (NW)  ·  *unit-planning level*

### Networks from semaphores to the Internet
*5 lessons.*  

- 📝 **Lesson 1**
    - Define what a computer network is and explain how data is transmitted between computers across networks
    - Define 'protocol' and provide examples of non-networking protocols
- 📝 **Lesson 3**
    - Define 'bandwidth', using the appropriate units for measuring the rate at which data is transmitted, and discuss familiar examples where bandwidth is important
- 📝 **Lesson 4**
    - Define what the internet is
    - Explain how data travels between computers across the internet
    - Describe key words such as 'protocols', 'packets', and 'addressing'
- 📝 **Lesson 5**
    - Explain the difference between the internet, its services, and the World Wide Web
    - Describe how services are provided over the internet
    - List some of these services and the context in which they are used
    - Explain the term 'connectivity' as the capacity for connected devices ('Internet of Things') to collect and share information about me with or without my knowledge (including microphones, cameras, and geolocation)
- 📝 **Lesson 6**
    - Describe components (servers, browsers, pages, HTTP and HTTPS protocols, etc.) and how they work together

## 📦 Stage 12 › Algorithms (AL)  ·  *unit-planning level*

### Programming essentials in Scratch – part I
*6 lessons.*  

- 📝 **Lesson 1**
    - Compare how humans and computers understand instructions (understand and carry out)
    - Define a sequence as instructions performed in order, with each executed in turn
    - Predict the outcome of a simple sequence  *(also: PG)*
    - Modify a sequence  *(also: PG)*
- 📝 **Lesson 2**
    - Define a variable as a name that refers to data being stored by the computer  *(also: PG)*
    - Recognise that computers follow the control flow of input/process/output  *(also: PG)*
    - Predict the outcome of a simple sequence that includes variables  *(also: PG)*
    - Trace the values of variables within a sequence  *(also: PG)*
    - Make a sequence that includes a variable  *(also: PG)*
- 📝 **Lesson 3**
    - Define a condition as an expression that will be evaluated as either true or false  *(also: PG)*
    - Identify that selection uses conditions to control the flow of a sequence  *(also: PG)*
    - Identify where selection statements can be used in a program  *(also: PG)*
    - Modify a program to include selection  *(also: PG)*
- 📝 **Lesson 4**
    - Create conditions that use comparison operators (>,<,=)  *(also: PG)*
    - Create conditions that use logic operators (and/or/not)  *(also: PG)*
    - Identify where selection statements can be used in a program that include comparison and logical operators  *(also: PG)*
- 📝 **Lesson 5**
    - Define iteration as a group of instructions that are repeatedly executed  *(also: PG)*
    - Describe the need for iteration  *(also: PG)*
    - Identify where count-controlled iteration can be used in a program  *(also: PG)*
    - Implement count-controlled iteration in a program  *(also: PG)*
    - Detect and correct errors in a program (debugging)  *(also: PG)*
- 📝 **Lesson 6**
    - Independently design and apply programming constructs to solve a problem (subroutine, selection, count-controlled iteration, operators, and variables)  *(also: DD, PG)*

### Programming essentials in Scratch – part II
*6 lessons.*  

- 📝 **Lesson 7**
    - Define a subroutine as a group of instructions that will run when called by the main program or other subroutines  *(also: PG)*
    - Define decomposition as breaking a problem down into smaller, more manageable subproblems  *(also: PG)*
    - Identify how subroutines can be used for decomposition  *(also: PG)*
- 📝 **Lesson 8**
    - Identify where condition-controlled iteration can be used in a program  *(also: PG)*
    - Implement condition-controlled iteration in a program  *(also: PG)*
- 📝 **Lesson 9**
    - Evaluate which type of iteration is required in a program  *(also: PG)*
- 📝 **Lesson 10**
    - Define a list as a collection of related elements that are referred to by a single name  *(also: PG)*
    - Describe the need for lists  *(also: PG)*
    - Identify when lists can be used in a program  *(also: PG)*
    - Use a list  *(also: PG)*
- 📝 **Lesson 11**
    - Decompose a larger problem into smaller subproblems  *(also: PG)*
    - Apply appropriate constructs to solve a problem  *(also: PG)*
- 📝 **Lesson 12**
    - Decompose a larger problem into smaller subproblems  *(also: PG)*
    - Apply appropriate constructs to solve a problem  *(also: DD, PG)*

## 📦 Stage 12 › Data & information (DI)  ·  *unit-planning level*

### Modelling data – Spreadsheets
*6 lessons.*  

- 📝 **Lesson 1**
    - Identify columns, rows, cells, and cell references in spreadsheet software  *(also: ET)*
- 📝 **Lesson 2**
    - Use basic formulas with cell references to perform calculations in a spreadsheet (+, -, *, /)  *(also: ET, PG)*
    - Use the autofill tool to replicate cell data  *(also: ET)*
- 📝 **Lesson 3**
    - Explain the difference between data and information
    - Explain the difference between primary and secondary sources of data
    - Collect data  *(also: ET)*
- 📝 **Lesson 4**
    - Analyse data  *(also: ET)*
    - Create appropriate charts in a spreadsheet  *(also: ET)*
    - Use the functions SUM, COUNTA, MAX, and MIN in a spreadsheet  *(also: ET, PG)*
- 📝 **Lesson 5**
    - Analyse data  *(also: ET)*
    - Use a spreadsheet to sort and filter data  *(also: ET)*
    - Use the functions AVERAGE, COUNTIF, and IF in a spreadsheet  *(also: ET, PG)*
- 📝 **Lesson 6**
    - Use conditional formatting in a spreadsheet  *(also: ET, PG)*
    - Apply all of the spreadsheet skills covered in this unit  *(also: ET, PG)*

## 📦 Stage 12 › Creating media (CM)  ·  *unit-planning level*

### Impact of technology – Collaborating online respectfully
*2 lessons.*  

- 📝 **Lesson 4**
    - Plan effective presentations for a given audience  *(also: DD, ET)*
- 📝 **Lesson 5**
    - Plan effective presentations for a given audience

### Using media – Gaining support for a cause
*5 lessons.*  

- 📝 **Lesson 1**
    - Apply the key features of a word processor to format a document  *(also: ET)*
- 📝 **Lesson 2**
    - Select appropriate images for a given context  *(also: ET)*
    - Apply appropriate formatting techniques  *(also: ET)*
- 📝 **Lesson 4**
    - Evaluate online sources for use in own work  *(also: IT)*
- 📝 **Lesson 5**
    - Construct a blog using appropriate software  *(also: ET)*
    - Organise the content of the blog based on credible sources  *(also: ET, IT)*
- 📝 **Lesson 6**
    - Construct a blog using appropriate software  *(also: ET, IT)*
    - Organise the content of blog based on credible sources  *(also: ET, IT)*
    - Apply referencing techniques that credit authors appropriately  *(also: DI)*
    - Design the layout of the content to make it suitable for the audience  *(also: IT)*

## 📦 Stage 12 › Design & development (DD)  ·  *unit-planning level*

### Using media – Gaining support for a cause
*2 lessons.*  

- 📝 **Lesson 1**
    - Evaluate formatting techniques to understand why we format documents  *(also: ET)*
- 📝 **Lesson 5**
    - Design the layout of the content to make it suitable for the audience  *(also: ET)*

## 📦 Stage 12 › Effective use of tools (ET)  ·  *unit-planning level*

### Impact of technology – Collaborating online respectfully
*4 lessons.*  

- 📝 **Lesson 1**
    - Create a memorable and secure password for an account on the school network  *(also: SS)*
- 📝 **Lesson 2**
    - Find personal documents and common applications
    - Recognise a respectful email  *(also: SS)*
    - Construct an effective email and send it to the correct recipients
- 📝 **Lesson 3**
    - Describe how to communicate with peers online  *(also: SS)*
- 📝 **Lesson 6**
    - Check who you are talking to online  *(also: SS)*

### Modelling data – Spreadsheets
*1 lessons.*  

- 📝 **Lesson 1**
    - Use formatting techniques in a spreadsheet

### Using media – Gaining support for a cause
*1 lessons.*  

- 📝 **Lesson 1**
    - Select the most appropriate software to use to complete a task
    - Identify the key features of a word processor

## 📦 Stage 12 › Impact of technology (IT)  ·  *unit-planning level*

### Impact of technology – Collaborating online respectfully
*1 lessons.*  

- 📝 **Lesson 4**
    - Describe cyberbullying  *(also: SS)*
    - Explain the effects of cyberbullying  *(also: SS)*

### Networks from semaphores to the Internet
*1 lessons.*  

- 📝 **Lesson 5**
    - Describe how internet-connected devices can affect me  *(also: NW, SS)*

### Using media – Gaining support for a cause
*4 lessons.*  

- 📝 **Lesson 2**
    - Demonstrate an understanding of licensing issues involving online content by applying appropriate Creative Commons licences
    - Demonstrate the ability to credit the original source of an image
- 📝 **Lesson 3**
    - Critique digital content for credibility
    - Apply techniques in order to identify whether or not a source is credible
- 📝 **Lesson 4**
    - Apply referencing techniques and understand the concept of plagiarism
- 📝 **Lesson 5**
    - Apply referencing techniques that credit authors appropriately

## 📦 Stage 12 › Safety & security (SS)  ·  *unit-planning level*

### Impact of technology – Collaborating online respectfully
*2 lessons.*  

- 📝 **Lesson 1**
    - Remember the rules of the computing lab
- 📝 **Lesson 5**
    - Describe cyberbullying
    - Explain the effects of cyberbullying

---

# 🗓 Stage 13 — Year 8 · age 12–13 (KS3)  ·  *course-planning level*

*This year: 8 strands · 54 lessons · 97 "I can…" criteria.*

**Course overview — strands × units this year:**

| Strand | Units (this year) |
|---|---|
| **Computing systems** (CS) | Computing systems; Developing for the web; Introduction to Python programming; Representations – from clay to silicon |
| **Programming** (PG) | Computing systems; Developing for the web; Introduction to Python programming; Mobile app development |
| **Algorithms** (AL) | Developing for the web; Introduction to Python programming; Mobile app development |
| **Data & information** (DI) | Developing for the web; Representations – from clay to silicon |
| **Creating media** (CM) | Developing for the web; Media – Vector graphics |
| **Design & development** (DD) | Developing for the web; Media – Vector graphics; Mobile app development |
| **Effective use of tools** (ET) | Developing for the web; Mobile app development |
| **Impact of technology** (IT) | Computing systems |

## 📦 Stage 13 › Computing systems (CS)  ·  *unit-planning level*

### Computing systems
*5 lessons.*  

- 📝 **Lesson 1**
    - Recall that a general-purpose computing system is a device for executing programs
    - Explain the difference between a general-purpose computing system and a purpose-built device
- 📝 **Lesson 2**
    - Describe the function of the hardware components used in computing systems
    - Describe how the hardware components used in computing systems work together in order to execute programs  *(also: PG)*
    - Recall that all computing systems, regardless of form, have a similar structure ('architecture')
- 📝 **Lesson 3**
    - Analyse how the hardware components used in computing systems work together in order to execute programs
    - Define what an operating system is, and recall its role in controlling program execution
- 📝 **Lesson 4**
    - Describe the NOT, AND, and OR logical operators, and how they are used to form logical expressions
    - Use logic gates to construct logic circuits, and associate these with logical operators and expressions
    - Describe how hardware is built out of increasingly complex logic circuits
    - Recall that, since hardware is built out of logic circuits, data and instructions alike need to be represented using binary digits  *(also: DI, PG)*
- 📝 **Lesson 5**
    - Provide broad definitions of 'artificial intelligence' and 'machine learning'  *(also: IT)*
    - Identify examples of artificial intelligence and machine learning in the real world  *(also: IT)*
    - Describe the steps involved in training machines to perform tasks (gathering data, training, testing)  *(also: IT)*
    - Describe how machine learning differs from traditional programming  *(also: PG)*
    - Associate the use of artificial intelligence with moral dilemmas  *(also: IT)*

### Developing for the web
*1 lessons.*  

- 📝 **Lesson 4**
    - Describe what a search engine is  *(also: NW)*

### Introduction to Python programming
*1 lessons.*  

- 📝 **Lesson 1**
    - Recall that a program written in a programming language needs to be translated in order to be executed by a machine  *(also: PG)*

### Representations – from clay to silicon
*3 lessons.*  

- 📝 **Lesson 2**
    - Provide examples of how symbols are carried on physical media  *(also: DI)*
- 📝 **Lesson 5**
    - Provide examples of the different ways that binary digits are physically represented in digital devices  *(also: DI)*
- 📝 **Lesson 6**
    - Apply all of the skills covered in this unit  *(also: DI)*

## 📦 Stage 13 › Programming (PG)  ·  *unit-planning level*

### Computing systems
*1 lessons.*  

- 📝 **Lesson 1**
    - Recall that a program is a sequence of instructions that specify operations that are to be performed on data

### Developing for the web
*1 lessons.*  

- 📝 **Lesson 1**
    - Describe what HTML is

### Introduction to Python programming
*6 lessons.*  

- 📝 **Lesson 1**
    - Write simple Python programs that display messages, assign values to variables, and receive keyboard input
    - Locate and correct common syntax errors
- 📝 **Lesson 2**
    - Describe the semantics of assignment statements
    - Use simple arithmetic expressions in assignment statements to calculate values
    - Receive input from the keyboard and convert it to a numerical value
- 📝 **Lesson 3**
    - Use relational operators to form logical expressions
    - Use binary selection (if, else statements) to control the flow of program execution
    - Generate and use random integers
- 📝 **Lesson 4**
    - Use multi-branch selection (if, elif, else statements) to control the flow of program execution
    - Describe how iteration (while statements) controls the flow of program execution
- 📝 **Lesson 5**
    - Use iteration (while loops) to control the flow of program execution
    - Use variables as counters in iterative programs
- 📝 **Lesson 6**
    - Combine iteration and selection to control the flow of program execution
    - Use Boolean variables as flags

### Mobile app development
*2 lessons.*  

- 📝 **Lesson 2**
    - Recognise that events can control the flow of a program
- 📝 **Lesson 3**
    - Pass the value of a variable into an object

## 📦 Stage 13 › Algorithms (AL)  ·  *unit-planning level*

### Developing for the web
*1 lessons.*  

- 📝 **Lesson 4**
    - Explain how search engines 'crawl' through the World Wide Web and how they select and rank results  *(also: CS, NW)*
    - Analyse how search engines select and rank results when searches are made  *(also: NW)*

### Introduction to Python programming
*1 lessons.*  

- 📝 **Lesson 1**
    - Describe what algorithms and programs are and how they differ  *(also: PG)*

### Mobile app development
*2 lessons.*  

- 📝 **Lesson 1**
    - Identify when a problem needs to be broken down  *(also: PG)*
- 📝 **Lesson 4**
    - Apply decomposition to break down a large problem into more manageable steps  *(also: DD)*

## 📦 Stage 13 › Data & information (DI)  ·  *unit-planning level*

### Developing for the web
*1 lessons.*  

- 📝 **Lesson 6**
    - Complete summative assessment  *(also: ET, IT)*

### Representations – from clay to silicon
*5 lessons.*  

- 📝 **Lesson 1**
    - List examples of representations
    - Recall that representations are used to store, communicate, and process information
    - Provide examples of how different representations are appropriate for different tasks
- 📝 **Lesson 2**
    - Recall that characters can be represented as sequences of symbols and list examples of character coding schemes
    - Measure the length of a representation as the number of symbols that it contains
- 📝 **Lesson 3**
    - Explain what binary digits (bits) are, in terms of familiar symbols such as digits or letters
    - Measure the size or length of a sequence of bits as the number of binary digits that it contains
- 📝 **Lesson 4**
    - Describe how natural numbers are represented as sequences of binary digits
    - Convert a decimal number to binary and vice versa
- 📝 **Lesson 5**
    - Convert between different units and multiples of representation size

## 📦 Stage 13 › Creating media (CM)  ·  *unit-planning level*

### Developing for the web
*4 lessons.*  

- 📝 **Lesson 1**
    - Use HTML to structure static web pages  *(also: PG)*
    - Modify HTML tags using inline styling to improve the appearance of web pages  *(also: DD, PG)*
- 📝 **Lesson 2**
    - Display images within a web page  *(also: PG)*
    - Apply HTML tags to construct a web page structure from a provided design  *(also: PG)*
- 📝 **Lesson 3**
    - Describe what CSS is  *(also: PG)*
    - Use CSS to style static web pages  *(also: DD, PG)*
    - Assess the benefits of using CSS to style pages instead of in-line formatting  *(also: ET, PG)*
- 📝 **Lesson 5**
    - Create hyperlinks to allow users to navigate between multiple web pages  *(also: DD, PG)*

### Media – Vector graphics
*6 lessons.*  

- 📝 **Lesson 1**
    - Draw basic shapes (rectangle, ellipse, polygon, star) with different properties (fill and stroke, shape-specific attributes)  *(also: ET)*
    - Manipulate individual objects (select, move, resize, rotate, duplicate, flip, z-order)  *(also: ET)*
- 📝 **Lesson 2**
    - Manipulate groups of objects (select, group/ungroup, align, distribute)  *(also: ET)*
    - Combine paths by applying operations (union, difference, intersection)  *(also: ET)*
- 📝 **Lesson 3**
    - Convert objects to paths  *(also: ET)*
    - Draw paths  *(also: ET)*
    - Edit path nodes  *(also: ET)*
- 📝 **Lesson 4**
    - Combine multiple tools and techniques to create a vector graphic design  *(also: DD, ET)*
- 📝 **Lesson 5**
    - Explain what vector graphics are  *(also: DI)*
    - Provide examples where using vector graphics would be appropriate  *(also: DI)*
- 📝 **Lesson 6**
    - Improve your own project work based on feedback  *(also: DD)*
    - Complete a summative assessment  *(also: DD, DI, ET)*

## 📦 Stage 13 › Design & development (DD)  ·  *unit-planning level*

### Developing for the web
*1 lessons.*  

- 📝 **Lesson 6**
    - Implement navigation to complete a functioning website  *(also: ET)*

### Media – Vector graphics
*1 lessons.*  

- 📝 **Lesson 6**
    - Peer assess another pair's project work

### Mobile app development
*5 lessons.*  

- 📝 **Lesson 1**
    - Implement and customise GUI elements to meet the needs of the user  *(also: ET, PG)*
- 📝 **Lesson 2**
    - Develop a partially complete application to include additional functionality  *(also: ET, PG)*
- 📝 **Lesson 3**
    - Establish user needs when completing a creative project
- 📝 **Lesson 5**
    - Reflect and react to user feedback  *(also: PG)*
- 📝 **Lesson 6**
    - Evaluate the success of the programming project  *(also: PG)*

## 📦 Stage 13 › Effective use of tools (ET)  ·  *unit-planning level*

### Developing for the web
*1 lessons.*  

- 📝 **Lesson 5**
    - Use search technologies effectively  *(also: NW)*
    - Discuss the impact of search technologies and the issues that arise by the way they function and the way they are used  *(also: NW, SS)*

### Mobile app development
*5 lessons.*  

- 📝 **Lesson 2**
    - Use user input in an event-driven programming environment  *(also: PG)*
    - Use variables in an event-driven programming environment  *(also: PG)*
- 📝 **Lesson 3**
    - Identify and fix common coding errors  *(also: PG)*
- 📝 **Lesson 4**
    - Use user input in a block-based programming language  *(also: PG)*
    - Use a block-based programming language to create a sequence  *(also: PG)*
    - Use variables in a block-based programming language  *(also: PG)*
- 📝 **Lesson 5**
    - Use a block-based programming language to include sequencing and selection  *(also: PG)*
    - Use user input in a block-based programming language  *(also: PG)*
    - Use variables in a block-based programming language  *(also: PG)*
- 📝 **Lesson 6**
    - Use a block-based programming language to include sequencing and selection  *(also: PG)*
    - Use user input in a block-based programming language  *(also: PG)*
    - Use variables in a block-based programming language  *(also: PG)*

## 📦 Stage 13 › Impact of technology (IT)  ·  *unit-planning level*

### Computing systems
*1 lessons.*  

- 📝 **Lesson 6**
    - Explain the implications of sharing program code  *(also: PG)*

---

# 🗓 Stage 14 — Year 9 · age 13–14 (KS3)  ·  *course-planning level*

*This year: 9 strands · 51 lessons · 96 "I can…" criteria.*

**Course overview — strands × units this year:**

| Strand | Units (this year) |
|---|---|
| **Computing systems** (CS) | Cybersecurity; Physical computing; Python programming with sequences of data; Representations – going audiovisual |
| **Networks** (NW) | Cybersecurity |
| **Programming** (PG) | Python programming with sequences of data |
| **Algorithms** (AL) | Physical computing; Python programming with sequences of data |
| **Data & information** (DI) | Cybersecurity; Data science; Python programming with sequences of data; Representations – going audiovisual |
| **Creating media** (CM) | Data science; Media – Animations; Representations – going audiovisual |
| **Design & development** (DD) | Cybersecurity; Data science |
| **Effective use of tools** (ET) | Cybersecurity; Data science |
| **Impact of technology** (IT) | Cybersecurity |

## 📦 Stage 14 › Computing systems (CS)  ·  *unit-planning level*

### Cybersecurity
*1 lessons.*  

- 📝 **Lesson 4**
    - List the common malware threats  *(also: IT, SS)*
    - Examine how different types of malware causes problems for computer systems  *(also: IT, SS)*

### Physical computing
*3 lessons.*  

- 📝 **Lesson 1**
    - Describe what the micro:bit is
    - List the micro:bit's input and output devices
- 📝 **Lesson 4**
    - Design a physical computing artifact purposefully, keeping in mind the problem at hand, the needs of the audience involved, and the available resources  *(also: DD)*
    - Decompose the functionality of a physical computing system into simpler features  *(also: DD)*
- 📝 **Lesson 5**
    - Implement a physical computing project, while following, revising, and refining the project plan  *(also: DD, PG)*

### Python programming with sequences of data
*1 lessons.*  

- 📝 **Lesson 1**
    - Write programs that display messages, receive keyboard input, and use simple arithmetic expressions in assignment statements  *(also: PG)*

### Representations – going audiovisual
*1 lessons.*  

- 📝 **Lesson 4**
    - Explain the function of microphones and speakers as components that capture and generate sound

## 📦 Stage 14 › Networks (NW)  ·  *unit-planning level*

### Cybersecurity
*2 lessons.*  

- 📝 **Lesson 3**
    - Identify strategies to reduce the chance of a brute force attack being successful  *(also: PG, SS)*
- 📝 **Lesson 5**
    - Explain how networks can be protected from common security threats  *(also: SS)*

## 📦 Stage 14 › Programming (PG)  ·  *unit-planning level*

### Python programming with sequences of data
*3 lessons.*  

- 📝 **Lesson 1**
    - Use selection (**if-elif-else* statements) to control the flow of program execution
- 📝 **Lesson 2**
    - Perform common operations on lists or individual items
- 📝 **Lesson 3**
    - Perform common operations on strings or individual characters

## 📦 Stage 14 › Algorithms (AL)  ·  *unit-planning level*

### Physical computing
*4 lessons.*  

- 📝 **Lesson 1**
    - Use a development environment to write, execute, and debug a Python program for the micro:bit  *(also: CS, ET, PG)*
- 📝 **Lesson 2**
    - Write programs that use the micro:bit's built-in input and output devices  *(also: CS, PG)*
- 📝 **Lesson 3**
    - Write programs that use GPIO pins to generate output and receive input  *(also: CS, PG)*
    - Write programs that communicate with other devices by sending and receiving messages wirelessly  *(also: CS, NW, PG)*
- 📝 **Lesson 6**
    - Implement a physical computing project, while following, revising, and refining the project plan  *(also: CS, DD, DI, ET, PG)*

### Python programming with sequences of data
*5 lessons.*  

- 📝 **Lesson 1**
    - Locate and correct common syntax errors  *(also: PG)*
    - Create lists and access individual list items  *(also: DI, PG)*
- 📝 **Lesson 3**
    - Use iteration (while statements) to control the flow of program execution  *(also: PG)*
    - Perform common operations on lists or individual items  *(also: DI, PG)*
- 📝 **Lesson 4**
    - Use iteration (for statements) to iterate over list items  *(also: DI, PG)*
- 📝 **Lesson 5**
    - Use iteration (for loops) to iterate over lists and strings  *(also: DI, PG)*
    - Use variables to keep track of counts and sums  *(also: DI, PG)*
    - Combine key programming language features to develop solutions to meaningful problems  *(also: DI, PG)*
- 📝 **Lesson 6**
    - Apply all of the skills covered in this unit  *(also: CS, DD, DI, ET, PG)*

## 📦 Stage 14 › Data & information (DI)  ·  *unit-planning level*

### Cybersecurity
*2 lessons.*  

- 📝 **Lesson 1**
    - Explain the difference between data and information
    - Identify what happens to data entered online  *(also: NW, SS)*
    - Explain the need for the Data Protection Act  *(also: IT, SS)*
- 📝 **Lesson 2**
    - Recognise how human errors pose security risks to data  *(also: SS)*
    - Implement strategies to minimise the risk of data being compromised through human error  *(also: SS)*

### Data science
*5 lessons.*  

- 📝 **Lesson 1**
    - Define data science
    - Explain how visualising data can help identify patterns and trends in order to help us gain insights
    - Use an appropriate software tool to visualise data sets and look for patterns or trends  *(also: ET)*
- 📝 **Lesson 2**
    - Recognise examples of where large data sets are used in daily life  *(also: IT)*
- 📝 **Lesson 3**
    - Define the terms 'correlation' and 'outliers' in relation to data trends
    - Use findings to support a recommendation  *(also: IT)*
- 📝 **Lesson 5**
    - Describe the need for data cleansing  *(also: ET)*
    - Apply data cleansing techniques to a data set
    - Visualise a data set  *(also: ET)*
- 📝 **Lesson 6**
    - Analyse visualisations to identify patterns, trends, and outliers
    - Draw conclusions and report findings  *(also: IT)*

### Python programming with sequences of data
*1 lessons.*  

- 📝 **Lesson 4**
    - Perform common operations on lists or strings  *(also: PG)*

### Representations – going audiovisual
*5 lessons.*  

- 📝 **Lesson 1**
    - Describe how digital images are composed of individual elements
    - Recall that the colour of each picture element is represented using a sequence of binary digits
    - Define key terms such as 'pixels', 'resolution', and 'colour depth'
    - Describe how an image can be represented as a sequence of bits
- 📝 **Lesson 2**
    - Describe how colour can be represented as a mixture of red, green, and blue, with a sequence of bits representing each colour's intensity
    - Compute the representation size of a digital image, by multiplying resolution (number of pixels) with colour depth (number of bits used to represent the colour of individual pixels)
    - Describe the trade-off between representation size and perceived quality for digital images
- 📝 **Lesson 4**
    - Recall that sound is a wave
    - Define key terms such as 'sample', 'sampling frequency/rate', 'sample size'
    - Describe how sounds are represented as sequences of bits
- 📝 **Lesson 5**
    - Calculate representation size for a given digital sound, given its attributes
    - Explain how attributes such as sampling frequency and sample size affect characteristics such as representation size and perceived quality, and the trade-offs involved
    - Perform basic sound editing tasks using appropriate software and combine them in order to solve more complex problems requiring sound manipulation
- 📝 **Lesson 6**
    - Recall that bitmap images and pulse code sound are not the only binary representations of images and sound available
    - Define 'compression', and describe why it is necessary

## 📦 Stage 14 › Creating media (CM)  ·  *unit-planning level*

### Data science
*2 lessons.*  

- 📝 **Lesson 4**
    - Create a data capture form  *(also: DI)*
- 📝 **Lesson 6**
    - Visualise a data set  *(also: DI)*

### Media – Animations
*6 lessons.*  

- 📝 **Lesson 1**
    - Add, delete, and move objects  *(also: ET)*
    - Scale and rotate objects  *(also: ET)*
    - Use a material to add colour to objects  *(also: ET)*
- 📝 **Lesson 2**
    - Add, move, and delete keyframes to make basic animations  *(also: ET)*
    - Play, pause, and move through the animation using the timeline  *(also: ET)*
    - Create useful names for objects  *(also: ET)*
    - Join multiple objects together using parenting  *(also: ET)*
- 📝 **Lesson 3**
    - Use edit mode and extrude  *(also: ET)*
    - Use loop cut and face editing  *(also: ET)*
    - Apply different colours to different parts of the same model  *(also: ET)*
- 📝 **Lesson 4**
    - Use proportional editing  *(also: ET)*
    - Use the knife tool  *(also: ET)*
    - Use subdivision  *(also: ET)*
- 📝 **Lesson 5**
    - Add and edit set lighting  *(also: ET)*
    - Set up the camera  *(also: ET)*
    - Compare different render modes  *(also: ET)*
- 📝 **Lesson 6**
    - Create a 3–10 second animation  *(also: ET)*
    - Render out the animation  *(also: ET)*

### Representations – going audiovisual
*1 lessons.*  

- 📝 **Lesson 3**
    - Perform basic image editing tasks using appropriate software and combine them in order to solve more complex problems requiring image manipulation  *(also: DI, ET)*
    - Explain how the manipulation of digital images amounts to arithmetic operations on their digital representation  *(also: DI)*
    - Describe and assess the creative benefits and ethical drawbacks of digital manipulation [Education for a Connected World](https://www.gov.uk/government/publications/education-for-a-connected-world)  *(also: DI, IT)*

## 📦 Stage 14 › Design & development (DD)  ·  *unit-planning level*

### Cybersecurity
*1 lessons.*  

- 📝 **Lesson 1**
    - Critique online services in relation to data privacy  *(also: SS)*

### Data science
*3 lessons.*  

- 📝 **Lesson 2**
    - Select criteria and use data set to investigate predictions  *(also: DI)*
    - Evaluate findings to support arguments for or against a prediction  *(also: DI)*
- 📝 **Lesson 3**
    - Identify the steps of the investigative cycle  *(also: DI)*
    - Solve a problem by implementing steps of the investigative cycle on a data set  *(also: DI)*
- 📝 **Lesson 4**
    - Identify the data needed to answer a question defined by the learner  *(also: DI)*

## 📦 Stage 14 › Effective use of tools (ET)  ·  *unit-planning level*

### Cybersecurity
*1 lessons.*  

- 📝 **Lesson 6**
    - Identify the most effective methods to prevent cyberattacks  *(also: SS)*

### Data science
*1 lessons.*  

- 📝 **Lesson 4**
    - Identify the steps of the investigative cycle

## 📦 Stage 14 › Impact of technology (IT)  ·  *unit-planning level*

### Cybersecurity
*3 lessons.*  

- 📝 **Lesson 3**
    - Define hacking in the context of cyber security  *(also: PG, SS)*
    - Explain how a DDoS attack can impact users of online services  *(also: NW, SS)*
    - Explain the need for the Computer Misuse Act  *(also: SS)*
- 📝 **Lesson 4**
    - Question how malicious bots can have an impact on societal issues
- 📝 **Lesson 5**
    - Compare security threats against probability and the potential impact to organisations  *(also: SS)*

---

## Using the three levels together

- **Course plan** (a term/year): work from the 🗓 stage headers + the *strands × units* table — which
  strands run, and which units deliver them, across the year. **Per pupil:** the year should net **+1
  stage** in every strand, so check each pupil has a path to evidence a full stage's criteria across the
  year's units.
- **Unit plan** (a half-term): drop into a 📦 *Stage › Strand* section and take a unit's list of lessons
  as the medium-term plan. **Per pupil:** sequence so that by the end each pupil can have evidenced **all**
  the next stage's criteria for the strand(s) the unit covers — the unit is what moves them up a stage.
- **Lesson plan** (one lesson): take a single 📝 objective and its "I can…" criteria as the lesson's
  aim + success criteria + the things to assess. **Per pupil:** target **that pupil's** next un-achieved
  "I can…" criteria (Support/Core/Challenge around their gap), so each lesson is a concrete step up.
- **Strands carry through all three**, so coverage and progression stay visible at every grain.
- **Every grain is tracked per individual pupil** (see the ⭐ section at the top): the system records which
  "I can…" statements each pupil has achieved, and planning is driven by each pupil's own next gap, not the
  class average.
