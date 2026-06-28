# Huffman coding

## Today we are learning
- explain how Huffman coding compresses text
- read a Huffman tree
- calculate the size of a compressed file

> 🧑‍🏫 Read the "I can…" aloud. Vocabulary: Huffman coding · Huffman tree · bit pattern · lossless · binary tree. Hand out both worksheets.

## Starter — text file size
A 5-character word in 8-bit ASCII is how many bits? Do common letters get short or long codes in Huffman coding?

> 🧑‍🏫 Answers: 5 × 8 = 40 bits; common letters get the SHORTEST codes. Huffman coding is lossless.

## The big idea  (I do)
- Normal ASCII uses 8 bits for every character.
- Huffman coding gives each character a bit pattern of a different length.
- Common characters get short patterns; rare characters get longer ones. This makes the file smaller.

> 🧑‍🏫 Plain line: "short codes for the letters you use a lot." Note: in English exams pupils only READ trees, not build them.

## Reading a Huffman tree  (we do)
![Huffman tree for MISSISSIPPI]({{res:l17-huffman-tree.png}})

- Follow the path from the top to the character.
- Go left = write 0. Go right = write 1.
- For MISSISSIPPI: S = 0, I = 10, M = 110, P = 111.

> 🧑‍🏫 Read S and I together off the table. Likely error: reading right-to-left. Fix-words: "start at the top, left is zero."

## Counting the bits  (you do)
- MISSISSIPPI in ASCII = 11 × 8 = 88 bits.
- Compressed: S(1 bit)×4 + I(2)×4 + M(3)×1 + P(3)×2 = 4 + 8 + 3 + 6 = 21 bits.
- Huffman coding is lossless — nothing is lost.

> 🧑‍🏫 Build the 21 together slowly. Challenge works out the bits saved (88 − 21 = 67). TA: prompt, do not do it for them.

## I can…
Tick your "I can…". Read me the bit pattern for the letter M.

> 🧑‍🏫 Note who could multiply pattern length by frequency correctly.
