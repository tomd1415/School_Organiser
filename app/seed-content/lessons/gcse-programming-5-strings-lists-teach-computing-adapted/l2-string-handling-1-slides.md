# String handling I

## Today we are learning
- find the length of a string with len()
- get a character using its index
- use a for loop to iterate over a string
- count matching characters in a string

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: string · string handling · concatenate · element · index. Same routine. Everyone has Python open.

## Starter — predict
```python
word = "sheep"
print(len(word))
print(word[0])
```
Predict the two outputs, then run it.

> 🧑‍🏫 Peer instruction. `len` gives 5; `word[0]` gives "s". Support: tick what each does. Challenge: which index gives the first "e"?

## len() and indexing  (I do)
- `len(word)` counts the **characters** (spaces count too).
- `word[0]` is the **first** character — indexing starts at **0**.
- p=0, y=1, t=2 … so `word[2]` of "python" is "t".

> 🧑‍🏫 I-do. Draw the boxes 0..5 under the word. Common slip: thinking `word[1]` is the first letter. Fix-words: "counting starts at zero."

## Iterate over a string  (we do)
```python
word = "sheep"
count_e = 0
for letter in word:
    if letter == "e":
        count_e = count_e + 1
print(count_e)
```

> 🧑‍🏫 We-do. Step through: `letter` takes each character in turn. Add one to `count_e` only when it matches. This is the same for loop as `for x in range(...)`, but over a string.

## Your turn  (you do)
- Support: order the count loop (Parson's).
- Core: change it to count a character the user types.
- Challenge: a "guess the word" game using `len()` + the first letter.

> 🧑‍🏫 Pair programming, swap every 5 mins. Likely error: comparing to the wrong case ("E" vs "e"). Fix-words: "check the letter is the same case." TA: prompt, don't do it for them. Screenshot at the end.

## I can…
Tick your four "I can…". Show me your counting program.

> 🧑‍🏫 Plenary. Recap: len = how many; word[index] = one character; a for loop visits each character. Movement break is routine.
