# 2D lists project — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will **decompose** noughts and crosses, build the **board** as a 2D list, and write the **check_win** function. This is a project — work with your partner and take your time.

## The board — a 2D list
```python
board = [[" ", " ", " "],
         [" ", " ", " "],
         [" ", " ", " "]]
```
Each square is `board[row][column]`, for example `board[0][0]` is the top-left.

## Decompose — order the build
Drag the parts of the game into a sensible build order.

```order
Display the board
Give the player instructions
Read a valid position from the player
Move the player's piece onto the board
Check for a win
Play the game until someone wins
```

## 🟢 Support — order the display procedure
```parsons
def displayboard(board):
    print(board[0][0], "|", board[0][1], "|", board[0][2])
    print(board[1][0], "|", board[1][1], "|", board[1][2])
    print(board[2][0], "|", board[2][1], "|", board[2][2])
displayboard(board)
```

## 🟡 Core — place a piece
| Question | Your answer |
|---|---|
| Write a line that puts an `X` in the top-left square of `board`. | Type your code here |
| Write a line that puts an `O` in the middle square. | Type your code here |

## 🔴 Challenge — check for a win
A win is three of the same in a row, column or diagonal. The function is started for you.

```python
def check_win(board, player):
    won = False
    if board[0][0] == player and board[0][1] == player and board[0][2] == player:
        won = True
    # add the other 7 winning lines here
    return won
```

| Question | Your answer |
|---|---|
| Add at least two more winning lines (e.g. a column and a diagonal) to `check_win`. Type your code. | Type your code here |

## Test your game
| Test | Input | Expected output | Pass / fail |
|---|---|---|---|
| Top row of X wins | board top row = X, X, X | Won is True | Type your answer here |
| A wrong input is rejected | position = 0 | asks again | Type your answer here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Trinket / IDE share link here | Type your answer here |
| Show your working game | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I decomposed the problem into parts
- [ ] I used a 2D list to store the board
- [ ] I wrote part of the check_win function
- [ ] I tested my game with normal, boundary and erroneous data
