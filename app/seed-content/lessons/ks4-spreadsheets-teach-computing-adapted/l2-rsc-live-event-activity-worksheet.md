# The RSC Live event — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will calculate ticket prices, count sold seats with COUNTIF, and use data validation to stop user error.

## The seating prices
Students pay 25% of the adult price. Over 60s pay 75% of the adult price.

![Seating codes and seating prices tables]({{res:l2-seating-codes-prices.png}})

## Predict
The adult Premier price is in cell AB6.

| Question | Your prediction |
|---|---|
| To work out the student price, do we multiply the adult price by 25% or by 75%? | (  ) 25% (  ) 75% |

## Build the COUNTIF (drag the lines into order)
COUNTIF counts the cells in a range that match one thing. Drag the parts into the right order.

```parsons
=COUNTIF(
H8:Q9,
"A"
)
```

## 🟢 Support
A seat code is one letter. Match each code to who it is for.

| Code | Who it is for |
|---|---|
| A | (  ) Adult (  ) Student (  ) Over 60s |
| S | (  ) Adult (  ) Student (  ) Over 60s |
| O | (  ) Adult (  ) Student (  ) Over 60s |

## 🟡 Core
COUNTIF counts text only when it is inside speech marks. Fill in the gaps.

To count every Premier seat sold to an adult, we write `=COUNTIF(H8:Q9,[[ ]]A[[ ]])`. The letter A must be inside [[ ]] marks because it is text.

| Question | Type your code here |
|---|---|
| The Premier section has 20 seats. The seats sold are totalled in AA13. Write a formula for the seats still remaining. | Type your code here |

## 🔴 Challenge
Data validation gives the user a drop-down list, so they can only pick a real seat code.

![A seating plan where each seat uses a drop-down list of codes]({{res:l2-seating-validation.png}})

| Question | Your answer |
|---|---|
| Explain how a drop-down list of seat codes reduces user error AND keeps the COUNTIF totals correct. | Type your answer here |

## Show your work
| Question | Your answer |
|---|---|
| Write one COUNTIF formula you used | Type your answer here |
| Show your seating model with a drop-down list working | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I calculated discounted ticket prices with a formula
- [ ] I used COUNTIF to count sold seats
- [ ] I added data validation to make a drop-down list
- [ ] I used conditional formatting to show sold seats
