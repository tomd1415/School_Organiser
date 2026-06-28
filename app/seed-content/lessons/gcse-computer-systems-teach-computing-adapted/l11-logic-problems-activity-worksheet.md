# Logic problems — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will solve logic problems that need more than one gate: a circuit, a truth table and a Boolean expression.

## The method
Put the steps for solving a logic problem in the right order.

```order
Identify the inputs in the word problem
Identify the output
Identify the logic gates needed (AND, OR, NOT)
Draw the logic circuit
Build the truth table, counting the inputs in binary order
Write the Boolean expression
```

## Worked example — the camera
"A picture is taken if the motion sensor OR the proximity sensor activates, AND the light is on."

The inputs are motion, proximity and light. The output is picture.

Fill in the Boolean expression for this circuit.

Picture = (motion [[OR]] proximity) [[AND]] light

## Check a row of the truth table
For the camera circuit above, tick the output.

| Question | Choose one |
|---|---|
| motion = 1, proximity = 0, light = 1 → picture = ? | (  ) 1 (  ) 0 |
| motion = 0, proximity = 0, light = 1 → picture = ? | (  ) 0 (  ) 1 |
| motion = 1, proximity = 1, light = 0 → picture = ? | (  ) 0 (  ) 1 |

## 🟢 Support
| Question | Choose one |
|---|---|
| In the sentence above, which is the OUTPUT? | (  ) picture (  ) motion (  ) light |
| How many inputs does this circuit have? | (  ) 3 (  ) 2 (  ) 1 |

## 🟡 Core
| Question | Your answer |
|---|---|
| Why are brackets used in (motion OR proximity) AND light? | Type your answer here |

## 🔴 Challenge
"The warning siren sounds if the pressure is too high AND the valve is NOT open, OR the temperature is too high."

Fill in the Boolean expression.

Siren = (pressure [[AND]] [[NOT]] valve) [[OR]] temperature

## Hardware — gates do maths
![A circuit board built from logic chips]({{res:l11-logic-chips.png}})

Joining logic gates together lets a computer ADD binary numbers. A part that adds two bits is called a half adder — it is just gates joined up.

## Show your work
Build one of the circuits in a logic simulator (for example logic.ly or CircuitVerse).

| Question | Your answer |
|---|---|
| Paste a link to your circuit, or write where you saved it | Type your answer here |
| Show your finished three-input circuit | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I completed a truth table for a three-input circuit
- [ ] I wrote a Boolean expression for a logic circuit
- [ ] I described how logic gates combine to add binary numbers
