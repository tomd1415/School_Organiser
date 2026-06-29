# GUIs — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will **build** a Tkinter app with widgets and make a button **call a subroutine** when it is clicked.

## Key words — match each to its meaning
Drag each answer to the right word.

| Word | What it means |
|---|---|
| Widget | (  ) a part of the window you interact with (  ) the library that builds the GUI (  ) the loop that waits for clicks |
| Tkinter | (  ) a part of the window you interact with (  ) the library that builds the GUI (  ) the loop that waits for clicks |
| Event loop | (  ) a part of the window you interact with (  ) the library that builds the GUI (  ) the loop that waits for clicks |

## Procedural or event-driven? — sort the cards
```sort
Procedural: the flow runs in the order it is written, the order of execution is known, the program runs each line in turn
Event-driven: the flow is decided by user actions like button clicks, used to make GUIs, the program waits for an action before running a block
```

## Build — Add two numbers
You will build this app. It has Label, Entry and Button **widgets**.

![The "Add two numbers" Tkinter app]({{res:l1-add-two-numbers-app-teach-computing.png}})

```python
import tkinter as tk
app = tk.Tk()
app.title("Add two numbers")
# widgets go here
app.mainloop()
```

## 🟢 Support — put the subroutine in order
Put the lines of the `add` subroutine in the right order (mind the indents).

```parsons
def add():
    num1 = int(enter_num1.get())
    num2 = int(enter_num2.get())
    result = num1 + num2
    display_answer.config(text=str(result))
```

## 🟡 Core
| Question | Your answer |
|---|---|
| The Button is made with `tk.Button(app, command=add, text="Display")`. Why do we write `command=add` and **not** `command=add()`? | Type your answer here |
| Which line must always be **last** in a Tkinter program? | (  ) app.mainloop() (  ) app = tk.Tk() (  ) label.pack() |

## 🔴 Challenge — make the Joke machine
![The Joke machine app with radio buttons]({{res:l1-joke-machine-app-teach-computing.png}})

Build an app with **radio buttons** for jokes. The button calls a `jokes()` subroutine that shows the joke for the chosen option.

| Question | Your answer |
|---|---|
| Type the `jokes()` subroutine for at least two jokes. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Trinket / IDE share link here | Type your answer here |
| Show your finished app | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I described what a GUI and event-driven programming are
- [ ] I built a Tkinter window with widgets
- [ ] I made a button call a subroutine when clicked
- [ ] I made an app that adds two numbers
