# RSC stock control

## Today we are learning
- use VLOOKUP to fetch item data
- lock a lookup range with $ signs
- use an IF function to warn when stock is low
- test a stock control model

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary: LOOKUP · VLOOKUP · IF · absolute · conditional format. Same routine as every lesson.

## Starter — what happens after the beep?
![A QR code]({{res:l5-qr-code.png}})

- a barcode holds item data, NOT the price
- the price is kept in the shop's database
- a QR code (2D code) can hold more, e.g. a web address

> 🧑‍🏫 Why keep price in the database? It can be changed in one place for an offer. The QR code on this slide links to a message — scan it if it suits the class.

## A till uses a LOOKUP
![A till receipt with shortened names]({{res:l5-till-receipt.png}})

- scan the item number → LOOKUP finds it → returns the data
- the receipt shows the short name from the database

> 🧑‍🏫 Connect the beep to the formula: the scanner enters a number; VLOOKUP does the rest. The list must be sorted by item number.

## VLOOKUP — fetch the data
- `=VLOOKUP(A8, 'Lookup sheet'!$A$2:$C$17, 3, FALSE)`
- A8 = the item number to find
- `$A$2:$C$17` = the locked lookup range
- `3` = return the 3rd column · `FALSE` = exact match

> 🧑‍🏫 Read it in parts. Likely error: the range is not locked, so it shifts when filled down. Fix-words: "lock the range with dollar signs."

## IF — warn when stock is low
![The VAT rate cell the lookup uses]({{res:l5-vat-lookup.png}})

- `=IF(H8<100,"Reorder","")`
- if stock is below 100 → show "Reorder"
- if not → show nothing (empty speech marks)

> 🧑‍🏫 IF checks a condition: true → first result, false → second. Text needs speech marks. Empty `""` means "show nothing".

## Test it
- enter an item number → the data appears
- sell items → stock falls → "Reorder" appears
- try a wrong number → see what happens

> 🧑‍🏫 Testing is part of the job. Support: pair them. TA: prompt, do not do it for them. They screenshot a working lookup.

## I can…
Tick your four "I can…". Show me a lookup that worked.

> 🧑‍🏫 Note who can explain why the lookup range is locked.
