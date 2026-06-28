# Summative assessment — starter worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will develop a linear search function in Python, then complete the end-of-unit assessment.

## Starter — build a linear search
The comments are your guide. The lines below build a linear search function but are jumbled — drag them into the correct order.

```parsons
def linear_search(items, search_item):
    index = -1
    current = 0
    while current < len(items):
        if items[current] == search_item:
            index = current
        current = current + 1
    return index
```

## 🟢 Support
| Question | Choose |
|---|---|
| The function returns the ______ (position) of the item it finds. | (  ) index (  ) colour (  ) length |

## 🟡 Core
| Question | Choose |
|---|---|
| If the item is not in the list, the function returns… | (  ) -1 (  ) 0 (  ) the last item |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Add a `found` flag so the search can stop early. Where would you set it to True? | Type your answer here |

## ✅ I can…
- [ ] I can order the lines of a linear search function
- [ ] I can say what the function returns when the item is found or not found
