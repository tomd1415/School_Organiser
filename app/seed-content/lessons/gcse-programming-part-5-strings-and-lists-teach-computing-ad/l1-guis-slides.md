# GUIs with Tkinter

## Today we are learning
- describe what a GUI and event-driven programming are
- build a Tkinter window with widgets
- make a button call a subroutine when clicked
- make an app that adds two numbers

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: GUI · widget · Tkinter · event loop · event-driven · procedural. Same routine every lesson. Everyone has Python (Trinket or Mu) open.

## Starter — two ways to run
- **Procedural**: runs line by line, top to bottom.
- **Event-driven**: waits for the user (a click) before running a block.
- A **GUI** (graphical user interface) is event-driven.

> 🧑‍🏫 Think–pair–share. Support: tick what GUI stands for. Core: name one difference. Challenge: why a GUI needs an event loop.

## What is a GUI?
- A **GUI** lets the user click buttons and type in boxes instead of only the keyboard prompt.
- **Tkinter** is a Python library that builds GUIs.
- A **widget** is a part of the window: Label, Entry (text box), Button.

> 🧑‍🏫 I-do. Show the empty app: `app = tk.Tk()` … `app.mainloop()`. Stress: `app.mainloop()` is ALWAYS the last line — it starts the event loop that waits for clicks.

## We do — build "Add two numbers"
![The "Add two numbers" Tkinter app]({{res:l1-add-two-numbers-app-teach-computing.png}})
- Add the widgets BETWEEN `tk.Tk()` and `app.mainloop()`.
- The Button runs a subroutine: `tk.Button(app, command=add, text="Display")`.

> 🧑‍🏫 We-do. Big idea: write `command=add`, NOT `command=add()` — the brackets would run it straight away. Likely error: app opens but the button does nothing → the subroutine name is misspelled or has `()`. Fix-words: "name the subroutine, no brackets."

## Your turn — make the app  (you do)
- Support: order the `add` subroutine (Parson's puzzle).
- Core: build the five widgets + the button, test it.
- Challenge: make the Joke machine with radio buttons.

> 🧑‍🏫 Pair programming — driver / navigator, swap every 5 minutes. TA: "prompt, do not do it for them." They paste their link + a screenshot. Movement break is routine, not a reward.

## I can…
Tick your four "I can…". Show me your working app.

> 🧑‍🏫 Plenary. Recap: procedural runs in order; event-driven waits for an event. Note who got a button to call a subroutine.
