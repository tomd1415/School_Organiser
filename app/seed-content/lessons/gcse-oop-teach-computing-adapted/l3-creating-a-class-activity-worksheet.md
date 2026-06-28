# Creating a class — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
You will build the **Monster** class from scratch, using the **Pet** class from last lesson as your worked example.

![A monster from the game]({{res:l3-monster-enemy.png}})

This is the Pet class to copy the pattern from:

```
class Pet(object):
    def __init__(self, name, species, description):
        self.name = name
        self.species = species
        self.description = description
```

## Build the constructor
Drag the lines into the right order to make the start of the Monster class.

```parsons
class Monster(object):
    def __init__(self, name, health, speech):
        self.name = name
        self.health = health
        self.speech = speech
```

## Why self?
Inside the constructor, every attribute is stored on the object with `self`.

The line that stores health on the object is `self.health = [[ ]]`.

## 🟢 Support
| Question | Choose |
|---|---|
| The keyword that means "this object" is… | (  ) self (  ) name (  ) print |
| A getter method for health would be called… | (  ) get_health (  ) delete_health (  ) health! |

> Tip: copy the Pet pattern and change the words "Pet" → "Monster" and the attribute names.

## 🟡 Core
| Question | Your answer |
|---|---|
| What does `self` let an object do? | Type your answer here |
| What is the difference between a getter and a setter? | Type your answer here |

## 🔴 Challenge
Drag the lines into the right order to make the `take_damage` method.

```parsons
def take_damage(self, damage):
    self.health = self.health - damage
    print(self.health)
```

| Question | Your answer |
|---|---|
| The `speak` method should print the name and then the line of dialogue. Why is `self` needed inside it? | Type your answer here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your monster.py link (repl.it or similar) here | Type your answer here |
| Show your Monster object running | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I can create a class and a constructor
- [ ] I can explain what `self` does
- [ ] I can add getters and setters
- [ ] I can create a method on a class
