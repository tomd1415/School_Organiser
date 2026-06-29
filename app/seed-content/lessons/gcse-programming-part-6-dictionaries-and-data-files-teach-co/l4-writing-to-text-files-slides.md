# Writing to text files

## Today we are learning
- write to a new text file with `"w"` mode
- explain that `"w"` overwrites the whole file
- append to a file with `"a"` mode
- use `\n` to put data on new lines

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: text file · write · append · mode · overwrite. Same routine. Everyone has Python open.

## Starter — predict
```python
file = open("players.txt", "w")
file.write("DinoShark")
print(file.read())
```
What happens when this runs?

> 🧑‍🏫 Peer instruction. Answer: an ERROR — you cannot read a file opened in write mode (and it was not closed). This may surprise them — "an error" is the correct answer. Reinforces: close your files; data saves on close.

## Writing a new file  (I do)
```python
file = open("players.txt", "w")
file.write("DinoShark\nMouseDragon\n")
file.close()
```
- `"w"` makes a new file — and **WIPES** any file with that name.

> 🧑‍🏫 I-do (live-code if you can). Show the folder has no players.txt, run it, show the new file. Show that without `close()` the file stays empty. Then add `\n` for a new line. The original lesson uses a live-coding demo video here — describe it on screen instead (no flashing).

## Appending  (we do)
```python
file = open("players.txt", "a")
file.write("\nDragonShark")
file.close()
```
- `"a"` keeps what is there and adds to the **end**. There is no separate append method — still `write()`.

> 🧑‍🏫 We-do. Card-sort the three modes (r / w / a). Likely error: using `"w"` when they meant `"a"`, wiping their data. Fix-words "w wipes, a adds." Always start the new entry with `\n`.

## Your turn  (you do)
- Support: order the write program (Parson's).
- Core: ask for four names and write them to a file, one per line.
- Challenge: append the latest score to `scores.txt`, keeping the old ones.

> 🧑‍🏫 Pair programming, swap every 5 mins. Likely error: data all on one line → missing `\n`. Fix-words "add a newline between entries." TA: prompt, don't do it for them. Screenshot at the end.

## I can…
Tick your four "I can…". Show me a file your program wrote.

> 🧑‍🏫 Plenary. Recap: w = make/overwrite, a = add to the end, \n = new line, always close. Next lesson: CSV files. Movement break is routine.
