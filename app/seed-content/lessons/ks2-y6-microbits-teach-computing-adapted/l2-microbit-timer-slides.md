# Making a micro:bit timer

## Today we are learning
- a countdown timer counts down, and a loop repeats steps
- we can find and fix bugs (debug)
- we can use true/false (Boolean) and if…else to start and stop the timer

> 🧑‍🏫 Read the four "I can…" aloud, slowly. Words on the board: timer · loop · bug · Boolean · true · false · if…else. Same routine as every lesson. Recap: last lesson we made a counter.

## Starter — why a timer?
- a counter alone is not fair: people take different times
- a timer gives everyone the same amount of time
- a forever loop repeats steps again and again

> 🧑‍🏫 Likely error: "30 goals is the score" — fix-words: "30 goals in HOW LONG?" Support pupils choose why we add a timer on the starter worksheet.

## Find the bug — debug
![A countdown set to 30 but the bar graph only goes up to 10 — a bug]({{res:l2-timer-bug-30.png}})

- a bug is a mistake in the code
- here the start number (30) does not match the graph "up to" number (10)
- fix: make the graph go up to the same number

> 🧑‍🏫 PRIMM: Predict → Run → Investigate. Pupils choose where the bug is (Support) and write the fix (Core). Keep it concrete: "the two numbers must match." Show the fixed code next.

## True or false — Boolean
![Block: set Timer running to true]({{res:l2-boolean-true.png}})

- a Boolean variable is only ever true or false
- Timer running = true → the timer is ON
- Timer running = false → the timer is OFF

> 🧑‍🏫 Use a light switch analogy: on/off, nothing in between. Button A = true (start), button B = false (stop). Challenge: why is true/false clearer than 1/0?

## if…else — choose what to do
![The if … else if blocks for the timer]({{res:l2-if-else.png}})

- if Countdown = 0 → show the finish icon (stop)
- else if Timer running = true → take 1 away, wait, show the graph
- this is selection: the micro:bit chooses what to do

> 🧑‍🏫 Pupils order the timer blocks (Parsons) on the activity worksheet. TA: prompt with "what happens first when the number reaches 0?" Do not order it for them.

## Make and test your timer
![The complete countdown timer with start, stop and reset]({{res:l2-timer-complete.png}})

- button A starts it, button B stops it
- the bar graph shows the time left on the LEDs
- test with the play button, then screenshot it

> 🧑‍🏫 Pupils make the timer and screenshot it (show-your-work + MakeCode link). Likely error: changing the start number but not the graph "up to" number — fix-words: "change BOTH numbers." Next lesson is KS3 Year 7.

## I can…
Tick your four "I can…". Tell me one thing: what can a Boolean variable be?

> 🧑‍🏫 Listen for "true or false". Movement break and end-of-unit recap: counter → timer.
