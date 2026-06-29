# Writing to text files — starter worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will **write** to a new text file and **append** to an existing one.

## Starter — predict this program
```python
file = open("players.txt", "w")
file.write("DinoShark")
print(file.read())
```

| Question | Your prediction |
|---|---|
| What do you think happens when this runs? (Tip: the file was opened in WRITE mode, and it has not been closed.) | Type your answer here |

## 🟢 Support
| Question | Choose |
|---|---|
| You should always do this when you finish with a file: | (  ) close it (  ) delete it (  ) print it |
| The data only really saves to the file when you… | (  ) close the file (  ) open the file (  ) read the file |

## 🟡 Core
| Question | Your answer |
|---|---|
| Why can you not `read` a file that you opened in `"w"` (write) mode? | Type your answer here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Why is it important to **close** a file after you have written to it? | Type your answer here |
