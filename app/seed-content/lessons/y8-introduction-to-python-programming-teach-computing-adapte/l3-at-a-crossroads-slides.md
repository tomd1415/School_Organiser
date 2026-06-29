# At a crossroads

## Today we are learning
- use a comparison operator to make a condition
- use `if` and `else` to choose between two paths
- generate a random number with `randint()`
- build a simple number guessing game

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: selection · condition · comparison operator · if · else · random. Same routine as every lesson.

## Starter — something missing
A program with no `if` does the same thing every time, whatever the user types.

> 🧑‍🏫 Recall selection from Scratch (the "if … then … else" block). Ask: "what if we want one special reply for one answer?" Collect words like if, else, check, depend.

## The if / else statement
`if` checks a condition. If it is true, the `if` block runs. If not, the `else` block runs.

> 🧑‍🏫 Show the two paths with your hands — only ONE path runs each time. Syntax pitfalls: lowercase `if`/`else`, a colon `:`, `==` (not `=`), and indentation.

## Worked example — film critic  (I do)
![A film-critic program that uses if and else]({{res:l3-film-critic-if-else-code-teach-computing.png}})

> 🧑‍🏫 Live-code this. Test BOTH branches: type the favourite film, then type something else. Indented lines belong to a branch; the line after them runs whatever happens.

## Your turn — number guessing game  (you do)
Pick a lucky number, ask for a guess, then say right or wrong.

> 🧑‍🏫 Support: fill-the-gap `==` + indentation tick. Core: build the game. Challenge: make it random with randint, explain `=` vs `==`. Likely error: `=` used in a condition — fix-words "one equals stores, two equals compares."

## Adding randomness
`from random import randint` then `randint(1, 20)` gives a different number each run.

> 🧑‍🏫 Show one extra print line to reveal the secret number while testing, then remove it. This models a simple debugging trick.

## I can…
Tick your four "I can…". Show me your guessing game.

> 🧑‍🏫 Note who tested both branches. Quick confidence check.
