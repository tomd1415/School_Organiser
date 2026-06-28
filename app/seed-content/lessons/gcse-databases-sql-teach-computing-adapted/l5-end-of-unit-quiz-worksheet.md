# End-of-unit quiz — databases and SQL

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will answer exam-style questions to show what I have learned about databases and SQL.

## The data
A speed camera on a motorway records the car registration and its speed. The data is stored in a flat file database called **tblSpeeds**.

| CaptureID | Registered_owner | Car_reg | Speed |
|---|---|---|---|
| 1 | Sara Bibi | JN03HNM | 83 |
| 2 | Danny Judd | YM15PTO | 70 |
| 3 | Cara Lichfield | LG01KZK | 75 |
| 4 | Abeni Barmore | UT02SKK | 68 |
| 5 | Baki Kaatz | XB18NVA | 67 |
| 6 | Cara Lichfield | LG01KZK | 72 |

## Questions — part 1
Read each question carefully. Some are worth more than one mark.

| Question | Your answer |
|---|---|
| Q1 [1]. Which field is the most suitable primary key? | (  ) CaptureID (  ) Registered_owner (  ) Car_reg (  ) Speed |
| Q2 [1]. Justify your answer to Q1. | Type your answer here |
| Q3 [1]. What is the most suitable data type for Car_reg? | (  ) TEXT (  ) INTEGER (  ) REAL (  ) NULL |
| Q4 [1]. What is the most suitable data type for Speed? | (  ) TEXT (  ) INTEGER (  ) REAL (  ) NULL |
| Q5 [2]. Describe one problem that can arise from a flat file database. | Type your answer here |
| Q6 [1]. Write the exact output of: SELECT Registered_owner FROM tblSpeeds WHERE Speed > 75; | Type your answer here |

## Questions — part 2 (write SQL)
Write the SQL query for each task.

| Question | Type your code here |
|---|---|
| Q7 [3]. Write a query to show ALL fields for drivers recorded travelling between 71 and 80. | Type your code here |
| Q8 [4]. Write a query to INSERT this new record: Allen Heard, CM20YGD, 70. | Type your code here |
| Q9 [3]. Vehicle YM15PTO has a new owner. UPDATE the Registered_owner for that vehicle to "Asif Shah". | Type your code here |
| Q10 [2]. CaptureID 6 was recorded with a faulty camera. Write a query to DELETE that record. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste one query you tested in DB Browser | Type your answer here |
| Show your finished swim database or a tested query | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I read an SQL query and predicted what it does
- [ ] I finished and tested the swim database
- [ ] I answered exam-style questions on databases and SQL
