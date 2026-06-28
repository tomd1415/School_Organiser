# Swim database task (part 1)

## Today we are learning
- identify the primary and foreign keys
- complete a CREATE TABLE script with the right data types
- write SELECT queries to interrogate the database
- write UPDATE and DELETE queries to maintain it

> 🧑‍🏫 Read the four "I can…" aloud. This lesson brings the whole unit together. Vocabulary: interrogate · CREATE · primary key · foreign key.

## Starter — a database for swimming
![A swimmer in a pool]({{res:l4-swimmer.png}})

A leisure centre needs a database to manage swimming lessons.

> 🧑‍🏫 Set the scene. "Interrogate" means to ask the database questions with SELECT. Hand out the starter — recap keys and one-to-many.

## The swim database
![The three linked tables of the swim database]({{res:l4-swim-database-schema.png}})

- tblCourses and tblMembers are already made
- you will build tblLessons and link it with keys

> 🧑‍🏫 One course has many lessons (one-to-many). LessonID is the primary key; CourseID and MemberID are the foreign keys.

## Build the table — CREATE
- choose the primary key and foreign keys
- give each field the right data type (INTEGER, TEXT…)
- then INSERT the test data

> 🧑‍🏫 The key fields are INTEGER. Support: a printed block-order strip. Remind them to read the error message if a script fails.

## Interrogate — SELECT
Ask the database questions: which courses have more than 6 sessions? Who is on the Seniors course?

> 🧑‍🏫 Encourage them to look back at Lesson 2's operators. Drag the SELECT lines into order on the worksheet first.

## Maintain — UPDATE and DELETE
- move members up a course with UPDATE
- remove members who have left with DELETE
- prove every change with a SELECT

> 🧑‍🏫 Always WHERE. Challenge: move all Ducklings into Dippers and prove it. TA: prompt, do not type it for them.

## Quick check
1. Which field is unique for every row? 2. What links two tables? 3. Which query removes a record?

> 🧑‍🏫 Mini-whiteboards: answers are primary key, the key link (PK↔FK), DELETE. Reveal together.

## I can…
Tick your four "I can…". Show me one query that ran.

> 🧑‍🏫 Reassure them: there is more time next lesson. Note who completed tasks 1–4.
