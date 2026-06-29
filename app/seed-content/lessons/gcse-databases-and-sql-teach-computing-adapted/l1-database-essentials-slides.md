# Database essentials

## Today we are learning
- describe what a database is
- name the parts: table, record, field, primary key, foreign key
- describe a flat file database
- describe a relational database

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: database · table · record · field · primary key · foreign key. Same routine as every lesson.

## Starter — how is data stored?
![DVLA vehicle details]({{res:l1-dvla-vehicle-details-teach-computing.png}})

The DVLA keeps data on every UK vehicle. How is it stored?

> 🧑‍🏫 The DVLA has about 37.9 million vehicles on record. Use this to introduce the words database, record and field.

## The parts of a table
![A music database table]({{res:l1-music-table-key-terms-teach-computing.png}})

- a FIELD is a column (one kind of data)
- a RECORD is a row (all the data about one track)
- a TABLE holds the records

> 🧑‍🏫 Point at A = the table, B = the fields, C = a record. This matches the label task on the starter worksheet.

## Primary key
- a PRIMARY KEY is a field with a unique value for every record
- TrackID is the primary key of tblTracks

> 🧑‍🏫 Unique means no two are the same. Common misconception: "a table is a database" — a table sits INSIDE a database file.

## Flat file vs relational
- a FLAT FILE database has ONE table — data gets repeated
- a RELATIONAL database has MANY tables, linked by keys
- link the primary key to a foreign key to remove repeats

> 🧑‍🏫 Show the inefficient flat file (Sara Bibi repeated). Name the problems: data redundancy and data inconsistency.

## Watch — using the database software
*(teacher demo video — play it live; not embedded, to keep the repo light)*

> 🧑‍🏫 Teacher-played hook: a short clip of opening dbMusic.db and viewing the three tables. This clip has motion and sound — play it only if it suits the class.

## Your turn — explore dbMusic.db
![The Database Structure tab in DB Browser]({{res:l1-db-browser-structure-teach-computing.png}})

Open your COPY of dbMusic.db. Find the tables, records and fields.

> 🧑‍🏫 Stress: open a COPY, not the shared file. Support: pair them up. They screenshot the structure onto the activity worksheet. TA: prompt, do not do it for them.

## I can…
Tick your four "I can…". Show me a part of a table on your screen.

> 🧑‍🏫 Note who can name table, record, field and primary key.
