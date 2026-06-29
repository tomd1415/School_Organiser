# Insert, update, delete

## Today we are learning
- describe what a data type is and name common ones
- choose a suitable data type for a field
- write INSERT, UPDATE and DELETE queries
- prove a query worked using SELECT

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary: data type · INTEGER · TEXT · REAL · INSERT · UPDATE · DELETE. Same routine as every lesson.

## Starter — data types
Each field has a data type. Sort the patient fields by type on the starter worksheet.

> 🧑‍🏫 A data type is the same idea as in Python — it sets what kind of value a field can hold.

## Common data types
- SQLite: INTEGER (whole number), TEXT (words), REAL (decimal)
- MySQL: INT, VARCHAR(x) (text up to x letters), FLOAT, DATE, TIME

> 🧑‍🏫 VARCHAR(20) means up to 20 characters. Different database software uses slightly different type names.

## INSERT — add a record
```
INSERT INTO tblMembers (Firstname, Surname)
VALUES ("Nicole", "Battle");
```

> 🧑‍🏫 You only list the fields you are filling. Text needs speech marks. The whole query ends with ONE semicolon. Common misconception: a semicolon after every line.

## UPDATE — change a record
```
UPDATE tblTracks
SET Artist = "Happy Pete"
WHERE Artist = "Angry Pete";
```

> 🧑‍🏫 Always include WHERE. Without it, UPDATE changes every record. Make the deliberate mistake live so they see it.

## DELETE — remove a record
```
DELETE FROM tblDownloads
WHERE MemberID = 41;
```

> 🧑‍🏫 DELETE also needs WHERE, or it empties the table. Remind them other operators (<, >, BETWEEN) work here too.

## Prove it worked — SELECT
After any change, run a SELECT to check it.

```
SELECT * FROM tblMembers WHERE Surname = "Battle";
```

> 🧑‍🏫 This is the habit to build: change the data, then SELECT to prove the change happened.

## Your turn — insert, update, delete
Work through the activity worksheet on your music database. Drag the INSERT lines into order first.

> 🧑‍🏫 Likely error: missing semicolon or missing speech marks round text. Fix-words: "text needs speech marks; one semicolon at the very end." TA: prompt, do not type it for them.

## I can…
Tick your four "I can…". Show me one query that worked.

> 🧑‍🏫 Note who proved their change with a SELECT.
