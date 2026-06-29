# Creating a class

## Today we are learning
- create a class and a constructor
- explain what `self` does
- add getters and setters
- create a method on a class

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary: class · constructor · attribute · method · getter · setter · self.

## Starter — plan your monster (Monster Quest)
Every monster needs: name, health, dialogue.
Every monster can: take damage, speak.

![A monster from the game]({{res:l3-monster-quest-slime.png}})

> 🧑‍🏫 On the starter worksheet: sort the parts into attributes vs methods, and choose data types. Plan before coding to lower the load.

## Worked example — the Pet class
Copy the PATTERN from last lesson, change the words.

```
class Pet(object):
    def __init__(self, name, species, description):
        self.name = name
```

> 🧑‍🏫 I-do: show the Pet class on the board. The Monster class is the same shape with different attributes.

## Your turn — the Monster class  (you do)
Make a file `monster.py`. Write the class and constructor only — no methods yet.

![A monster from the game]({{res:l3-monster-quest-enemy.png}})

> 🧑‍🏫 One small piece at a time. Circulate. Support: "change THIS word" card. Likely error: forgetting `self` on each attribute.

## Why self?
`self` means "this object". It lets an object store and read its own data.

> 🧑‍🏫 Show a version WITHOUT self and ask what is wrong. Relate to conventions: you use `self` every time.

## Getters, setters and methods
Add `get_` and `set_` for each attribute, then `take_damage` and `speak`.

> 🧑‍🏫 Pairs follow the Pet pattern. Challenge: finish both methods. They paste their link + a screenshot on the activity worksheet.

## I can…
Tick your four "I can…". Show me your Monster taking damage.

> 🧑‍🏫 Note who built a working constructor + one method. Movement break.
