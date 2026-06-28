# Assembly language II

## Today we are learning
- translate a Python program into LMC assembly on my own
- use branching (BRP, BRA) to make a decision in assembly
- design and write my own assembly program

> 🧑‍🏫 Read the "I can…" aloud. Vocabulary on the board: assembly language · accumulator · branch · BRP · BRA. Same routine as every lesson. This is the last lesson of the unit.

## Starter — you are the translator now
- translate a short Python program into assembly on your own
- it inputs a max and two numbers, adds, and outputs if bigger

> 🧑‍🏫 Independent translation on the starter worksheet. This checks confidence with the commands before the project. Then show the colour-coded answer and take questions.

## Branching makes decisions
![An LMC program that uses branching]({{res:l13-lmc-branching.png}})
- SUB then BRP: if the result is positive, jump to one path
- BRA: jump no matter what (used to skip an empty path)

> 🧑‍🏫 Pay attention to the "no else" case: one branch is empty, so BRA skips the output. This is new and can confuse — model it slowly.

## Three rules to remember
- all data goes into the accumulator unless you STA it
- ADD and SUB act on the accumulator
- branches let you skip parts that do not apply

> 🧑‍🏫 Reiterate these before the project. They are the toolbox for getting unstuck.

## Final project — you do
- input three numbers
- add the first two
- if the total is bigger than the third, output the total; else output the third

> 🧑‍🏫 Plan in Python first, then translate to assembly. Use the toolbox and the LMC. TA: prompt with the toolbox and earlier examples, do not write it for them. Every pupil should finish on a success.

## Show your work
- type it into the LMC and test it
- screenshot your working program

> 🧑‍🏫 Pupils screenshot the running program. Then the summative assessment under exam conditions.

## I can…
Tick your "I can…". Tell a partner what BRP does.

> 🧑‍🏫 Round up the unit: components → how the CPU runs instructions → high- and low-level languages → you wrote your own assembly program. Well done.
