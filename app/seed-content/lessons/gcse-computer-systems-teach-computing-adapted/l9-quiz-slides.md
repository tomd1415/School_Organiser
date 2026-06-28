# Computer systems quiz

## Today we are learning
- predict what a short Python program does
- explain how the quiz reads questions and splits each line
- add my own questions and run the quiz to revise

> 🧑‍🏫 Read the "I can…" aloud. Vocabulary on the board: program · instructions · data · execution · embedded system. Same routine as every lesson. This lesson revises Part 1 by building a revision quiz.

## Starter — why an embedded system?
- Juan wants a greenhouse device that does ONE job
- embedded systems are small, cheap and specialised

> 🧑‍🏫 Quick recall of embedded vs general purpose from Lesson 1. Matches the starter worksheet. Fix-words: "embedded = ONE fixed job."

## Predict the program  (PRIMM)
```
import random
questions = []
file = open("questions.txt", "r")
for line in file:
    line = line.rstrip()
    questions.append(line)
print(questions)
```

> 🧑‍🏫 PRIMM: PREDICT first, do NOT confirm. In pairs, what will it do? Then hand out the starter files (ncce.io/computer-systems-quiz) so they RUN it and test their prediction. TA: prompt for a guess, do not give the answer.

## How the questions are stored
- each line is `question,answer`
- `line.split(",")` cuts it into the two parts

> 🧑‍🏫 Show questions.txt. They spot the pattern: a comma divides question and answer. This matches the question log they have built over the unit.

## Make it your own
- add your own questions to questions.txt
- run it again and check it still works

> 🧑‍🏫 You-do on the activity worksheet. Likely error: forgetting the comma between question and answer → the split breaks. Then pupils swap and play each other's quizzes.

## Extension — add a score
- create a score before the questions
- add 1 each time the answer is right

> 🧑‍🏫 For pupils who finish: add a score, or shuffle the questions with random. This sets up the next lessons on how the CPU actually runs a program.

## I can…
Tick your "I can…". Tell a partner one thing your quiz does.

> 🧑‍🏫 Quick check: read the file → split each line → ask the question → check the answer.
