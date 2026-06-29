# Introduction to CSS

## Today we are learning
- describe what CSS is and why we use it
- write a CSS rule (selector, property, value)
- link a page to an external stylesheet

> 🧑‍🏫 Read the three "I can…" aloud. Vocabulary on board: CSS · style sheet · selector · property · value.

## Starter — predict
What would this code do to a web page? Discuss with the person next to you.

> 🧑‍🏫 Do NOT reveal the answer yet — they test it in a moment. Collect a few predictions.

## What is CSS?  (I do)
![One set of styles applied to three web pages at once]({{res:l4-one-style-many-pages-teach-computing.png}})

CSS sets the look — colours, fonts, sizes. One stylesheet can style every page at once.

> 🧑‍🏫 The magazine reader of styles. The big idea: write the style once, every matching tag updates.

## The shape of a CSS rule  (we do)
`h1 { color: red; }` — `h1` is the **selector**, `color` is the **property**, `red` is the **value**.

> 🧑‍🏫 Point to each part by name. The rule lives inside the curly brackets `{ }` and each line ends with a semicolon.

## An external stylesheet
Better to keep CSS in its own file, e.g. `styles.css`, and link it from the HTML head.

> 🧑‍🏫 Live demo the `<link rel="stylesheet" href="styles.css">` line. Name the file exactly `styles.css` to match the example.

## Your turn — style your page  (you do)
Make `styles.css`, link it, then change a background colour and a font.

> 🧑‍🏫 Support: copy the example rule and change one value. Core: add two rules. Challenge: style several tags. Likely error: forgetting the semicolon or the closing `}` → "every rule ends with ; and closes with }". Paste CSS + screenshot on the worksheet.

## I can…
Tick your three "I can…". Show me your styled page.

> 🧑‍🏫 Note who linked an external file rather than styling inline.
