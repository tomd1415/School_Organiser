# In a while, crocodile — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will use a `while` loop to build a list, and use `len`, `in` and indexing on lists and strings.

## Predict — city hopping
This program picks one random European city.

![A short Python program that picks a random city from a list]({{res:l3-city-hopping-code-teach-computing.png}})

| Question | Choose |
|---|---|
| What does `choice(cities)` do? | (  ) picks one random city from the list (  ) sorts the cities (  ) counts the cities |

## Build the city-hopping loop  (we do)
These lines keep picking random cities until the trip has 5, then print it — but they are jumbled. Drag them into order.

```parsons
trip = []
while len(trip) < 5:
  city = choice(cities)
  trip.append(city)
print("Itinerary:", trip)
```

## 🟢 Support
| Question | Choose |
|---|---|
| Which condition keeps looping until the trip has 5 cities? | (  ) while len(trip) < 5: (  ) while len(trip) > 5: (  ) while trip == 5: |

## 🟡 Core
| Question | Your answer |
|---|---|
| Fill the gap so a city is added to the trip: `trip.[[ ]](city)` | Type your answer here |
| A string works like a list of characters. What does `"London"[0]` give? | Type your answer here |

## 🔴 Challenge — city guessing
This guessing game can reveal hints using string operations.

![A Python city-guessing program that uses string length and characters]({{res:l3-city-guessing-code-teach-computing.png}})

| Question | Your answer |
|---|---|
| Write a line that gives the FIRST letter of the variable `city`. | Type your code here |
| The hint says "It has 5 letters". Which function counts the letters in `city`? | Type your answer here |

## Show your work
| Question | Your answer |
|---|---|
| Paste a link to your saved program here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I used a `while` loop to repeat until a condition was met
- [ ] I built up a list inside a loop with `append`
- [ ] I used `len` and `in` on a list and a string
- [ ] I read a character of a string by its index
