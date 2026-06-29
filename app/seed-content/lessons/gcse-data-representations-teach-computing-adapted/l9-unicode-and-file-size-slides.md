# Unicode and file size

## Today we are learning
- why Unicode is needed
- Unicode matches ASCII for the first 128 codes
- calculate the file size of text in ASCII
- calculate the file size of text in Unicode

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: ASCII · Unicode · bit · byte. Same routine. Last lesson of this half of the unit.

## Starter — revisiting ASCII
- ASCII only codes English keyboard characters.
- It cannot represent other alphabets or emoji.

> 🧑‍🏫 Think–write–pair–share. Support: tick "many languages and symbols." Leads into Unicode.

## Why Unicode?
- **Unicode** uses more bits per character.
- More bits → far more codes → many languages, symbols, emoji.
- The first **128** codes are the same as ASCII (backwards compatible).

![Emoji — characters Unicode can represent but ASCII cannot]({{res:l9-emoji-characters-unicode-can-represent-teach-computing.png}})

> 🧑‍🏫 I-do. Backwards compatible = old ASCII files still open correctly. Strong, friendly visual: emoji.

## Bytes per character
- ASCII = **1 byte** per character.
- 16-bit Unicode = **2 bytes** per character.
- 32-bit Unicode = **4 bytes** per character.

> 🧑‍🏫 We-do. Remind: 1 byte = 8 bits. Write the three rates on the board.

## Calculating file size  (we do)
- **File size = characters × bytes per character.**
- 10 characters in ASCII = 10 × 1 = **10 bytes**.
- 10 characters in 16-bit Unicode = 10 × 2 = **20 bytes**.

> 🧑‍🏫 We-do one together. Common slip: forgetting Unicode uses more bytes each. Fix-words: "characters times bytes each."

## Your turn  (you do)
- Support: tick "more bits per character."
- Core: 20 characters → ASCII 20 B, 16-bit 40 B, 32-bit 80 B.
- Challenge: explain the storage vs coverage trade-off.

> 🧑‍🏫 You-do on the worksheet. TA: prompt, do not do it for them. Screenshot the calculations.

## I can…
Tick your four "I can…". Show me one file-size calculation.

> 🧑‍🏫 Plenary + half-unit recap: bases, binary add/subtract, shifts, signed integers, hex, ASCII, Unicode. Movement break is routine. (Bitmap images, sound and compression come in the next set of lessons.)
