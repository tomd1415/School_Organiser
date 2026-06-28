# List methods

## Today we are learning
- traverse a list with a for loop
- use list methods (append, sort, reverse, count)
- build a deck of cards with a nested loop
- write a function that returns a list

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: traverse · method · nested loop · custom-built function. Same routine. Everyone has Python open. Real cards on tables help if you have them.

## Starter — predict
```python
animals = ["cat", "dog", "fox"]
for animal in animals:
    print(animal)
```
Predict the output and how many lines.

> 🧑‍🏫 Peer instruction. Three lines: cat, dog, fox. Traversing a list is the SAME loop as traversing a string. Support: tick what the loop visits.

## List methods  (I do)
- A **method** is a function that belongs to the list: `list.method()`.
- `append` adds · `remove` takes out · `sort` orders · `reverse` flips · `count` counts.

> 🧑‍🏫 I-do. Predict the output after each method on a small list. Use the "match the method" task on the worksheet. Methods are written with a dot: `deck.append(...)`.

## We do — build a deck of cards
![A full deck of 52 playing cards]({{res:l6-deck-of-cards-teach-computing.png}})
- 4 suits × 13 cards = **52**. Use a loop INSIDE a loop (a **nested loop**).

> 🧑‍🏫 We-do. Step the nested loop slowly: for each suit, loop 1..13 and append `str(x) + suit`. Likely error: `x + suit` crashes (number + text). Fix-words: "make the number a string first — str(x)."

## Your turn  (you do)
- Support: order the deck builder (Parson's).
- Core: build the deck, check it prints 52.
- Challenge: a `make_deck()` function that RETURNS the deck.

> 🧑‍🏫 Pair programming, swap every 5 mins. A function can return a whole list — they may not expect this. TA: prompt, don't do it for them. Screenshot at the end.

## I can…
Tick your four "I can…". Show me your deck.

> 🧑‍🏫 Plenary. Match each method to its description. Recap: methods use a dot; a nested loop makes patterns; a function can return a list. Movement break is routine.
