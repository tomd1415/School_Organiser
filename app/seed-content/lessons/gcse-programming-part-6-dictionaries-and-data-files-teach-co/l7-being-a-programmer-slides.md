# Being a programmer

## Today we are learning
- describe the good habits of a programmer
- use meaningful identifiers and naming conventions
- rewrite code using a cleaner alternative
- append data to a CSV file

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: append · meaningful identifiers · naming conventions · Pythonista. Same routine. This is the last lesson of new content before the project.

## Starter — good habits
Make a list: what are the good habits of a programmer?

> 🧑‍🏫 Open question, share to the class. Collect ideas, then reveal the set: meaningful names, naming conventions, test often, start small, comment. Support: tick-all the good habits.

## Good habits  (I do)
- **Meaningful identifiers** — `player_score`, not `a`. (An exam requirement.)
- **Naming conventions** — Python uses `lower_case_with_underscores`.
- **Test early, test often.** **Start small** (decompose). **Comment** where it helps.

> 🧑‍🏫 I-do. Show a bad-names program next to a good-names one. All names work, but conventions are best practice. Real industry programmers say the same — reassure them these habits matter for the project.

## Cleaner alternatives  (we do)
```python
name = input("Enter your name: ")    # prompt inside input()
score += 1                           # instead of score = score + 1
print("Name:", name, "Score:", score)
```

> 🧑‍🏫 We-do. This unit used one consistent style so they could learn; now show them the tidier alternatives they can choose. Take the "guess the word" code and rename + comment it together.

## Append to a CSV  (you do)
```python
file = open("numbers.csv", "a")
file.write("3,4,5")
file.close()
```
- Last new skill: append to a CSV (mode `"a"`).

> 🧑‍🏫 You-do. Support: order the append program (Parson's). Core: rename + comment the messy code. Challenge: the spelling-test program (read, test, append results). Likely error: overwriting with "w" instead of appending with "a". Fix-words "a adds, w wipes." Screenshot at the end.

## I can…
Tick your four "I can…". Show me your improved, commented code.

> 🧑‍🏫 Plenary. Write a short letter to your past self with tips for this unit. Recap the good habits — they all matter for the Battle Boats project next. Movement break is routine.
