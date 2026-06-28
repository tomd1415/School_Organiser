# Nested selection

## Today we are learning
- say what nested selection means
- trace a nested-selection program
- modify a nested-selection program
- make a "guess the…" game

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: nested selection · selection · condition.

## Starter — True or False?
Work out each logical expression.

> 🧑‍🏫 Pupils sort the cards on the worksheet. Recaps and/or and BIDMAS from last lessons. Use hand signals for a quick check.

## What is nested selection?
![Two eggs inside a bird's nest]({{res:l11-nest-eggs.png}})

Nested selection is an `if` **inside** another `if` — like eggs nested in a nest.

> 🧑‍🏫 The inner `if` only runs when the outer condition is True. The nest image is the memory hook.

## Walk through — username and password
First check the username. ONLY if that is right, check the password.

> 🧑‍🏫 Walk the three outcomes: wrong username → stop; right username, wrong password → stop; both right → access. Note the variable states as you go.

## Guess the animal
![The guess-the-animal program]({{res:l11-animal-code.png}})

Predict, run, investigate.

> 🧑‍🏫 PRIMM. Type `y` first → Whale. `n` then `y` → Ostrich. `n` then `n` → Lion. The second question is only asked when the first answer is `n`.

## The flow
water? → not n: Whale · n: wings? → y: Ostrich · n: Lion

> 🧑‍🏫 Pupils order these steps on the worksheet, then modify the program to add a Fish.

## Make — guess the vegetable
Green? → tree-shaped? (broccoli / peas). Not green → orange? (carrot / sweetcorn).

> 🧑‍🏫 You-do. The worksheet gives the tree diagram. Likely error: indentation of the inner if. Support: follow the animal game's shape.

## I can…
Tick your four "I can…". Show me your vegetable game.

> 🧑‍🏫 Note who nested an if inside an if correctly.
