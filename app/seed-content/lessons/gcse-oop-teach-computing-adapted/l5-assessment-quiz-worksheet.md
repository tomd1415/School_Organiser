# Assessment — OOP quiz worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
This quiz checks the key ideas of object-oriented programming, using the **library tracker** program. Keep the example project open while you answer.

![The library tracker explore sheet]({{res:l5-library-tracker-worksheet.png}})

## Everyone — classes and objects
Tick ALL the correct answers.

| Question | Tick all that apply |
|---|---|
| Q1. Which of these are **classes** in the program? | [ ] User [ ] Library [ ] book.py [ ] jane [ ] hunger_games |
| Q2. Which of these are **objects** in the program? | [ ] jane [ ] hunger_games [ ] Library [ ] User [ ] book.py |

## 🟢 Support
Pick the one correct answer.

| Question | Choose |
|---|---|
| Q3. Which of these is a **method** in the Book class? | (  ) title (  ) rent_out (  ) author (  ) self |
| Q4. Which of these is an **attribute** in the Library class? | (  ) list_books_author (  ) add_user (  ) books (  ) __init__ |

## 🟡 Core
Pick the one correct answer.

| Question | Choose |
|---|---|
| Q5. To store a new library ID card number for each user, you would add… | (  ) a method to the Library class (  ) a class called Student_ID (  ) an attribute in the User class (  ) a method in the User class |
| Q6. Which line creates a new object of the Book class? | (  ) book_object = Book.__init__(self) (  ) book_object = new Book (  ) Book() (  ) book_object = Book() |
| Q7. Which line uses the **getter method** to read the users of `school_library`? | (  ) school_library.users (  ) school_library.get_user() (  ) school_library.get_user (  ) school_library return users |

## 🔴 Challenge
Pick the one correct answer.

| Question | Choose |
|---|---|
| Q8. Which line uses the **setter method** to change the author of `twilight`? | (  ) twilight.author = "Stephanie Meyer" (  ) twilight.set_author = "Stephanie Meyer" (  ) twilight.get_author("Stephanie Meyer") (  ) twilight.set_author("Stephanie Meyer") |
| Q9. Which Book attribute is an **association** with another class? | (  ) title (  ) author (  ) genre (  ) current_holder |
| Q10. Which method in the User class is designed to interact with another class? | (  ) receive_book() (  ) get_author() (  ) set_email() (  ) __init__() |
| Q11. To make Fiction and Nonfiction kinds of Book, which OOP principle would you use? | (  ) inheritance (  ) iteration (  ) selection (  ) a single function |

## Superclass or subclass?
Drag each class to its role (Q11 continued).

| Class | Its role |
|---|---|
| Book | (  ) superclass (parent) (  ) subclass (child) |
| NonFictionBook | (  ) superclass (parent) (  ) subclass (child) |

## Adding to the library (programming task)
Add a new **subclass** of `Book` — either `FictionBook` or `NonFictionBook` — with two new attributes, plus their getters and setters. Your constructor MUST include `super().__init__(title, genre, author)`.

| Question | Your answer |
|---|---|
| Which subclass did you make, and what two attributes did you add? | Type your answer here |
| Paste your project link (repl.it or similar) here | Type your answer here |
| Show your new subclass running | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I can find the classes in an OOP program
- [ ] I can tell objects, attributes and methods apart
- [ ] I can explain inheritance, superclass and subclass
- [ ] I can add a new subclass to a program
