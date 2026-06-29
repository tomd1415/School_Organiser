# Hexadecimal

## Today we are learning
- why and where hexadecimal is used
- convert between hexadecimal and decimal
- convert between hexadecimal and binary
- the fast nibble method

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: hexadecimal · base 16 · nibble · byte. Same routine.

## Starter — recap signed integers
- Sign and magnitude `10110000` = -48.
- Two's complement -5 = `1011`.

> 🧑‍🏫 Retrieval from last lesson. Support: tick base-16 and A = 10.

## What is hexadecimal?
- **Base-16**: digits 0–9, then **A B C D E F** for 10–15.
- One hex digit replaces **4 bits** (a **nibble**); two replace a **byte**.
- It is a short, tidy way to write long binary.

> 🧑‍🏫 I-do. Say "five, three" for 53, not "fifty-three." A is ten, F is fifteen.

## Where you see it
- Colour codes (e.g. #FF0000 is red).
- Network **MAC addresses**.
- Memory **dumps**.

![A MAC address in hexadecimal]({{res:l7-mac-address-in-hexadecimal-teach-computing.png}})

![A memory dump in hexadecimal]({{res:l7-hexadecimal-memory-dump-teach-computing.png}})

> 🧑‍🏫 Real-world hook: these are everywhere in computing. Point out the A–F letters in the addresses.

## The nibble method  (we do)
- Split the hex into its two digits.
- Turn each into a **4-bit nibble**.
- Join into 8 bits, then add the place values.
- `A2` → `1010 0010` → 128 + 32 + 2 = **162**.

> 🧑‍🏫 We-do. Use the order task on the worksheet for the steps. Common slip: forgetting A = 1010. Fix-words: "A is ten, ten is 1010."

## Your turn  (you do)
- Support: tick A = 10 and one digit = 4 bits.
- Core: `A1` = 161, `B3` = 179, 11 → B.
- Challenge: `9D` = 157; 255 → FF.

> 🧑‍🏫 You-do. Sort-the-facts card task fixes the three bases. TA: prompt, do not do it for them. Screenshot the working.

## I can…
Tick your four "I can…". Show me one hex conversion.

> 🧑‍🏫 Plenary "quiz of everything so far" — one quick question per earlier lesson. Movement break is routine.
