# The RSC Live event

## Today we are learning
- calculate ticket prices with a formula
- count sold seats with COUNTIF
- use data validation to make a drop-down list
- use conditional formatting to show sold seats

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary: format · model · formula · COUNTIF · data validation · conditional format. Same routine as every lesson.

## Starter — who uses spreadsheets?
- spreadsheet skills are wanted in many jobs
- a teacher, a shopkeeper, an event planner all use them

> 🧑‍🏫 Many job adverts ask for spreadsheet skills. Use the starter sort to show the same tool does many jobs.

## Ticket prices from one place
![Seating codes and prices]({{res:l2-seating-codes-prices.png}})

- prices are stored ONCE, at the top
- student price = adult price × 25%, e.g. `=AB6*25%`
- change the price once and every formula updates

> 🧑‍🏫 Worked example: `=AB6*25%` for students, `=AB6*75%` for over 60s. The point is single-source-of-truth: change one cell, all update.

## COUNTIF — count the sold seats
- COUNTIF counts cells that match one thing
- `=COUNTIF(H8:Q9,"A")` counts Premier adult seats
- text must be inside speech marks: `"A"`

> 🧑‍🏫 Likely error: missing speech marks around the letter. Fix-words: "text needs speech marks." Then seats remaining = total seats − seats sold.

## Data validation — stop user error
![A seating plan using drop-down seat codes]({{res:l2-seating-validation.png}})

- a drop-down list only lets the user pick a real code
- this stops typos that would break the COUNTIF totals

> 🧑‍🏫 Show the drop-down. Stress: if a user types "Adlut" the count is wrong — validation prevents that. Explore option: reject invalid data, add help text.

## Conditional formatting — show sold seats
- a rule changes a cell's colour automatically
- rule: "if the cell is not empty, fill it a colour"
- now sold seats stand out at a glance

> 🧑‍🏫 Demo Format → Conditional formatting → "Is not empty". Keep colours calm, no flashing. TA: prompt, do not do it for them.

## I can…
Tick your four "I can…". Show me your drop-down list working.

> 🧑‍🏫 Note who can explain why validation keeps the totals correct.
