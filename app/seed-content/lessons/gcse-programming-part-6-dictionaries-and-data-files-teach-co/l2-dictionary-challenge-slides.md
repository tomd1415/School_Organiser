# Caesar cipher

## Today we are learning
- describe what a dictionary and a key–value pair are
- add a new key–value pair to a dictionary
- use a dictionary as a Caesar cipher
- build a Caesar cipher encryption program

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: Caesar cipher · dictionary · key · key–value pair. Same routine. This is a mini-build — take your time.

## Starter — crack the message
```
JCV
```
Shift each letter **back by 2**. What is the secret word?

> 🧑‍🏫 Peer instruction. Answer: HAT (shift each letter back 2: J→H, C→A, V→T). This introduces ciphers. Support: which way the shift goes. Challenge: what happens past Z.

## A dictionary can grow  (I do)
```python
caesar = {}          # empty dictionary
caesar["A"] = "C"    # add a pair
caesar["B"] = "D"
```
A dictionary is **dynamic** — it can grow while the program runs.

> 🧑‍🏫 I-do. Last lesson a dictionary was a fixed record; now show it growing one pair at a time. Each pair is key → value. Predict `print(caesar["A"])`.

## The Caesar cipher plan  (we do)
1. Ask for the key (1–25).
2. Build the cipher dictionary (each letter → its shifted letter).
3. Ask for the message; make it UPPER CASE.
4. Look up each letter to build the encrypted text.
5. Show it.

![Encryption locks a message away, like a safe.]({{res:l2-encryption-a-locked-safe-teach-computing.png}})

> 🧑‍🏫 We-do. Build ONE step, test it, then the next — don't write it all at once. Likely error: a letter past Z (use `chr` and go back 26). Fix-words "if it goes past Z, subtract 26."

## Your turn  (you do)
- Support: order a tiny cipher (Parson's), then encrypt one letter.
- Core: plan the program with the order task.
- Challenge: build the full Caesar cipher program.

> 🧑‍🏫 Independent or pairs — they have enough skill now. Reassure: big build, test as you go. TA: prompt, don't do it for them. Screenshot at the end.

## I can…
Tick your four "I can…". Show me your cipher working.

> 🧑‍🏫 Plenary. Predict `print(chr(67))` (answer: C). Recap: a dictionary stores key→value pairs and can grow; that is what makes a cipher wheel. Movement break is routine.
