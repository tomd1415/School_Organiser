# Improving a game — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will set a score with the green flag, and decide where in the code to change it.

## Set the score at the start
When the game starts, the score should go back to 0. We do this with the green flag. Put these blocks in the right order.

```parsons
when green flag clicked
set score to 0
```

This is the start of the Pong code:

![Pong code: when flag clicked, set score to 0, then a repeat loop with the ball moving]({{res:l3-pong-code.png}})

## 🟢 Support
| Question | Choose |
|---|---|
| What does **set score to 0** do at the green flag? | (  ) starts the score at 0 each game (  ) ends the game (  ) hides the ball |
| What is the difference between **set** and **change**? | (  ) set puts a value in; change adds to it (  ) they do the same thing (  ) set deletes the score |

## Where you put the block matters
You can add a **change score by 1** block in three places. Match each place to what happens.

| Where the change score block goes | Choose what happens |
|---|---|
| In the setup, before the repeat loop | (  ) the score changes once at the start (  ) the score goes up very fast all the time (  ) the score goes up only when the ball hits the paddle |
| Inside the repeat loop | (  ) the score changes once at the start (  ) the score goes up very fast all the time (  ) the score goes up only when the ball hits the paddle |
| Inside "if touching paddle" | (  ) the score changes once at the start (  ) the score goes up very fast all the time (  ) the score goes up only when the ball hits the paddle |

## Set and change
Sort these blocks into the ones that **set** a value and the ones that **change** a value.

```sort
Set (put a value in): set score to 0, set lives to 3
Change (add to a value): change score by 1, change score by -1
```

## Changing by different amounts
![A change score by 1 then change score by -1 block]({{res:l3-change-up-down.png}})

| Question | Your answer |
|---|---|
| The score is 5. The code runs **change score by 1** then **change score by -1**. What is the score now? | Type your answer here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Why should the score be **set to 0** with the green flag, and not just left from the last game? | Type your answer here |

## Show your work
Add a score to the Pong game. Put the **change score by** block where the score goes up when the ball hits the paddle.

| Question | Your answer |
|---|---|
| Show your Pong game with a working score. | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I can choose variables that would improve a game
- [ ] I can set a variable to a start value with the green flag
- [ ] I can decide where in the code to change a variable
- [ ] I can improve a game using variables
