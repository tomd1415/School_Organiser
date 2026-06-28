# Huffman coding — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will explain how Huffman coding works, read a Huffman tree, and calculate the size of a compressed file.

## How to read a Huffman tree
Huffman coding gives each character a bit pattern. Common characters get short patterns; rare characters get longer ones. To read a character's pattern, follow the path from the top of the tree: go **left = 0**, go **right = 1**.

For the word **MISSISSIPPI**, the tree gives these bit patterns:

| Character | Bit pattern |
|---|---|
| S | 0 |
| I | 10 |
| M | 110 |
| P | 111 |

## The steps of Huffman coding
Put the steps in the right order.

```order
Count how often each character appears (its frequency).
Build a tree with the rarest characters lowest down.
Read each character's bit pattern by following the path from the top (left = 0, right = 1).
Replace each character in the text with its bit pattern.
```

## 🟢 Support
Use the table above to answer these.

| Question | Choose one |
|---|---|
| Which character has the shortest bit pattern? | (  ) S (  ) M (  ) P |
| What is the bit pattern for the letter I? | (  ) 10 (  ) 0 (  ) 111 |
| Why does S get the shortest pattern? | (  ) it appears the most often (  ) it comes first in the alphabet (  ) it is a capital letter |

## 🟡 Core
Use the bit patterns in the table.

| Question | Your answer |
|---|---|
| Write the bit pattern for the letters M then I then S (in that order). | Type your answer here |
| The word MISSISSIPPI has 11 characters. In 8-bit ASCII, what is the original file size in bits? Show your working. | Type your answer here |

## 🔴 Challenge
The compressed MISSISSIPPI uses these patterns: M=110, I=10, S=0, P=111. The letters appear: M once, I four times, S four times, P twice.

| Question | Your answer |
|---|---|
| Work out the size of the compressed file in bits (multiply each pattern length by how many times the letter appears, then add them up). Show your working. | Type your answer here |
| How many bits are saved compared with the original 88-bit file? | Type your answer here |

## Fill in the gap
Huffman coding is a [[ ]] type of compression, because no data is lost.

## Show your work
| Question | Your answer |
|---|---|
| Write, in your own words, why giving common letters short codes makes the file smaller | Type your answer here |
| Show your finished sheet | 📷 Paste a photo of your finished work here |

## ✅ I can…
- [ ] I explained how Huffman coding compresses text
- [ ] I read bit patterns from a Huffman tree
- [ ] I calculated the size of the original file
- [ ] I calculated the size of the compressed file
