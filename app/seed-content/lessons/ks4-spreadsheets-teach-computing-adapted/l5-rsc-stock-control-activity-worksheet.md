# RSC stock control — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will use VLOOKUP to fetch item data from a lookup sheet, and an IF function to warn when stock runs low.

## How a till works
You scan an item number. A LOOKUP finds that number in the lookup sheet and returns the matching data.

![A till receipt with shortened item names]({{res:l5-till-receipt-teach-computing.png}})

## Predict
A VLOOKUP searches column A of the lookup sheet for the item number, then returns data from another column.

| Question | Your prediction |
|---|---|
| If you enter an item number that is NOT in the lookup sheet, what do you think will happen? | Type your answer here |

## Build the VLOOKUP (drag the lines into order)
Drag the parts so this VLOOKUP returns the third column of the lookup sheet.

```parsons
=VLOOKUP(
A8,
'Lookup sheet'!$A$2:$C$17,
3,
FALSE)
```

## 🟢 Support
| Question | Choose |
|---|---|
| In `=VLOOKUP(A8, ...)`, the cell A8 holds the… | (  ) item number to look up (  ) price (  ) heading |
| `FALSE` at the end of a VLOOKUP asks for… | (  ) an exact match (  ) any match (  ) no match |

## 🟡 Core
The IF function checks a condition. If it is true it shows one thing, if false it shows another. Fill in the gaps.

The formula `=IF(H8<100,"Reorder","")` shows the word [[ ]] when the stock in H8 is below 100. If the stock is NOT below 100 it shows [[ ]] (nothing).

| Question | Type your code here |
|---|---|
| Write an IF formula that shows "Reorder" when the stock level in H8 falls below 50. | Type your code here |

## 🔴 Challenge
We also want to warn the user if they enter more sales than the stock allows.

![The VAT rate cell that the lookup uses]({{res:l5-vat-rate-lookup-cell-teach-computing.png}})

| Question | Type your code here |
|---|---|
| Stock is in G8, number sold is in E8. Write an IF formula that shows "CHECK INPUT" when the number sold is greater than the stock. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Write one VLOOKUP or IF formula you used | Type your answer here |
| Show your stock control sheet with a lookup working | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I used VLOOKUP to fetch item data
- [ ] I made the lookup range absolute with $ signs
- [ ] I used an IF function to warn when stock is low
- [ ] I tested my stock control model
