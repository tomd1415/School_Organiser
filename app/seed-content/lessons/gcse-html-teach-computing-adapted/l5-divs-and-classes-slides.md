# DIVs and classes

## Today we are learning
- describe what a `<div>` is used for
- give a `<div>` a class
- use a class in CSS to style a section

> 🧑‍🏫 Read the three "I can…" aloud. Vocabulary on board: div · class · style · nesting.

## Starter — explore the code
![HTML showing a div with a class, holding a heading]({{res:l5-div-code-teach-computing.png}})

What is the relationship between the HTML and the CSS? Answer on the starter worksheet.

> 🧑‍🏫 Recall from L4: the HTML links to a stylesheet. Today we target sections, not whole tags.

## What is a div?  (I do)
A `<div>` groups part of a page into a meaningful **section**, so you can style that section on its own.

> 🧑‍🏫 Compare to drawing boxes around parts of a newspaper. A div by itself is invisible — the class lets CSS find it.

## Classes  (we do)
![Two div sections styled as blue boxes, with the code beside the output]({{res:l5-divs-code-output-teach-computing.png}})

Add `class="favourite"` to a div. In CSS, style it with `.favourite { ... }`. Every div with that class matches.

> 🧑‍🏫 Note the full stop before the class name in CSS. Both boxes share the class, so both look the same.

## Nesting — a div inside a div
You can put a div inside another div to style a part within a section.

> 🧑‍🏫 Keep it light — one level of nesting is plenty for now.

## Your turn — make and style a section  (you do)
Wrap part of your page in a `<div class="...">` and style that class in your CSS file.

> 🧑‍🏫 Support: copy a class and change one value. Core: add a styled section. Challenge: nest a div. Likely error: missing the full stop in the CSS rule → "a class rule starts with a full stop, like `.header`".

## I can…
Tick your three "I can…". Show me a section you styled with a class.

> 🧑‍🏫 Note who used a class in both the HTML and the CSS.
