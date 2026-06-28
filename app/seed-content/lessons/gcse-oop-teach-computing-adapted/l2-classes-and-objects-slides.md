# Classes and objects

## Today we are learning
- how a class and an object are related
- what attributes and methods are
- how a constructor makes an object
- how to get and set an attribute

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary: class · object · attribute · method · constructor · getter · setter.

## Starter — what is an animal?
What is true of ALL animals? What is true of only SOME?

> 🧑‍🏫 Push for the narrow list true of every animal. This is the idea of a class: it only holds what every object shares.

## Objects share attributes
All cars have a make and model — but not the same make and model.
All houses have rooms — but not the same number.

![A car — an object with attributes]({{res:l2-car-object.png}})
![A house — another object with attributes]({{res:l2-house-object.png}})

> 🧑‍🏫 Attributes = the data each object holds. Two cars share the attribute "make" but have different values.

## A class is a blueprint
[▶ Play the "knowledge of objects" video]({{res:l2-objects-video.mp4}})

A class is the template. Objects are made from it.

> 🧑‍🏫 Teacher-played hook (it has motion and sound — your choice). Then: a class is the cookie cutter, objects are the cookies.

## The constructor — making a cat
`self.name = name` stores the name on THIS object.
`my_cat = Pet("Fluffy", "Cat", "Black and white.")` builds one cat.

![A cartoon cat — our example object]({{res:l2-cat-object.png}})

> 🧑‍🏫 Live-code / pair-program the Pet class and mypet.py. The program shows no output yet — the object exists in memory. Likely error: forgetting `self`.

## Getters and setters  (you do)
A **getter** reads an attribute (`get_name`).
A **setter** changes an attribute (`set_name`).

> 🧑‍🏫 Support: pre-written get method to match. Challenge: add a `describe()` method that calls the getters. Pairs paste their link + a screenshot on the activity worksheet.

## I can…
Tick your four "I can…". Show me your Pet object.

> 🧑‍🏫 Note pairs who got a getter and a setter working. Movement break.
