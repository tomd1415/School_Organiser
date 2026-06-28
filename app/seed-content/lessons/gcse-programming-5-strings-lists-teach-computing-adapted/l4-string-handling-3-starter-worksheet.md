# String handling III — starter worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will **combine** string-handling techniques and **randomisation** to make a secure password generator.

## Starter — predict this program
`randint(65, 90)` picks a random whole number from 65 to 90. `chr()` turns a number into a character.

```python
from random import randint
random_number = randint(65, 90)
random_character = chr(random_number)
print(random_character)
```

| Question | Your prediction |
|---|---|
| The numbers 65–90 are ASCII codes for capital letters A–Z. What kind of thing will this print? | Type your answer here |

## 🟢 Support
| Question | Choose |
|---|---|
| `randint(65, 90)` gives… | (  ) a random number from 65 to 90 (  ) always 65 (  ) a letter |
| `chr(65)` gives… | (  ) the character "A" (  ) the number 65 (  ) an error |

## 🟡 Core
| Question | Your answer |
|---|---|
| Put the two ideas together: what does `chr(randint(65, 90))` give you? | Type your answer here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Why is a password made of random characters harder to guess than a normal word? | Type your answer here |
