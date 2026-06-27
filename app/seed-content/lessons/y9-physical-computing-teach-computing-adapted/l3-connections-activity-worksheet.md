# Connections — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will use the **pins** to connect the micro:bit to other parts, and use the **radio** to send messages between two micro:bits.

## Predict
This program checks for a radio message and shows a heart when one arrives. Read it before you run it.

`from microbit import *`
`import radio`
`radio.on()`
`while True:`
`    message = radio.receive()`
`    if message == "ping":`
`        display.show(Image.HEART)`

| Question | Your prediction |
|---|---|
| What will the micro:bit do when it receives a "ping" message? | Type your answer here |

## Sort it — pins for input or output?
Drag each use of the pins into the right group.

```sort
Output (the micro:bit sends out): light an LED, play a melody through a speaker
Input (the micro:bit reads in): read a makeshift switch, detect a touch on a pin
```

## Order matters — "pass the love"
This radio program sends a message when the board is shaken, and shows a heart when a message arrives. Drag the lines into the right order.

```parsons
from microbit import *
import radio
radio.on()
while True:
    if accelerometer.was_gesture("shake"):
        radio.send("pass")
    if radio.receive() == "pass":
        display.show(Image.HEART)
```

## 🟢 Support
Fill each gap. Word bank: **read_digital**, **3V**

| Question | Your answer |
|---|---|
| The pin that gives power is labelled [[ ]]. | Type your answer here |
| To read whether a switch is on or off we use pin1.[[ ]](). | Type your answer here |

## 🟡 Core
| Question | Your answer |
|---|---|
| What does `radio.config(group=...)` do, and why does each pair need their own group number? | Type your answer here |
| Radio messages can only be **text**. What must you do before sending a number? | Type your answer here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Two micro:bits run the same program. Explain how a shake on one makes a heart appear on the other. | Type your answer here |

## Show your work
| Question | Your answer |
|---|---|
| Paste a link to your saved program here | Type your answer here |
| Show your finished circuit or program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I used a pin to send output (an LED or a speaker)
- [ ] I used a pin to read input (a switch or touch)
- [ ] I sent and received a message by radio
- [ ] I explained why a circuit must be closed for current to flow
