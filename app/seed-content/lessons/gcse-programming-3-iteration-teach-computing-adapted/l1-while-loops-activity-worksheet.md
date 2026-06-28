# While loops — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will read a **while loop**, change an **if** into a **while** loop, and extend a *guess the number* game.

## Predict
This is the *guess the number* game. Read it before you run it.

```python
number = 4
print("Guess a number between 1 and 10")
guess = int(input())
while guess != number:
    print("Incorrect")
    print("Guess a number between 1 and 10")
    guess = int(input())
print("Correct")
```

| Question | Your prediction |
|---|---|
| What will happen if the player keeps guessing the wrong number? | Type your answer here |

## How a while loop works
A while loop checks its condition, runs the block, then checks the condition **again**. Fill in the gaps:

A while loop keeps repeating while its condition is [[ ]].

A while loop stops when its condition becomes [[ ]].

## 🟢 Support
Put this *guess the word* program in order so it asks for a word until the word is "Raspberry".

```parsons
print("Guess the word")
word = input()
while word != "Raspberry":
    print("Try again...")
    word = input()
print(f"Well done, the word was {word}!")
```

## 🟡 Core
| Question | Your answer |
|---|---|
| Why does the loop need `guess = int(input())` **inside** the loop as well as before it? | Type your answer here |
| The game says "Correct" even before the player wins. Which line runs too early? | Type your answer here |

## 🔴 Challenge
Add a counter that records how many guesses the player made. Type your changed program.

| Question | Your answer |
|---|---|
| Write the program with a `guesses` counter that increases by 1 each loop, then prints the total at the end. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Python (Trinket / IDE) share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I explained what iteration (a loop) means
- [ ] I read a while loop and said when it stops
- [ ] I changed an if statement into a while loop
- [ ] I extended the guess the number game
