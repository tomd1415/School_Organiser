# Swim database — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will build, interrogate and update the swim database using everything from this unit.

## The data so far
This is the tblCourses table open in DB Browser. You will work with data like this.

![The tblCourses table open in DB Browser]({{res:l4-tblcourses-in-db-browser-teach-computing.png}})

## Plan the job (drag the steps into order)
Put the steps of the swim challenge into a sensible order.

```order
Work out the primary key and the foreign keys for the new table
Complete the CREATE TABLE script with the right data types
Run an INSERT query to add the test data
Use SELECT to interrogate the data
Use UPDATE and DELETE to maintain the data
```

## Build the SELECT (drag the lines into order)
This query finds the member on the Seniors course across three tables. Drag the lines into order.

```parsons
SELECT tblMembers.Firstname, tblMembers.Surname
FROM tblMembers, tblCourses, tblLessons
WHERE tblMembers.MemberID = tblLessons.MemberID
AND tblCourses.CourseID = tblLessons.CourseID
AND tblCourses.Level = "Seniors";
```

## 🟢 Support
In the CREATE TABLE script, LessonID, CourseID and MemberID all use the same data type. Type it in the gap.

The data type for all three key fields is [[ ]].

| Question | Choose |
|---|---|
| Which query finds data WITHOUT changing it? | (  ) SELECT (  ) DELETE (  ) UPDATE |

## 🟡 Core
| Question | Type your code here |
|---|---|
| Write a SELECT query that shows the Level and Sessions of every course with more than 6 sessions. | Type your code here |

## 🔴 Challenge
| Question | Type your code here |
|---|---|
| All Ducklings (CourseID 1) have passed and move up to Dippers (CourseID 2). Write an UPDATE to move them, then a SELECT to prove it worked. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste one SQL script you wrote | Type your answer here |
| Show your script and its result in DB Browser | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I identified the primary and foreign keys
- [ ] I completed a CREATE TABLE script with the right data types
- [ ] I wrote SELECT queries to interrogate the database
- [ ] I wrote UPDATE and DELETE queries to maintain it
