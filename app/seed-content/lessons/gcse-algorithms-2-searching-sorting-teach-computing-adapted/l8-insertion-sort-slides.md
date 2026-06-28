# Insertion sort

## Today we are learning
- insert an item into the right place in an ordered list
- describe how an insertion sort works
- carry out a full insertion sort

> 🧑‍🏫 Read the "I can…" aloud. Vocabulary on board: insertion sort · sorted sublist · unsorted sublist · insert. Check your exam board: some do not require insertion sort.

## Starter — a hand of cards
![A hand holding playing cards arranged in order]({{res:l8-hand-of-cards-teach-computing.png}})

How do you sort a hand of cards? Where does a new book go on an ordered shelf?

> 🧑‍🏫 They naturally describe an insertion sort — slot each card into place. They would NOT bubble-sort a bookshelf.

## Inserting one item  (I do)
![Inserting a card: bigger sorted cards slide right to make a gap for the new card]({{res:l8-insert-a-card-teach-computing.png}})

Slide the bigger sorted items to the right, then drop the new item into the gap.

> 🧑‍🏫 Key idea learners find hard: each bigger item is COPIED one place right. The value being inserted is held in a variable so it is not lost. This matches the code next lesson.

## Sorted part and unsorted part  (we do)
The list has a sorted part (at the start) and an unsorted part. Each pass moves one item across.

> 🧑‍🏫 At the start, the sorted part is just the first item. A pass ends at the start of the list, or when the item is not smaller than the one before it.

## Your turn — full insertion sort  (you do)
Insert each item in turn until the whole list is sorted. Shade the sorted part each pass.

> 🧑‍🏫 Support: order-the-steps + sort-the-facts. Core: why use a variable. Challenge: the two pass-end conditions. Likely error: doing a bubble sort instead — fix-words "find the gap and slide, do not just swap neighbours."

## I can…
Tick your four "I can…". Tell me the two parts an insertion sort splits the list into.

> 🧑‍🏫 Answer: sorted part and unsorted part. Note who sorted the whole list correctly.
