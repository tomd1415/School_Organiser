# In a while, crocodile — looping with while

## Today we are learning
- use a `while` loop to repeat until a condition is met
- build up a list inside a loop with `append`
- use `len` and `in` on lists and strings
- read a character of a string by its index

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: iteration · while · condition · len · in · index. Same routine as every lesson.

## Starter — passwords
We can ask a list of 1,000 real passwords: how many are there (`len`), is yours in there (`in`), where is it (`index`)?

> 🧑‍🏫 Use the starter worksheet. This is a real leaked-password list with rude words removed — a good hook for "is my password safe?". Keep it light and factual.

## Form a band — a while loop  (we do)
A `while` loop repeats its indented lines again and again, until the condition becomes False.

> 🧑‍🏫 Live-code: keep asking for instruments and `append` them to a `band` list until `len(band) < 3` is no longer true. Indentation shows what is inside the loop.

## City hopping — build the loop  (you do)
![A Python program that picks a random city from a list]({{res:l3-city-hopping-code-teach-computing.png}})

Keep picking random cities and adding them to the trip until there are five.

> 🧑‍🏫 Use the Parsons task on the worksheet. Likely error: forgetting to `append` inside the loop, so the trip never grows — fix-words "the loop body must add to the list."

## City guessing — strings have length and characters  (challenge)
![A Python city-guessing program that uses string length and characters]({{res:l3-city-guessing-code-teach-computing.png}})

A string behaves like a list of characters: `city[0]` is the first letter, `len(city)` is how many letters.

> 🧑‍🏫 Challenge: reveal the first letter as a hint. They paste a link + screenshot on the activity worksheet.

## I can…
Tick your four "I can…". Show me a loop that built a list.

> 🧑‍🏫 Note who can explain when the loop stops.
