# Arrays and lists — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will use a **list** in a program and **append** and **remove** items.

## Array or list? — sort the cards
A **list** is **dynamic** (it can change size). An **array** is **static** (a fixed size, same data type).

```sort
Array: fixed (static) size, holds the same data type, cannot grow during the program
List: can change size (dynamic), can hold different data types, you can append and remove items
```

## Key words — match each to its meaning
| Word | What it means |
|---|---|
| Index | (  ) the position of an item, starting at 0 (  ) adding an item to the end (  ) taking an item out |
| Append | (  ) the position of an item, starting at 0 (  ) adding an item to the end (  ) taking an item out |
| Remove | (  ) the position of an item, starting at 0 (  ) adding an item to the end (  ) taking an item out |

## Code snippets
```python
shopping = ["bread", "cheese", "milk"]
shopping.append("eggs")     # add to the end
shopping.remove("cheese")   # take out
print(shopping)
```

## Append and remove — fill the gaps
Start with `shopping = ["bread", "cheese", "milk"]`.

| Question | Your answer |
|---|---|
| To add "flour" to the end, write `shopping.` [[ ]] `("flour")` | |
| To take out "milk", write `shopping.` [[ ]] `("milk")` | |
| After `shopping.append("eggs")`, the index of "eggs" is [[ ]] | |

## 🟢 Support — Simon says
Order the lines so the program prints a random Simon-says instruction.

```parsons
from random import randint
simon_says = ["Hands on head", "Hands on ears", "Right hand up"]
index = randint(0, 2)
instruction = simon_says[index]
print(instruction)
```

## 🟡 Core
| Question | Your answer |
|---|---|
| Write a shopping-list program that lets the user add an item, then prints the list. Type your code. | Type your code here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Add a choice: ask the user "add or remove?", then append or remove the item they type. Type your code. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Trinket / IDE share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I described the difference between an array and a list
- [ ] I created a list and got an item by its index
- [ ] I appended an item to a list
- [ ] I removed an item from a list
