# Build it up — starter worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## Starter — wait for the button
Most programs loop forever with `while True`. Sometimes you want a loop that **waits for one event and then stops**. This program waits for button A, shows a tick, then ends. Drag the lines into the right order.

```parsons
flag = False
while flag == False:
    if button_a.was_pressed():
        flag = True
display.show(Image.YES)
```

## 🟢 Support
| Question | Choose one |
|---|---|
| The loop keeps going while `flag` is… | (  ) False (  ) True |

## 🟡 Core
| Question | Your answer |
|---|---|
| What makes the loop stop? | Type your answer here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Why might "wait, then stop" be more useful than `while True` for starting a game? | Type your answer here |
