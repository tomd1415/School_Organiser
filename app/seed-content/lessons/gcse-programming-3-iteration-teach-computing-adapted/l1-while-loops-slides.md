# While loops

## Today we are learning
- explain what iteration (a loop) means
- read a while loop and say when it stops
- change an if statement into a while loop
- extend a guess the number game

> 🧑‍🏫 Read the four "I can…" aloud. Same routine as every lesson. Vocabulary on the board: iteration · while loop · condition · True / False.

## Starter — the robot that never stops
![A robot repeating "Do you enjoy fish?"]({{res:l1-while-loop-fish-teach-computing.png}})

The rule was: *while the person is here, keep asking.* The person never leaves.

> 🧑‍🏫 Think · pair · share on the starter worksheet. Draw out: the robot repeats — that is ITERATION. A loop with no way to become False never stops (an infinite loop). Misconception M9: the condition is NOT checked constantly — the loop finishes its block, THEN checks again.

## What is iteration?
- **Iteration** = repeating a group of instructions.
- A **while loop** repeats *while* its condition is **True**.
- When the condition is **False**, the loop stops.

> 🧑‍🏫 I-do. Say it plainly: "while True, keep going; when False, stop." Keyword to choose on the Support worksheet: while loop.

## Predict — the guess the number game  (I do → we do)
```
number = 4
print("Guess a number between 1 and 10")
guess = int(input())
while guess != number:
    print("Incorrect")
    guess = int(input())
print("Correct")
```

> 🧑‍🏫 Predict together, then run it. Stress: the loop checks `guess != number` each time round. Likely error: forgetting `guess = int(input())` inside the loop → it loops forever on the same wrong number. Fix-words: "ask again INSIDE the loop."

## Your turn — extend the game  (you do)
Put the *guess the word* lines in order, then add a guess counter.

> 🧑‍🏫 Support: order the Parson's puzzle on the worksheet. Core: explain why input is needed inside the loop. Challenge: add a `guesses` counter that prints the total. TA: "prompt, do not do it for them." They paste their link + a screenshot.

## I can…
Tick your four "I can…". Show me your working loop.

> 🧑‍🏫 Note who turned the if into a while and who added the counter.
