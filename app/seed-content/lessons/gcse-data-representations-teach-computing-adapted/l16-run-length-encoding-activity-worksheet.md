# Run length encoding — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will explain how run length encoding (RLE) works, write data as frequency/data pairs, and calculate compression ratios.

## How RLE works
RLE is a type of lossless compression. It replaces a run of the same value with a pair: **how many times** it appears, then **the value**. For example, the row `11 11 11 00 00 00 00 11 11` becomes `3 11 4 00 2 11`.

## The steps of RLE
Put the steps of run length encoding in the right order.

```order
Look along the row and find the first run of the same value.
Count how many times that value repeats in a row.
Write the count, then the value (a frequency/data pair).
Move to the next run and repeat until the row is finished.
```

## 🟢 Support
| Question | Choose one |
|---|---|
| What does RLE stand for? | (  ) run length encoding (  ) really large encoding (  ) random letter encoding |
| Is RLE lossy or lossless? | (  ) lossless (  ) lossy (  ) neither |
| The pair `4 00` means… | (  ) the value 00 four times (  ) the value 4 zero times (  ) four different colours |

## 🟡 Core
Compress each row with RLE, using decimal numbers for the count.

| Question | Your answer |
|---|---|
| Compress `00 00 11 11 11 00`. | Type your answer here |
| Compress `11 11 11 00 00 00 00 11 11`. | Type your answer here |

Now fill in the gap about binary counts.

When the count is written in binary, every count must use the same number of [[ ]], based on the longest run.

## 🔴 Challenge
Compression ratio = original size ÷ compressed size, written as a ratio like 5:1.

| Question | Your answer |
|---|---|
| A file is 100 MB and compresses to 20 MB. What is the compression ratio? Show your working. | Type your answer here |
| A 50 MB file has a compression ratio of 5:1. What is the size of the compressed file? Show your working. | Type your answer here |

## Show your work
| Question | Your answer |
|---|---|
| Write, in your own words, why RLE works well on a simple image with big blocks of one colour | Type your answer here |
| Show your finished sheet | 📷 Paste a photo of your finished work here |

## ✅ I can…
- [ ] I explained how data is compressed using run length encoding
- [ ] I wrote data as frequency/data pairs
- [ ] I calculated a compression ratio
- [ ] I worked out the size of a compressed file from the ratio
