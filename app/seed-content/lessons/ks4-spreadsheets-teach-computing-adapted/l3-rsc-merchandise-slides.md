# RSC merchandise

## Today we are learning
- calculate profit for each item
- total the profit with SUM
- format money cells as currency
- use conditional formatting to show the target

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary: format · model · formula · calculate percentage · conditional format. Same routine as every lesson.

## Starter — there's always something to buy
- every event sells merch
- cheaper items (keyrings) sell more than dear items (hoodies)

> 🧑‍🏫 Use the starter sort to draw out cheap vs expensive. Cheap items usually sell in bigger numbers — useful later for stock control.

## The model
![The blank merchandise sheet]({{res:l3-merch-blank.png}})

- cost price = what the shop pays (wholesale)
- selling price = what the customer pays (retail)
- the extra is the mark-up = profit

> 🧑‍🏫 Name the gap between cost and selling price: the mark-up. This is where profit comes from.

## Work out profit
- profit per item = (selling price − cost price) × sales
- e.g. `=(C8-B8)*D8`
- total profit = `=SUM(E8:E22)`

> 🧑‍🏫 Read the formula in cell order. Likely error: forgetting the brackets, so it multiplies before subtracting. Fix-words: "brackets first."

## The finished model
![The finished merchandise model]({{res:l3-merch-model.png}})

- money cells formatted as currency (£)
- headings: borders, fill, bold, centre, wrap text

> 🧑‍🏫 Formatting is not decoration — it makes the model readable. Keep colours calm, no flashing.

## Conditional formatting — meet the target?
![A conditional formatting rule]({{res:l3-conditional-format-dialog.png}})

- a rule changes the colour automatically
- rule: if forecast profit is LESS THAN target → red
- change the rule so it turns green when the target is met

> 🧑‍🏫 Demo the rule dialog. Explore: some pupils set the colour from a formula. TA: prompt, do not do it for them.

## I can…
Tick your four "I can…". Show me your profit total.

> 🧑‍🏫 Note who can explain the mark-up and who set a working conditional format.
