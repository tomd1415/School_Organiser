# String handling III — secure passwords

## Today we are learning
- plan the steps of a program in order
- join strings together (concatenation)
- use randomisation with chr() to make a random character
- build a secure password generator

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: ASCII · string handling · substring · concatenate · randomisation. Same routine. Everyone has Python open. This lesson is a build — take your time.

## Starter — predict
```python
from random import randint
random_character = chr(randint(65, 90))
print(random_character)
```
Predict what kind of thing this prints.

> 🧑‍🏫 Peer instruction. 65–90 are ASCII codes for A–Z, so this prints a random capital letter. This is the key trick for the challenge.

## The plan  (I do)
1. Ask for three words.
2. Make them lower case.
3. Join them into one password.
4. Go through each letter.
5. Swap vowels for a random character.
6. Show the password.

> 🧑‍🏫 I-do. Big idea: do NOT solve it all at once. Build one step, test it, then the next. Use the `order` task so they see the shape before coding.

## Build it up one step at a time  (we do)
- Join strings with `+`: `password = w1 + w2 + w3`.
- Build a NEW string letter by letter; swap vowels using `if letter in "aeiou":`.

> 🧑‍🏫 We-do. Worked example: replace every "a" with "@". Likely error: changing the string in place — strings can't be changed, so build a new one. Fix-words: "make a new empty string and add to it."

## Your turn  (you do)
- Support: order the replace-a-letter program (Parson's).
- Core: join three words and lower-case them.
- Challenge: the full vowel-swapping password generator.

> 🧑‍🏫 Pair programming, swap every 5 mins. TA: prompt, don't do it for them. Reassure: this is a big build — "do your best, test as you go." Screenshot at the end.

## I can…
Tick your four "I can…". Show me your generator. Then solve the anagrams.

> 🧑‍🏫 Plenary. The anagrams are key words (concatenate, substring, element). Recap: build a program step by step. Movement break is routine.
