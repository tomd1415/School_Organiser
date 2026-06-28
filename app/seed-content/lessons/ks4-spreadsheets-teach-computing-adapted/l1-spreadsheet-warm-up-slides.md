# Spreadsheet warm-up

## Today we are learning
- name the parts of a spreadsheet
- use a formula to work things out
- tell apart a relative and an absolute formula
- format money cells as currency

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: formula · relative · absolute · ADD · SUM · MULTIPLY. Same routine as every lesson.

## Starter — name the parts
![A spreadsheet for Rock Star Challenge voting]({{res:l1-voting-cell-grid.png}})

- COLUMN = the letters A, B, C across the top
- ROW = the numbers 1, 2, 3 down the side
- CELL = one box (e.g. B10 is column B, row 10)

> 🧑‍🏫 Point at a column letter, a row number, and one cell. This matches the label task on the starter worksheet. Likely error: "a cell is a row" — a cell is ONE box where a column and a row cross.

## A formula starts with =
- a FORMULA always starts with `=`
- `=D9*B4` means "the value in D9 times the value in B4"
- `=SUM(E9:E18)` adds every cell from E9 to E18

> 🧑‍🏫 Say formulae out loud in cell order: "E nine equals D nine times B four", not "138000 times 1.2". This builds the habit for the whole unit.

## Relative vs absolute
- a RELATIVE formula moves as you fill it down: `=D9*B4` becomes `=D10*B5`…
- that breaks when one cell must stay the same
- an ABSOLUTE formula LOCKS a cell with `$`: `=D9*$B$4`

> 🧑‍🏫 This is the key idea of the lesson. Demo: drag `=D9*B4` down and watch it break, then add the `$` signs and drag again. Fix-words: "lock it with dollar signs."

## The finished model
![The completed voting model with income, donation and profit]({{res:l1-voting-completed.png}})

- income = votes × charge
- donation = total votes × amount per vote
- profit = income − donation

> 🧑‍🏫 Show the finished model so pupils know where they are heading. Cells that hold money are formatted as currency (£).

## Your turn
Open the RSC voting spreadsheet. Add the formulae, then format the money cells as currency.

> 🧑‍🏫 Support: give a part-completed sheet. TA: prompt, do not type it for them. They screenshot the finished sheet onto the activity worksheet.

## I can…
Tick your four "I can…". Show me one formula that worked.

> 🧑‍🏫 Note who can explain why `$B$4` is needed. Movement break before the next lesson if needed.
