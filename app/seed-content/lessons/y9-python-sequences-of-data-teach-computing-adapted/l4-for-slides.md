# The famous for — looping over items

## Today we are learning
- use a `for` loop to go through a list
- count items that match a condition
- collect matching items into a new list
- use a `for` loop over a string

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: iteration · for · item · count · collect. Same routine as every lesson.

## Starter — shopping list
`for item in shopping:` runs its indented line once for every item in the list.

> 🧑‍🏫 Use the starter worksheet. The `for` syntax reads almost like English — let pupils predict the output before you run it.

## Three for-loop patterns
Print every item · count the ones that match · collect the ones that match into a new list.

> 🧑‍🏫 Use the card-sort: which lines belong to the counting pattern (`count = 0` … `count = count + 1`) vs the collecting pattern (`selection = []` … `selection.append(...)`). These two patterns unlock every task today.

## Lipogram — a novel with no letter "e"
![The cover of the novel Gadsby, a 50,000-word novel written without the letter E]({{res:l4-gadsby-cover-teach-computing.jpg}})

We can loop over every word and check whether it contains an "e".

> 🧑‍🏫 Live-code: `for word in book: if "e" in word:`. Real hook — the author avoided every "e" in 50,000 words. Connects the `in` operator to a `for` loop.

## English words  (you do)
![A Python program that loads a list of words and counts them]({{res:l4-english-words-code-teach-computing.png}})

Count how many words have a given length, then collect the words that contain a piece of text.

> 🧑‍🏫 Support: pick the loop header. Core: fill the gap + print every word. Likely error: indenting wrongly so the check runs outside the loop — fix-words "the work happens inside the loop, one indent in."

## Heartbeats  (challenge)
![A plotted ECG signal with red dots marking zero crossings]({{res:l4-heartbeats-plot-teach-computing.png}})

Loop over real heart data and count the beats by spotting zero crossings.

> 🧑‍🏫 Extension for fast finishers. They paste a link + screenshot on the activity worksheet.

## I can…
Tick your four "I can…". Show me a `for` loop you wrote.

> 🧑‍🏫 Note who can name the pattern (print / count / collect) they used.
