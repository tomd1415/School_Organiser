# SQL searches — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will write SQL to retrieve data using SELECT, FROM, WHERE and ORDER BY.

## The SQL operators
Use this table to help you choose the right operator.

![A list of SQL comparison and logical operators]({{res:l2-sql-operators-teach-computing.png}})

## Sort the operators
Drag each operator into the right group.

```sort
Comparison operator: =, >, <, <>
Logical operator: AND, OR, BETWEEN
```

## Predict
Look at this query on the board, then say what it will return before you run it.

| Question | Your prediction |
|---|---|
| SELECT Title, Artist FROM tblTracks WHERE Genre = "Pop" — what will this show? | Type your answer here |

## Build the query (drag the lines into order)
A SELECT query is written in a set order. Drag the lines into the correct order.

```parsons
SELECT Title, Artist
FROM tblTracks
WHERE Genre = "Pop"
ORDER BY Title ASC;
```

## 🟢 Support
Match each comparison operator to what it means.

| Operator | Meaning |
|---|---|
| = | (  ) equal to (  ) greater than (  ) less than (  ) not equal to |
| > | (  ) equal to (  ) greater than (  ) less than (  ) not equal to |
| < | (  ) equal to (  ) greater than (  ) less than (  ) not equal to |
| <> | (  ) equal to (  ) greater than (  ) less than (  ) not equal to |

## 🟡 Core
Complete the query so it shows every column for all Rock tracks. Type one word in the gap.

SELECT [[ ]] FROM tblTracks WHERE Genre = "Rock";

| Question | Type your code here |
|---|---|
| Write an SQL query to show the Title and Artist of every Soul track. | Type your code here |

## 🔴 Challenge
Here is a worked example that joins three tables. Use it as a guide.

![A worked SQL query that joins three tables]({{res:l2-multi-table-query-teach-computing.png}})

| Question | Type your code here |
|---|---|
| Write an SQL query that retrieves data from MORE THAN ONE table — list the titles of tracks downloaded by the member Percy Winn. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste the SQL query you wrote | Type your answer here |
| Show your results in DB Browser | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I described what SQL is for
- [ ] I retrieved data with SELECT, FROM and WHERE
- [ ] I sorted results with ORDER BY
- [ ] I retrieved data from more than one table
