# Insert, update, delete — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will write SQL to insert, update and delete data, and prove it worked with SELECT.

## The music database
These three tables are linked by their keys. You will change the data inside them.

![The three tables of the music database, linked by keys]({{res:l3-music-database-schema.png}})

## Predict
| Question | Your prediction |
|---|---|
| UPDATE tblTracks SET Artist = "Happy Pete" WHERE Artist = "Angry Pete"; — what will this change? | Type your answer here |

## Build the INSERT query (drag the lines into order)
This query adds two new downloads. Drag the lines into the correct order.

```parsons
INSERT INTO tblDownloads (TrackID, MemberID, Date, Time)
VALUES (2,5,"2020-09-01","14:32"),
(10,19,"2020-09-02","17:46");
```

## 🟢 Support
| Question | Choose |
|---|---|
| Which query ADDS a new record? | (  ) INSERT (  ) UPDATE (  ) DELETE |
| Which query REMOVES a record? | (  ) DELETE (  ) INSERT (  ) SELECT |
| Which query CHANGES data in a record? | (  ) UPDATE (  ) INSERT (  ) DELETE |

## 🟡 Core
Complete the UPDATE query so the artist "Angry Pete" becomes "Happy Pete". Type one word in the gap.

UPDATE tblTracks [[ ]] Artist = "Happy Pete" WHERE Artist = "Angry Pete";

| Question | Type your code here |
|---|---|
| Write an SQL query to INSERT a new member with the firstname "Nicole" and surname "Battle". | Type your code here |

## 🔴 Challenge
| Question | Type your code here |
|---|---|
| Write a DELETE query to remove every download made by MemberID 41, then a SELECT query to prove they are gone. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste one query you wrote | Type your answer here |
| Show your query and its result in DB Browser | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I described what a data type is
- [ ] I chose a suitable data type for a field
- [ ] I wrote INSERT, UPDATE and DELETE queries
- [ ] I proved a query worked using SELECT
