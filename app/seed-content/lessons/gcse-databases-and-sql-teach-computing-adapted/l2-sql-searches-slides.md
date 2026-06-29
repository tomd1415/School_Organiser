# SQL searches

## Today we are learning
- describe what SQL is for
- retrieve data with SELECT, FROM and WHERE
- sort results with ORDER BY
- retrieve data from more than one table

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary: SQL · SELECT · FROM · WHERE · ORDER BY · operator. This builds straight on last lesson's key terms.

## Starter — remember the words
Fill in the database words on the starter worksheet.

> 🧑‍🏫 Quick recap of database, table, primary key, foreign key from Lesson 1 before any SQL.

## What is SQL?
- SQL stands for Structured Query Language
- it is how we talk to a database
- SELECT = which columns, FROM = which table, WHERE = the condition

> 🧑‍🏫 Keep it to these three words first. The `*` wildcard means "all columns".

## A first query
```
SELECT Title, Artist
FROM tblTracks
WHERE Genre = "Pop"
```

> 🧑‍🏫 Read it line by line. Then live-code it in DB Browser and show the rows that come back.

## Watch — live coding a search
*(teacher demo video — play it live; not embedded, to keep the repo light)*

> 🧑‍🏫 Teacher-played hook: a recorded live-coding demo of a SELECT search. Motion and sound — play only if it suits the class.

## Sort the results — ORDER BY
- `ORDER BY Surname ASC` sorts A → Z
- `ORDER BY Surname DESC` sorts Z → A

> 🧑‍🏫 Change only ASC/DESC and re-run so pupils see the order flip.

## More than one table
![A book shop relational database with two tables]({{res:l2-book-shop-relational-database-teach-computing.png}})

- name the columns in SELECT
- list the tables in FROM
- link the primary key to the foreign key in WHERE

> 🧑‍🏫 Point at SupplierID — it is the primary key in tblSupplier and the foreign key in tblBooks. That link joins the tables.

## Watch — joining tables
*(teacher demo video — play it live; not embedded, to keep the repo light)*

> 🧑‍🏫 Teacher-played hook: live coding a query across two tables. Motion and sound.

## Your turn — write SQL searches
Work through the activity worksheet. Support: match the operators. Challenge: join two tables.

> 🧑‍🏫 Likely error: missing speech marks or a spelling that does not match the data. Fix-words: "match the spelling in the table exactly." TA: prompt, do not type it for them.

## I can…
Tick your four "I can…". Show me a query that worked.

> 🧑‍🏫 Note who retrieved data from more than one table.
