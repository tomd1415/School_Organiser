# String handling III — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will build a **secure password** program that joins three words and swaps the vowels for random characters.

## The plan — put the steps in order
The program follows these steps. Drag them into the right order.

```order
Ask the user for three words
Make all the letters lower case
Join the three words into one password
Go through each letter of the password
If the letter is a vowel, swap it for a random character
Show the finished secure password
```

## Code snippets you can use
```python
# join two strings together
password = word1 + word2

# make a new string, replacing each "a" with "@"
new_word = ""
for letter in word:
    if letter == "a":
        new_word = new_word + "@"
    else:
        new_word = new_word + letter
```

## 🟢 Support — replace one letter
Order the lines so the program swaps every "a" for "@".

```parsons
word = "banana"
new_word = ""
for letter in word:
    if letter == "a":
        new_word = new_word + "@"
    else:
        new_word = new_word + letter
print(new_word)
```

## 🟡 Core
| Question | Your answer |
|---|---|
| Join three words and make them lower case. Type the code that makes `password` from `word1`, `word2`, `word3`. | Type your code here |

## 🔴 Challenge — full password generator
Build the full program: ask for three words, join them, then swap each vowel (a, e, i, o, u) for a random character.

| Question | Your answer |
|---|---|
| Type your password generator program. | Type your code here |

## Plenary — solve the anagrams (match the key word)
| Anagram | Key word |
|---|---|
| GNTROISCATAENE | (  ) concatenate (  ) substring (  ) element |
| BSTUNIGRS | (  ) concatenate (  ) substring (  ) element |
| TLEEMNE | (  ) concatenate (  ) substring (  ) element |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Trinket / IDE share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I planned the steps of the program in order
- [ ] I joined strings together (concatenation)
- [ ] I used randomisation with `chr()` to make a random character
- [ ] I built a secure password generator
