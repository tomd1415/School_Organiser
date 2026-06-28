# Battle Boats code — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Over these lessons I will **build** the Battle Boats program one part at a time, **testing as I go**, and keep a **code log**.

## Build order — put the parts in order
Drag the subroutines into a sensible build order (build, test, then the next).

```order
Set up the board as a 2D list
Display the board on screen
Let the player place their 5 boats
Let the computer place its boats
Take the player's turn (fire, hit or miss)
Take the computer's turn
Check for a winner and announce it
```

## Code snippets — the board is a 2D list
```python
# an 8x8 grid built with a loop; "." is an empty square
board = []
for row in range(8):
    board.append(["."] * 8)
board[2][3] = "B"     # place a boat: row first, then column
print(board[2][3])
```

## Building the game — fill the gaps
| Question | Your answer |
|---|---|
| The grid is stored as a [[ ]] list (a list of lists) | |
| To place a boat at row 2, column 3, write `board[2]` [[ ]] `= "B"` | |
| A hit is marked with the letter [[ ]] on the grid | |

## 🟢 Support — display the board
Order the lines so this subroutine prints each row of the board.

```parsons
def display_board(board):
    for row in board:
        print(row)
display_board(board)
```

## 🟡 Core
| Question | Your answer |
|---|---|
| Write the code that lets the player place a boat: ask for a row and a column, check the square is empty, then set it to "B". Type your code. | Type your code here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Write the player's-turn code: ask for a target, mark "H" for a hit or "M" for a miss, and don't allow the same square twice. Type your code. | Type your code here |

## My code log
| Question | Your answer |
|---|---|
| What worked well today? | Type your answer here |
| What was challenging today? | Type your answer here |
| What are my next steps? | Type your answer here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Trinket / IDE share link here | Type your answer here |
| Show your code so far | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I kept a code log of my progress
- [ ] I built my program one subroutine at a time
- [ ] I tested each part as I built it
- [ ] I built the Battle Boats program (towards Task 7)
