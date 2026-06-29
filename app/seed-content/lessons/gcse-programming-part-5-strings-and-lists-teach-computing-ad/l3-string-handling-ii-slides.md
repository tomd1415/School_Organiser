# String handling II

## Today we are learning
- take a substring using slicing
- use the in operator to check for a substring
- use chr() and ord() for ASCII conversions
- build a program that uses substrings

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: string handling · substring · slice · concatenate · ASCII. Same routine. Everyone has Python open.

## Starter — predict
```python
word = "HELLO"
print(word[1:4])
```
Predict the output. Remember: index 1, 2, 3 — **not** 4.

> 🧑‍🏫 Peer instruction. Answer: "ELL". The slice stops BEFORE the last number, just like range(). Support: tick which indexes are included.

## Slicing — substrings  (I do)
- `word[1:3]` takes a **substring** from index 1 up to (not including) 3.
- It works like `range()` — the end number is the stopping point.
- Join strings with `+` — this is **concatenation**: `fish + name`.

> 🧑‍🏫 I-do. Draw the index boxes under "HELLO". Common slip: expecting the end index to be included. Fix-words: "the last number is the stop, not the last letter."

## The in operator + ASCII  (we do)
- `"12" in username` is **True** if "12" appears anywhere inside.
- **ASCII** gives every character a number: `ord("C")` → 67, `chr(66)` → "B".

> 🧑‍🏫 We-do. Build the username `20SmithR` from slices (`startyear[0:2]`, `firstname[0]`) and concatenation. Then show chr()/ord() with the ASCII table. ASCII is covered more in Data representations.

## Your turn  (you do)
- Support: order the username program (Parson's).
- Core: a year-group checker using `if "20" in username:`.
- Challenge: a secret-message decoder with `chr()`.

> 🧑‍🏫 Pair programming, swap every 5 mins. Likely error: forgetting `int()` on the input before `chr()`. Fix-words: "chr needs a number, so int() the input." TA: prompt, don't do it for them. Screenshot at the end.

## I can…
Tick your four "I can…". Show me a program that uses a substring.

> 🧑‍🏫 Plenary. Predict one slice and one `in` check. Recap: slice = part of a string; in = is it inside; chr/ord = character ↔ number. Movement break is routine.
