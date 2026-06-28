# Caesar cipher — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will **add key–value pairs** to a dictionary and use it as a **Caesar cipher** to encrypt a message.

![Encryption keeps a message locked, like a safe (Teach Computing).]({{res:l2-encryption-safe-teach-computing.png}})

## Key words — match each to its meaning
| Word | What it means |
|---|---|
| Dictionary | (  ) a structure of key–value pairs (  ) the label that finds a value (  ) a key joined to its value |
| Key | (  ) a structure of key–value pairs (  ) the label that finds a value (  ) a key joined to its value |
| Key–value pair | (  ) a structure of key–value pairs (  ) the label that finds a value (  ) a key joined to its value |

## Code snippets
```python
caesar = {}              # an empty dictionary
caesar["A"] = "C"        # add a key-value pair (shift of +2)
caesar["B"] = "D"
print(caesar["A"])       # looks up A, prints C
print(chr(67))           # chr() turns a number into a letter -> C
```

## Dictionary syntax — fill the gaps
A list is **static** (a fixed thing), but a dictionary is **dynamic** — it can **grow** while the program runs.

| Question | Your answer |
|---|---|
| An empty dictionary is written as [[ ]] | |
| To add the pair C → E, write `caesar["C"]` [[ ]] `"E"` | |
| To encrypt the letter in `plain`, look it up with `caesar[` [[ ]] `]` | |

## 🟢 Support — build part of the cipher
Order the lines so the program builds a small cipher and encrypts the letter A.

```parsons
caesar = {}
caesar["A"] = "C"
caesar["B"] = "D"
letter = "A"
print(caesar[letter])
```

## 🟡 Core
| Question | Your answer |
|---|---|
| Plan the cipher program in order. Drag the steps. | |

```order
Ask the user for an encryption key (1–25)
Build a dictionary that pairs each plain letter with its shifted letter
Ask the user for the message to encrypt
Change the message to UPPER CASE
Look up each letter in the dictionary to build the encrypted message
Show the encrypted message
```

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Write the Caesar cipher program: ask for the message, look up each letter in your `caesar` dictionary, and print the encrypted text. Type your code. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Trinket / IDE share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I described what a dictionary and a key–value pair are
- [ ] I added a new key–value pair to a dictionary
- [ ] I used a dictionary as a Caesar cipher
- [ ] I built a Caesar cipher encryption program
