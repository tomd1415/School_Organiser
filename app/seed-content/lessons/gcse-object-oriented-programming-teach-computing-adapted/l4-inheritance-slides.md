# Inheritance

## Today we are learning
- explain what inheritance is
- use the words superclass and subclass
- choose where an attribute belongs
- create a subclass

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary: inheritance · superclass · subclass · super.

## Starter — spot the OOP parts
Find the class, the object, a method and an attribute in the code on the board.

> 🧑‍🏫 On the starter worksheet. Answers: class is imported and used like a function; the object is what the constructor makes.

## Inheritance — one class based on another
A **Pet** is a kind of **Animal**. Pet is based on Animal.
- Animal = superclass (parent)
- Pet = subclass (child)

> 🧑‍🏫 The subclass inherits Animal's attributes and methods, then adds its own. Arrows in an inheritance diagram point UP to the parent.

## Two objects, one class
`Dave` and `Brian` are two objects made from the same class.
A subclass lets us make new KINDS of object.

![Two monsters made from the same class — Dave and Brian]({{res:l4-two-objects-from-one-class.png}})

> 🧑‍🏫 Reinforce instance vs class. Then: where should an attribute live? Highest class that fits — species in Animal, breed in Pet.

## Live coding — the Friend subclass  (I do)
`class Friend(Monster):` then `super().__init__(...)` to set up the inherited parts.

![One monster object]({{res:l4-one-object.png}})

> 🧑‍🏫 Live-code the Friend subclass step by step (the unit's "Activity 2 — Live coding" demo). Pupils make notes on the worksheet. Likely error: forgetting `super().__init__()` → the inherited attributes are missing.

## Your turn — the Enemy subclass  (you do)
Plan, then build an `Enemy` subclass with a `weakness` and a `fight` method.

> 🧑‍🏫 Support: use the Friend class as a template. Challenge: write the fight logic. They paste their link + a screenshot on the activity worksheet.

## I can…
Tick your four "I can…". Tell me which is the superclass and which is the subclass.

> 🧑‍🏫 Note who built a working subclass with super(). Movement break.
