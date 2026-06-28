# Finding your way — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will use comparison operators to make a micro:bit compass, and learn why the order of conditions matters.

## Headings and directions
We use four directions: North, East, South and West. Each direction covers a range of degrees.

- less than 45° → North
- less than 135° → East
- less than 225° → South
- less than 315° → West

![Compass heading blocks compared to numbers]({{res:l4-compass-blocks.png}})

Match each heading to its direction.

| Heading | Which direction? |
|---|---|
| 30° | (  ) North (  ) East (  ) South (  ) West |
| 120° | (  ) North (  ) East (  ) South (  ) West |
| 200° | (  ) North (  ) East (  ) South (  ) West |
| 270° | (  ) North (  ) East (  ) South (  ) West |

## Why order matters
The program checks the conditions in order, from the top. The first one that is true is used. So the conditions must be in the right order.

![The compass algorithm and program flow]({{res:l4-compass-flow.png}})

Put the blocks in order to make a simple compass (just North and South).

```parsons
forever
if compass heading < 90 then
set heading to "N"
else
set heading to "S"
show string heading
```

## 🟢 Support
| Question | Choose |
|---|---|
| A comparison operator (< > =) is used to… | (  ) compare two numbers (  ) play a sound (  ) draw a picture |

## 🟡 Core
| Question | Your answer |
|---|---|
| Why does the order of the conditions matter? | Type your answer here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| The heading is 325°. Which direction is it, and how do you know? | Type your answer here |

## Show your work
Build your compass in MakeCode. Use the emulator: drag the micro:bit logo to choose a direction and check the right letter shows.

| Question | Your answer |
|---|---|
| Paste your MakeCode share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I can use a comparison operator (< > =) in an "if… then…" statement
- [ ] I can explain why the order of conditions matters
- [ ] I can change a program to make a micro:bit compass
