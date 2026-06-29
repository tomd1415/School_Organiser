# Dictionaries and data files — unit quiz

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
This quiz checks what I learned across the whole unit: dictionaries, text files, and CSV files.

## Key words — match each to its meaning
| Word | What it means |
|---|---|
| Record | (  ) all the attributes for one entity (  ) the label that finds a value (  ) a plain-text file with commas |
| Key | (  ) all the attributes for one entity (  ) the label that finds a value (  ) a plain-text file with commas |
| CSV | (  ) all the attributes for one entity (  ) the label that finds a value (  ) a plain-text file with commas |

## Dictionaries — fill the gaps
| Question | Your answer |
|---|---|
| A dictionary is written with [[ ]] brackets and stores key:value pairs | |
| To get the score from `player`, write `player[` [[ ]] `]` | |

## File modes — tick all that are TRUE (tick all that apply)
| Question | Tick all that apply |
|---|---|
| Which of these statements about file modes are TRUE? | [  ] "r" opens a file to read it [  ] "w" wipes a file and writes new data [  ] "a" adds data to the end [  ] you never need to close a file |

## Reading a file — order the code
Order the lines so the program reads a file into a list.

```parsons
file = open("scores.csv", "r")
data = []
for line in file:
    data.append(line.strip())
file.close()
```

## CSV methods — match each one
| Method | What it does |
|---|---|
| `.split(",")` | (  ) breaks a string into a list at the commas (  ) joins a list into one comma string |
| `",".join(my_list)` | (  ) breaks a string into a list at the commas (  ) joins a list into one comma string |

## Write some code
| Question | Your answer |
|---|---|
| Write a few lines that open `players.txt` in append mode, write a new name on a new line, and close the file. Type your code. | Type your code here |

## How confident do you feel?
| Question | Your answer |
|---|---|
| Rate your confidence with dictionaries and data files. | [scale 1-5: not yet … very confident] |

## ✅ I can…
- [ ] I can use a dictionary to store key–value pairs
- [ ] I can read from and write to a text file
- [ ] I can read from and write to a CSV file
