# Making a micro:bit timer — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will fix a buggy countdown, use true/false to start and stop it, then make and test my timer.

## 1. Find the bug (Predict, Run, Investigate)
A **bug** is a mistake in the code. Look at this countdown. It starts at **30**, but the bar graph only goes **up to 10**. The numbers do not match, so the graph is wrong.

![A countdown set to 30 but the bar graph only goes up to 10 — a bug]({{res:l2-countdown-bug-starts-at-30-graph-only-up-to-10-teach-computing.png}})

## 🟢 Support
| Question | Choose |
|---|---|
| Where is the bug? | (  ) the graph "up to" number does not match the start number (  ) the colour is wrong (  ) the buttons are missing |

## 🟡 Core
| Question | Your answer |
|---|---|
| How would you fix this bug? Write the number the graph should go up to. | Type your answer here |

Here is the fixed code. The start number and the graph "up to" number now match.

![A countdown set to 30 and the bar graph goes up to 30 — fixed]({{res:l2-countdown-fixed-starts-at-30-graph-up-to-30-teach-computing.png}})

## 2. Start and stop with true/false (Boolean)
A **Boolean** variable can only be **true** or **false**. We use one called **Timer running**. Button A sets it **true** (start). Button B sets it **false** (stop).

![Block: set Timer running to true]({{res:l2-boolean-block-set-timer-running-to-true-teach-computing.png}})
![Block: set Timer running to false]({{res:l2-boolean-block-set-timer-running-to-false-teach-computing.png}})

| Question | Your answer |
|---|---|
| When Timer running is **true**, the timer is… | (  ) on (counting down) (  ) off (  ) deleted |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Why is true/false better here than a number like 1 or 0? Give one reason. | Type your answer here |

## 3. Put the timer blocks in order
These blocks go inside the **forever** loop. Put them in the right order.

![The if … else if blocks for the timer]({{res:l2-if-else-if-blocks-for-the-timer-teach-computing.png}})

```parsons
if Countdown = 0 then
show icon (the finish icon)
else if Timer running = true then
change Countdown by -1
pause (ms) 1000
plot bar graph of Countdown up to 10
```

## Show your work
Make your countdown timer in MakeCode. Use button A to start and button B to stop. Test it with the play button.

![The complete countdown timer with start, stop and reset]({{res:l2-the-complete-countdown-timer-start-stop-reset-teach-computing.png}})

| Question | Your answer |
|---|---|
| Paste your MakeCode share link here | Type your answer here |
| Show your finished timer | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I can explain what a countdown timer does and how a loop repeats steps
- [ ] I can find and fix a bug in a program
- [ ] I can use true/false (Boolean) and if…else to start and stop the timer
- [ ] I can make and test a countdown timer in MakeCode
