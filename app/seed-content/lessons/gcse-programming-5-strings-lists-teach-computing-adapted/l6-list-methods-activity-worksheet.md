# List methods — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will use **list methods** and build a **deck of cards** with a nested loop.

## Match the method to what it does
Drag each answer to the right method.

| Method | What it does |
|---|---|
| `list.append(item)` | (  ) adds an item to the end (  ) takes an item out (  ) puts the list in order (  ) reverses the order (  ) counts how many times an item appears |
| `list.remove(item)` | (  ) adds an item to the end (  ) takes an item out (  ) puts the list in order (  ) reverses the order (  ) counts how many times an item appears |
| `list.sort()` | (  ) adds an item to the end (  ) takes an item out (  ) puts the list in order (  ) reverses the order (  ) counts how many times an item appears |
| `list.reverse()` | (  ) adds an item to the end (  ) takes an item out (  ) puts the list in order (  ) reverses the order (  ) counts how many times an item appears |
| `list.count(item)` | (  ) adds an item to the end (  ) takes an item out (  ) puts the list in order (  ) reverses the order (  ) counts how many times an item appears |

## Build — a deck of cards
A deck has 4 suits, each with 13 cards. You will build it with a **nested loop** (a loop inside a loop).

![A full deck of 52 playing cards]({{res:l6-deck-of-cards-teach-computing.png}})

```python
suits = ["♥", "♦", "♣", "♠"]
deck = []
for suit in suits:
    for x in range(1, 14):
        deck.append(str(x) + suit)
print(deck)
print(len(deck))
```

## 🟢 Support — order the deck builder
```parsons
suits = ["♥", "♦", "♣", "♠"]
deck = []
for suit in suits:
    for x in range(1, 14):
        deck.append(str(x) + suit)
print(len(deck))
```

## 🟡 Core
| Question | Your answer |
|---|---|
| `print(len(deck))` shows how many cards. For 4 suits × 13 cards, what number should it print? | Type your answer here |
| Why must we write `str(x) + suit` and not `x + suit`? | Type your answer here |

## 🔴 Challenge — return a list from a function
Write a function `make_deck()` that builds the deck and **returns** it, so it can be used in any program.

| Question | Your answer |
|---|---|
| Type your `make_deck()` function. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Trinket / IDE share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I traversed a list with a for loop
- [ ] I used list methods (append, sort, reverse, count)
- [ ] I built a deck of cards with a nested loop
- [ ] I wrote a function that returns a list
