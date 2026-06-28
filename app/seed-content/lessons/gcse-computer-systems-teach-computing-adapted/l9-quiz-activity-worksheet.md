# Computer systems quiz — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will read a quiz program, work out what it does, then add my own questions and run it.

## Predict — what will this program do?
Read the program first. Do not run it yet.

```
import random
questions = []
file = open("questions.txt", "r")
for line in file:
    line = line.rstrip()
    questions.append(line)
print(questions)
```

| Question | Your answer |
|---|---|
| What do you think this program will do when it runs? | Type your answer here |

## How the questions are stored
The file `questions.txt` holds one question on each line, like this:

```
Which kind of memory is volatile?,RAM
What number system do computers use?,Binary
```

| Question | Your answer |
|---|---|
| What is the divider between the question and the answer on each line? | Type your answer here |

## 🟢 Support
Match each line of code to what it does.

| Line of code | What it does |
|---|---|
| questions = [] | (  ) makes an empty list (  ) opens the file (  ) prints the list |
| file = open("questions.txt", "r") | (  ) makes an empty list (  ) opens the file (  ) prints the list |
| print(questions) | (  ) makes an empty list (  ) opens the file (  ) prints the list |

## 🟡 Core
| Question | Your answer |
|---|---|
| What does the `for line in file:` loop do? | Type your answer here |
| `line.split(",")` splits a line in two. What two parts do you get? | Type your answer here |

## 🔴 Challenge
Add a score to your quiz.

| Question | Your answer |
|---|---|
| Where in the program should you create the score variable, and when should it go up by 1? | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste a link to your quiz program (or write where you saved it) | Type your answer here |
| Show your quiz running with your own questions | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I predicted what a short Python program would do
- [ ] I explained how the quiz reads questions from a file and splits each line
- [ ] I added my own questions and ran the quiz
