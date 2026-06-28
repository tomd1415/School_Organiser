# String handling I — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will **use** `len()` and indexing, and **iterate** over a string with a for loop.

## Key words — match each to its meaning
Drag each answer to the right word.

| Word | What it means |
|---|---|
| String | (  ) a value that is text (  ) joining strings together (  ) one character in a string |
| Concatenate | (  ) a value that is text (  ) joining strings together (  ) one character in a string |
| Element | (  ) a value that is text (  ) joining strings together (  ) one character in a string |

## Indexing — fill the gaps
For `word = "python"`, the index of each letter is: p=0, y=1, t=2, h=3, o=4, n=5.

| Question | Your answer |
|---|---|
| `word[0]` gives the character [[ ]] | |
| To get the character `t`, you write `word[` [[ ]] `]` | |
| `len(word)` gives the number [[ ]] | |

## Worked example — count a letter
This program iterates over a string and counts the letter `e`.

```python
word = "sheep"
count_e = 0
for letter in word:
    if letter == "e":
        count_e = count_e + 1
print(count_e)
```

## 🟢 Support — put the loop in order
Order the lines so the program counts how many times `e` appears.

```parsons
word = "sheep"
count_e = 0
for letter in word:
    if letter == "e":
        count_e = count_e + 1
print(count_e)
```

## 🟡 Core
| Question | Your answer |
|---|---|
| Change the program so it asks the user for a character, then counts how many times that character appears in the word. Type your code. | Type your code here |

## 🔴 Challenge — guess the word
Make a "guess the word" game that shows how many letters are in the word and reveals the first letter after the first wrong guess.

| Question | Your answer |
|---|---|
| Type the part of your program that shows the length and the first letter. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Trinket / IDE share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I found the length of a string with `len()`
- [ ] I got a character using its index
- [ ] I used a for loop to iterate over a string
- [ ] I counted matching characters in a string
