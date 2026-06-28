# Representing text

## Today we are learning
- work out how many things n bits can represent
- what a character set is and how ASCII works
- a limitation of ASCII
- encode and decode text with ASCII

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: bit · to the power of · ASCII · character set. Same routine.

## Starter — are there enough bits?
- 4 bits give 16 combinations — not enough for 26 letters.
- More bits = more combinations.

> 🧑‍🏫 Think–write–pair–share. Support: tick "2 to the power of n." Sets up counting combinations.

## Counting combinations  (I do)
- The number of combinations from **n** bits is **2ⁿ**.
- 3 bits → 2×2×2 = 8.
- 7 bits → 128. 8 bits → 256.

> 🧑‍🏫 I-do. Two methods: the next place-value heading (good up to 8 bits), or the formula 2ⁿ (works for any size).

## What is a character set?
- A **character set** lists every character and the binary code that stands for it.
- **ASCII** gives each keyboard character a code.
- A = 65, B = 66, C = 67 — they run **in order**.

![The ASCII character set]({{res:l8-ascii-character-set-teach-computing.png}})

> 🧑‍🏫 We-do. Show A, B, C; ask them to predict D = 68. Codes run in sequence — that is the pattern.

## 7 bits then 8 bits
- ASCII first used **7 bits** → 128 characters.
- Now it uses **8 bits** → 256 characters (a leading 0 was added).
- Limitation: it only covers English keyboard characters.

> 🧑‍🏫 Limitation links to next lesson (Unicode). Fix-words: "ASCII is English only."

## Your turn  (you do)
- Support: tick A = 65 and "steps of 1."
- Core: 7 bits = 128; find D's code from the table.
- Challenge: 8 bits = 256; decode `01000011 01000001 01010100` = CAT.

> 🧑‍🏫 You-do with the ASCII table handout/image. Likely error: miscounting 8-bit groups. Fix-words: "8 bits = one character." TA: prompt, do not do it for them. Screenshot the work.

## I can…
Tick your four "I can…". Show me a decoded word.

> 🧑‍🏫 Plenary quiz. Recap: 2ⁿ combinations; ASCII codes a character per number; 8 bits = 256. Movement break is routine.
