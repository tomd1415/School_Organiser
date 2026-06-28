# Run length encoding

## Today we are learning
- explain how data is compressed using run length encoding (RLE)
- write data as frequency/data pairs
- calculate compression ratios

> 🧑‍🏫 Read the "I can…" aloud. Vocabulary: lossless · run length encoding (RLE) · frequency/data pair · compression ratio. Hand out both worksheets.

## Starter — recap and runs
Which type of compression loses no data? In `1 1 1 1 0 0`, how many 1s are in a run at the start?

> 🧑‍🏫 Answers: lossless; four 1s. RLE is a lossless method.

## How RLE works  (I do)
- Find a run of the same value.
- Write a pair: how many times, then the value.
- `11 11 11 00 00 00 00 11 11` → `3 11 4 00 2 11`.

> 🧑‍🏫 Plain, slow. Plain line: "say how many, then what." Use a simple black/white row on the board.

## Using binary for the count  (we do)
- The count can be written in binary instead of decimal.
- Every count uses the same number of bits, based on the longest run.
- A longest run of 4 needs 3 bits, so the counts become 3-bit binary.

> 🧑‍🏫 Keep this gentle. Likely error: using a different bit length for each count. Fix-words: "same length for every count."

## Compression ratio  (you do)
- Compression ratio = original size ÷ compressed size, written like 5:1.
- 100 MB → 20 MB is 100 ÷ 20 = 5:1.
- To find the compressed size: original ÷ first number × second number.

> 🧑‍🏫 Do 100 ÷ 20 together. Then pairs do the activity ratios. TA: prompt, do not do it for them.

## When does RLE help?
- RLE works best when there are long runs of the same value.
- Simple images with big blocks of one colour compress well; busy images may not.

> 🧑‍🏫 Each pupil says one kind of data that RLE would compress well.

## I can…
Tick your "I can…". Compress `00 00 11` for me out loud.

> 🧑‍🏫 Note who kept the count then value order correct.
