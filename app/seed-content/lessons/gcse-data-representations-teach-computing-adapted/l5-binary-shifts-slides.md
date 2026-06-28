# Binary shifts

## Today we are learning
- shift left to multiply
- shift right to divide
- how an overflow error happens
- how underflow happens

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: shift · overflow · underflow · integer · real (floating-point) · truncated. Same routine.

## Starter — recap
- `101 + 11` = `1000` (5 + 3 = 8).
- `1000 - 1` = `111` (8 - 1 = 7).

> 🧑‍🏫 Retrieval of add/subtract. Support: tick left=multiply, right=divide.

## Left shift = multiply  (I do)
- Move every bit one place **left**, fill the right with 0.
- 1 shift ×2, 2 shifts ×4, 3 shifts ×8.
- `101 × 100` → shift left 2 → `10100`. Check: 5 × 4 = 20.

> 🧑‍🏫 I-do. ×100 in binary is ×4. Strong visual: slide the digits left; the new gaps get 0s.

## Right shift = divide  (we do)
- Move every bit one place **right**.
- 1 shift ÷2, 2 shifts ÷4, 3 shifts ÷8.
- `11000 ÷ 100` → shift right 2 → `110`. Check: 24 ÷ 4 = 6.

> 🧑‍🏫 We-do. When bits fall off the right they are **truncated** (dropped) — that can lose accuracy.

## Overflow and underflow
- **Overflow**: the result is too **big** to fit in the bits.
- **Underflow**: the result is too **small** / too close to zero.
- A famous overflow error helped destroy the Ariane 5 rocket in 1996.

> 🧑‍🏫 Tell the Ariane 5 story as a hook (the source video is an external link, not included — describe it, no clip needed; keeps the room calm). Support: sort overflow vs underflow on the worksheet.

## Your turn  (you do)
- Support: tick left/right and overflow.
- Core: `1101 × 100`, `11000 ÷ 100`, `1010 ÷ 10`.
- Challenge: `101 ÷ 100` = `1` (remainder truncated); explain underflow.

> 🧑‍🏫 You-do. Likely error: shifting the wrong way. Fix-words: "left is bigger (×), right is smaller (÷)." TA: prompt, do not do it for them. Screenshot the working.

## I can…
Tick your four "I can…". Show me one shift each way.

> 🧑‍🏫 Plenary true/false quick-fire. Recap: left ×, right ÷, overflow too big, underflow too small. Movement break is routine.
