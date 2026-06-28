# Making a step counter — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will build my step counter from my design, test it, and fix the shake sensitivity.

## Build your code
Use your design from last lesson to build the step counter in MakeCode.

![The step counter code blocks]({{res:l6-stepcounter-code.png}})

Put the blocks in the right order to build the step counter.

```parsons
on start
set steps to 0
on shake
change steps by 1
on button B pressed
show number steps
if steps < 30 then
show string "Keep it up!"
else
show string "Great!"
```

## Fix the sensitivity
When you test it, the steps may jump up too fast. One shake counts as many steps. We can fix this by only counting a step when the shake is strong enough.

![A block that counts a step only when the shake is strong]({{res:l6-sensitivity-block.png}})

## 🟢 Support
| Question | Choose |
|---|---|
| "Sensitivity" controls… | (  ) how strong a shake must be to count (  ) the screen colour (  ) the volume |

## 🟡 Core
| Question | Choose |
|---|---|
| Your counter goes up too fast. Which check helps fix it? | (  ) acceleration (mg) strength > 1500 (  ) show number count (  ) on start |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| If you make the sensitivity number bigger, what must you do to count a step? | Type your answer here |

## Show your work
Build and test your step counter. Tape the micro:bit and battery pack to your shoe and try it for real.

| Question | Your answer |
|---|---|
| Paste your MakeCode share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I can build my step counter program from my design
- [ ] I can test my program and find and fix bugs
- [ ] I can change the shake sensitivity so it counts better
