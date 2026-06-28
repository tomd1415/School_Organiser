# Inheritance — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
**Inheritance** means basing one class on another.
The class you start from is the **superclass** (parent).
The new class based on it is the **subclass** (child). The subclass **inherits** the attributes and methods of the superclass.

![Two monsters made from the same class — Dave and Brian]({{res:l4-two-instances.png}})

## Match the words
Drag each word to its meaning.

| Word | What it means |
|---|---|
| Superclass | (  ) the parent class others are based on (  ) the child class based on another (  ) basing one class on another |
| Subclass | (  ) the parent class others are based on (  ) the child class based on another (  ) basing one class on another |
| Inheritance | (  ) the parent class others are based on (  ) the child class based on another (  ) basing one class on another |

## Where does each attribute belong?
Classes: **Animal** → **Pet** → **Cat / Dog**. Put each attribute in the **highest** class it fits.

```sort
Animal (all animals have it): species, number_of_legs
Pet (only pets need it): breed, owner_name
```

> Tip: declare an attribute as high as you can, so the classes below inherit it.

## Build the subclass
A subclass calls `super().__init__(...)` to set up the inherited attributes first. Drag the lines into order.

```parsons
class Friend(Monster):
    def __init__(self, name, health, speech, gift):
        super().__init__(name, health, speech)
        self.gift = gift
```

## Fill the gap
The line that runs the superclass constructor is `super().[[ ]](name, health, speech)`.

## 🟢 Support
| Question | Choose |
|---|---|
| The parent class is the… | (  ) superclass (  ) subclass (  ) method |
| A subclass gets the attributes and methods of its parent. This is called… | (  ) inheritance (  ) deletion (  ) printing |

> Tip: super = above. The superclass is above the subclass.

## 🟡 Core
| Question | Your answer |
|---|---|
| In your own words, what is inheritance? | Type your answer here |
| The `Friend` class is a subclass of `Monster`. What does it inherit? | Type your answer here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Why is `super().__init__(...)` used in a subclass constructor? | Type your answer here |
| You are adding an `Enemy` subclass. It needs a `weakness` attribute and a `fight` method. Which parts come from `Monster`, and which are new? | Type your answer here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Enemy subclass link (repl.it or similar) here | Type your answer here |
| Show your subclass running | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I can explain what inheritance is
- [ ] I can use the words superclass and subclass correctly
- [ ] I can choose where an attribute belongs
- [ ] I can create a subclass
