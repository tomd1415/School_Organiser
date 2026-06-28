# Signed binary integers

## Today we are learning
- the difference between signed and unsigned integers
- find the most significant and least significant bits
- use sign and magnitude
- use two's complement

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: signed · unsigned · two's complement · sign and magnitude · MSB · LSB. Same routine. Two new methods today — go slowly.

## Starter — recap quiz
- `10011` = 19 in decimal.
- Too big for the bits = **overflow**.

> 🧑‍🏫 Retrieval. Support: tick MSB = left, LSB = right.

## Signed and unsigned
- **Unsigned** integers are always positive — every bit is part of the value.
- **Signed** integers can be positive or negative.
- The **MSB** (left bit) is used for the sign.

> 🧑‍🏫 I-do. MSB = most significant bit = furthest left. LSB = least significant = furthest right.

## Sign and magnitude  (we do)
- First bit = **sign** (1 = negative, 0 = positive).
- The rest = the **size** (magnitude).
- 4-bit `1010` → negative, size 2 → **-2**.

> 🧑‍🏫 We-do. Common slip: counting the sign bit as part of the value. Fix-words: "the first bit is the sign, not a number."

## Two's complement  (we do)
- The MSB now has a **negative** place value (e.g. -8 in 4-bit).
- `1010` = -8 + 2 = **-6**.
- Decimal → binary: write the positive, **flip the bits**, **add 1**.

> 🧑‍🏫 We-do -4: +4 = 0100 → flip 1011 → +1 = 1100. Use the order task on the worksheet for the three steps.

## Your turn  (you do)
- Support: tick sign-bit meaning and the -8 place value.
- Core: convert `10110000` in both methods (-48 and -80).
- Challenge: convert -4 and -5 to 4-bit two's complement.

> 🧑‍🏫 You-do. Likely error: forgetting "add 1" in two's complement. Fix-words: "flip, then add one." TA: prompt, do not do it for them. Screenshot the working.

## I can…
Tick your four "I can…". Show me one number in each method.

> 🧑‍🏫 Plenary. Recap: sign and magnitude uses a sign bit; two's complement makes the MSB negative. Movement break is routine.
