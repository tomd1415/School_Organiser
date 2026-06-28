# Create a program — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will sort **test data**, then **design**, **create**, and **test** the ticket machine program.

## Types of test data
**Final testing** checks the whole program with three kinds of data. Sort each example.

```sort
Normal data (sensible, expected): a number of tickets like 2, a surname like Smith, a number in range like 5
Boundary data (the edge of what is allowed): the lowest allowed value, the highest allowed value, exactly 0 tickets
Erroneous data (wrong — should be rejected): a letter typed instead of a number, an empty answer, a number far too big
```

## 🟢 Support
| Question | Choose |
|---|---|
| Testing with a letter when a number is expected is… | (  ) erroneous data (  ) normal data (  ) boundary data |
| Testing with the highest value the program allows is… | (  ) boundary data (  ) normal data (  ) erroneous data |

## 🟡 Core — use a test table
A test table records what you tried and whether it worked.

| Test | What you enter | Expected output | (  ) Pass (  ) Fail |
|---|---|---|---|
| Normal: 2 adult tickets | 2 | adds £40 to the cost | (  ) Pass (  ) Fail |
| Erroneous: a letter | k | asks again, no crash | (  ) Pass (  ) Fail |
| Boundary: 0 tickets | 0 | accepts 0, charges £0 | (  ) Pass (  ) Fail |

## The project — Copington theme park ticket machine
![A theme park ride — the ticket machine scenario]({{res:l6-theme-park-ride-teach-computing.png}})

Build a ticket machine that welcomes the customer, asks how many adult / child / senior tickets, adds up the cost, and prints a ticket. Use the **structure chart** (subroutines: `entrance`, `wristband`, `collect`, `issue_ticket`) and the techniques from this unit.

Prices: Adult £20 · Child £12 · Senior £11 · Wristband £20.

## Design first
Plan your program before you build it.

| Question | Your answer |
|---|---|
| Write the pseudocode for the `entrance` subroutine (asks for adult, child, senior numbers; returns the total cost). | Type your code here |

## 🔴 Challenge — create the program
Build as much of the ticket machine as you can. Use subroutines, validate the input, and keep one entry and one exit point per block.

![Working on the program]({{res:l6-project-coding-teach-computing.png}})

| Question | Your answer |
|---|---|
| Type your `entrance` subroutine (and any others you finish). | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Python (Trinket / IDE) share link here | Type your answer here |
| Show your finished ticket machine | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I described iterative testing and final testing
- [ ] I sorted data into erroneous, boundary, and normal
- [ ] I planned a program from a structure chart
- [ ] I created and tested a program
