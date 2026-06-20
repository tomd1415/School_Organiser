(function () {
  'use strict';

  // Fictional dataset of student responses and AI suggestions across different question styles
  const lessonsDataset = {
    "lesson-mcq": {
      title: "Lesson 1: Python Basics (Short Answer & MCQ)",
      class: "9A/Cs1",
      date: "20 June 2026",
      sheets: ["Sheet 1: Core Syntax"],
      questions: [
        {
          id: "q1",
          sheet: "Sheet 1: Core Syntax",
          title: "Q1. What symbol is used to comment code in Python?",
          type: "mcq",
          model: "# (hash symbol)",
          points: 1
        },
        {
          id: "q2",
          sheet: "Sheet 1: Core Syntax",
          title: "Q2. Name the data type used to store true or false values.",
          type: "short",
          model: "boolean or bool",
          points: 1
        }
      ],
      students: [
        {
          name: "Alex Morgan",
          badge: "Core",
          answers: {
            q1: { value: "#", score: 1, aiStatus: "correct", aiConf: "100%", feedback: "Correct selection.", confirmed: false },
            q2: { value: "boolean", score: 1, aiStatus: "correct", aiConf: "98%", feedback: "Correct terminology.", confirmed: false }
          },
          comment: "Excellent work on basic syntax, Alex!"
        },
        {
          name: "Bethany Cole",
          badge: "Core",
          answers: {
            q1: { value: "//", score: 0, aiStatus: "incorrect", aiConf: "100%", feedback: "Incorrect selection. // is used in Javascript/C++.", confirmed: false },
            q2: { value: "boolean", score: 1, aiStatus: "correct", aiConf: "98%", feedback: "Correct terminology.", confirmed: false }
          },
          comment: "Remember Python uses # for comments, not //."
        },
        {
          name: "Daniel Reed",
          badge: "Support",
          answers: {
            q1: { value: "#", score: 1, aiStatus: "correct", aiConf: "100%", feedback: "Correct selection.", confirmed: false },
            q2: { value: "bool", score: 1, aiStatus: "correct", aiConf: "95%", feedback: "Correct abbreviation.", confirmed: false }
          },
          comment: "Great job, Daniel. Keep it up!"
        }
      ]
    },
    "lesson-prog": {
      title: "Lesson 2: Python Loops (Programming)",
      class: "9A/Cs1",
      date: "19 June 2026",
      sheets: ["Sheet A: Loop Logic"],
      questions: [
        {
          id: "q1",
          sheet: "Sheet A: Loop Logic",
          title: "Q1. Reorder the lines of code to print numbers 0 to 4 (Parsons Problem).",
          type: "parsons",
          model: "for i in range(5):\n    print(i)",
          points: 2
        },
        {
          id: "q2",
          sheet: "Sheet A: Loop Logic",
          title: "Q2. Complete loops.py to print each name from the names list.",
          type: "code",
          model: "names = ['Aisha', 'Daniel', 'Eva']\nfor name in names:\n    print(name)",
          points: 3
        }
      ],
      students: [
        {
          name: "Alex Morgan",
          badge: "Core",
          answers: {
            q1: { value: "for i in range(5):\n    print(i)", score: 2, aiStatus: "correct", aiConf: "100%", feedback: "Correct line sorting.", confirmed: false },
            q2: { value: "names = ['Aisha', 'Daniel', 'Eva']\nfor name in names:\n    print(name)", score: 3, aiStatus: "correct", aiConf: "100%", feedback: "Code compiles successfully and outputs names.", confirmed: false }
          },
          comment: "Perfect Python loops, Alex! Excellent syntax."
        },
        {
          name: "Bethany Cole",
          badge: "Core",
          answers: {
            q1: { value: "    print(i)\nfor i in range(5):", score: 0, aiStatus: "incorrect", aiConf: "100%", feedback: "Incorrect hierarchy. The loop header must go before the body.", confirmed: false },
            q2: { value: "names = ['Aisha', 'Daniel', 'Eva']\nfor name in names\n    print(name)", score: 1, aiStatus: "warn", aiConf: "80%", feedback: "SyntaxError: missing colon at end of loop header. Suggested 1/3 marks.", confirmed: false }
          },
          comment: "Bethany, watch out for the colon at the end of loop statements!"
        },
        {
          name: "Daniel Reed",
          badge: "Support",
          answers: {
            q1: { value: "for i in range(5):\n    print(i)", score: 2, aiStatus: "correct", aiConf: "100%", feedback: "Correct line sorting.", confirmed: false },
            q2: { value: "names = ['Aisha', 'Daniel', 'Eva']\nfor name in names:\nprint(name)", score: 1, aiStatus: "warn", aiConf: "85%", feedback: "IndentationError: missing spaces before print statement. Suggested 1/3 marks.", confirmed: false }
          },
          comment: "Daniel, remember to indent code inside a loop by 4 spaces."
        }
      ]
    },
    "lesson-theory": {
      title: "Lesson 3: Loop Theory (Long Answer)",
      class: "9A/Cs1",
      date: "18 June 2026",
      sheets: ["Sheet 1: Explanations"],
      questions: [
        {
          id: "q1",
          sheet: "Sheet 1: Explanations",
          title: "Q1. Explain the difference between a for loop and a while loop. When would you use each?",
          type: "long",
          model: "A for loop is count-controlled (repeats a set number of times, e.g. for items in a list). A while loop is condition-controlled (repeats until a condition changes to false). Use for loops when you know the count beforehand; use while loops when looping depends on state (like game loops or user inputs).",
          points: 4,
          rubric: ["count-controlled", "condition-controlled", "when to use"]
        }
      ],
      students: [
        {
          name: "Alex Morgan",
          badge: "Core",
          answers: {
            q1: { value: "A for loop runs a set number of times like looping through a list of names. A while loop runs until something changes, like a game loops while the player is alive. You use for when you know how many times to loop, and while when you don't.", score: 4, aiStatus: "correct", aiConf: "92%", feedback: "AI matched criteria: count-controlled, condition-controlled, and when to use both. Suggested 4/4 marks.", confirmed: false }
          },
          comment: "Excellent details and real-world examples, Alex!"
        },
        {
          name: "Bethany Cole",
          badge: "Core",
          answers: {
            q1: { value: "You use a for loop to count numbers and a while loop is just for other loops.", score: 1, aiStatus: "warn", aiConf: "70%", feedback: "AI matched criteria: count-controlled only. No explanation of condition control or loop bounds. Suggested 1/4 marks.", confirmed: false }
          },
          comment: "Bethany, try to define what controls a while loop (a true/false condition)."
        },
        {
          name: "Daniel Reed",
          badge: "Support",
          answers: {
            q1: { value: "For loops are for lists of things. While loops keep going forever unless you stop them with a break or a code condition.", score: 3, aiStatus: "correct", aiConf: "84%", feedback: "AI matched criteria: count-controlled explanation, condition-controlled explanation. Needs more clarity on when to choose one over the other. Suggested 3/4 marks.", confirmed: false }
          },
          comment: "Very solid explanation, Daniel. Just add when you would use each in practice."
        }
      ]
    },
    "lesson-mixed": {
      title: "Lesson 4: End of Unit Assessment (Mixed Multi-Sheet)",
      class: "9A/Cs1",
      date: "17 June 2026",
      sheets: ["Sheet A: Concepts", "Sheet B: Code Challenge"],
      questions: [
        {
          id: "q1",
          sheet: "Sheet A: Concepts",
          title: "Q1. Which range statement produces the numbers 1, 2, 3?",
          type: "mcq",
          model: "range(1, 4)",
          points: 1
        },
        {
          id: "q2",
          sheet: "Sheet A: Concepts",
          title: "Q2. What keyword is used to break out of a loop immediately?",
          type: "short",
          model: "break",
          points: 1
        },
        {
          id: "q3",
          sheet: "Sheet B: Code Challenge",
          title: "Q3. Write a program to sum numbers from 1 to 5.",
          type: "code",
          model: "total = 0\nfor i in range(1, 6):\n    total += i\nprint(total)",
          points: 3
        }
      ],
      students: [
        {
          name: "Alex Morgan",
          badge: "Core",
          answers: {
            q1: { value: "range(1, 4)", score: 1, aiStatus: "correct", aiConf: "100%", feedback: "Correct selection.", confirmed: false },
            q2: { value: "break", score: 1, aiStatus: "correct", aiConf: "99%", feedback: "Correct keyword.", confirmed: false },
            q3: { value: "total = 0\nfor x in range(1, 6):\n    total = total + x\nprint(total)", score: 3, aiStatus: "correct", aiConf: "95%", feedback: "Code compiles successfully and outputs 15.", confirmed: false }
          },
          comment: "Outstanding assessment performance, Alex! Full marks."
        },
        {
          name: "Bethany Cole",
          badge: "Core",
          answers: {
            q1: { value: "range(1, 3)", score: 0, aiStatus: "incorrect", aiConf: "100%", feedback: "Incorrect. range(1,3) stops before 3, producing only 1, 2.", confirmed: false },
            q2: { value: "stop", score: 0, aiStatus: "incorrect", aiConf: "99%", feedback: "Incorrect keyword. Python uses 'break'.", confirmed: false },
            q3: { value: "total = 0\nfor x in range(1, 5):\n    total += x\nprint(total)", score: 2, aiStatus: "warn", aiConf: "90%", feedback: "Logic error: range stops at 5 (exclusive) so it only sums 1 to 4. Suggested 2/3 marks.", confirmed: false }
          },
          comment: "Bethany, check the boundary limits on your range stops."
        },
        {
          name: "Daniel Reed",
          badge: "Support",
          answers: {
            q1: { value: "range(1, 4)", score: 1, aiStatus: "correct", aiConf: "100%", feedback: "Correct selection.", confirmed: false },
            q2: { value: "break", score: 1, aiStatus: "correct", aiConf: "99%", feedback: "Correct keyword.", confirmed: false },
            q3: { value: "total = 0\nfor x in range(1, 6):\ntotal = total + x\nprint(total)", score: 1, aiStatus: "warn", aiConf: "85%", feedback: "IndentationError inside loop body. Suggested 1/3 marks.", confirmed: false }
          },
          comment: "You understood the logic well, Daniel. Keep working on indentation spacing!"
        }
      ]
    }
  };

  // State Management
  let activeLessonKey = "";
  let activeStudentIdx = 0;
  let activeSheetName = "";

  // DOM Elements
  const gradingModal = document.getElementById('grading-modal');
  const modalLessonMeta = document.getElementById('modal-lesson-meta');
  const modalTitle = document.getElementById('modal-title');
  const modalPupilIndex = document.getElementById('modal-pupil-index');
  const modalPupilBadge = document.getElementById('modal-pupil-badge');
  const modalSheetsBar = document.getElementById('modal-sheets-tabs-bar');
  const modalTabButtonsContainer = document.getElementById('modal-tab-buttons-container');
  const modalQuestionsContainer = document.getElementById('modal-questions-container');
  const modalTeacherCommentBox = document.getElementById('modal-teacher-comment-box');
  const modalSavedStatus = document.getElementById('modal-saved-status');

  const prevPupilBtn = document.getElementById('modal-prev-pupil-btn');
  const nextPupilBtn = document.getElementById('modal-next-pupil-btn');
  const prevFooterBtn = document.getElementById('modal-prev-footer-btn');
  const confirmNextBtn = document.getElementById('modal-confirm-next-btn');
  const flagBtn = document.getElementById('modal-flag-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const closeXBtn = document.getElementById('modal-close-x');
  const dictateBtn = document.getElementById('modal-dictate-feedback-btn');
  const statusAnnounce = document.getElementById('prototype-status');

  function announce(message) {
    if (!statusAnnounce) return;
    statusAnnounce.textContent = '';
    setTimeout(function() {
      statusAnnounce.textContent = message;
    }, 20);
  }

  // Simple Simulated Code Syntax Highlighting
  function highlightPython(code) {
    if (!code) return "";
    let safeCode = String(code)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Keywords
    safeCode = safeCode.replace(/\b(for|in|while|if|else|elif|import|def|return|print)\b/g, '<span class="keyword">$1</span>');
    // Builtins
    safeCode = safeCode.replace(/\b(range|len|names|names_list|list|total)\b/g, '<span class="builtin">$1</span>');
    // Numbers
    safeCode = safeCode.replace(/\b([0-9]+)\b/g, '<span class="number">$1</span>');
    
    return safeCode;
  }

  // Show a brief auto-saved flash status message
  function flashSaved() {
    modalSavedStatus.classList.add('show');
    setTimeout(() => {
      modalSavedStatus.classList.remove('show');
    }, 1500);
  }

  // Open the grading dialog modal and render the active student response
  function openGradingQueue(lessonKey) {
    activeLessonKey = lessonKey;
    activeStudentIdx = 0;
    const lesson = lessonsDataset[activeLessonKey];
    activeSheetName = lesson.sheets[0];

    gradingModal.showModal();
    renderStudentResponse();
    announce('Opened grading dialog for: ' + lesson.title);
  }

  // Close the grading overlay
  function closeGradingQueue() {
    gradingModal.close();
    announce('Returned to teacher dashboard.');
  }

  // Build sheet tabs when a lesson has more than one sheet
  function renderSheetTabs() {
    const lesson = lessonsDataset[activeLessonKey];
    if (lesson.sheets.length > 1) {
      modalSheetsBar.style.display = 'flex';
      modalTabButtonsContainer.innerHTML = '';
      lesson.sheets.forEach(sheet => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `tab-btn ${sheet === activeSheetName ? 'active' : ''}`;
        btn.textContent = sheet;
        btn.addEventListener('click', function () {
          activeSheetName = sheet;
          renderSheetTabs();
          renderQuestionsList();
          announce('Switched grading sheet to: ' + sheet);
        });
        modalTabButtonsContainer.appendChild(btn);
      });
    } else {
      modalSheetsBar.style.display = 'none';
    }
  }

  // Render the currently selected student details and comments
  function renderStudentResponse() {
    const lesson = lessonsDataset[activeLessonKey];
    const student = lesson.students[activeStudentIdx];

    // Meta details
    modalLessonMeta.textContent = `${lesson.class} · ${lesson.title} · ${lesson.date}`;
    modalTitle.textContent = student.name;
    modalPupilIndex.textContent = `Pupil ${activeStudentIdx + 1} of ${lesson.students.length}`;
    modalPupilBadge.className = `badge ${student.badge === 'Support' ? 'warn' : student.badge === 'Extend' ? 'ai' : ''}`;
    modalPupilBadge.textContent = student.badge;

    // Tabs
    renderSheetTabs();

    // Questions and Answers list
    renderQuestionsList();

    // Teacher Comment box
    modalTeacherCommentBox.value = student.comment || "";

    // Set navigation states
    const isFirst = activeStudentIdx === 0;
    const isLast = activeStudentIdx === lesson.students.length - 1;
    prevPupilBtn.disabled = isFirst;
    prevFooterBtn.disabled = isFirst;
    nextPupilBtn.disabled = isLast;

    if (isLast) {
      confirmNextBtn.innerHTML = 'Confirm & Finish Class';
    } else {
      confirmNextBtn.innerHTML = 'Confirm & Next Pupil →';
    }
  }

  // Render questions belonging to the active sheet
  function renderQuestionsList() {
    const lesson = lessonsDataset[activeLessonKey];
    const student = lesson.students[activeStudentIdx];
    modalQuestionsContainer.innerHTML = '';

    const activeQuestions = lesson.questions.filter(q => !q.sheet || q.sheet === activeSheetName);

    activeQuestions.forEach(q => {
      const ans = student.answers[q.id];
      const qBox = document.createElement('article');
      qBox.className = 'mark-question-box';

      // Heading block
      const qHead = document.createElement('div');
      qHead.className = 'mark-question-header';
      qHead.innerHTML = `<h3>${q.title}</h3>`;
      qBox.appendChild(qHead);

      // Main grid structure
      const grid = document.createElement('div');
      grid.className = 'mark-grid';

      // Left Column (Details)
      const contentCol = document.createElement('div');
      contentCol.className = 'mark-content-col';

      // Model answer box
      const modelBox = document.createElement('div');
      modelBox.className = 'answer-box model';
      modelBox.innerHTML = `<span>Model Mark Scheme (${q.points} mark${q.points > 1 ? 's' : ''})</span>`;
      
      if (q.type === 'code' || q.type === 'parsons') {
        modelBox.innerHTML += `<pre><code>${highlightPython(q.model)}</code></pre>`;
      } else {
        modelBox.innerHTML += `<p>${q.model}</p>`;
      }
      contentCol.appendChild(modelBox);

      // Student answer box
      const pupilBox = document.createElement('div');
      pupilBox.className = 'answer-box pupil';
      pupilBox.innerHTML = `<span>${student.name}'s Answer</span>`;

      if (q.type === 'code' || q.type === 'parsons') {
        pupilBox.innerHTML += `<pre><code>${highlightPython(ans.value)}</code></pre>`;
      } else {
        pupilBox.innerHTML += `<p>${ans.value || '<i>No response</i>'}</p>`;
      }
      contentCol.appendChild(pupilBox);

      // Long Answer Rubrics
      if (q.type === 'long' && q.rubric) {
        const critWrap = document.createElement('div');
        critWrap.innerHTML = '<span class="quiet" style="font-size: 0.72rem; font-weight: 800; display: block; margin-bottom: 0.25rem;">AI MATCHED CRITERIA:</span>';
        const critContainer = document.createElement('div');
        critContainer.className = 'criteria-container';

        q.rubric.forEach(rub => {
          const matched = ans.value.toLowerCase().includes(rub.split(' ')[0]);
          if (matched) {
            critContainer.innerHTML += `<span class="criteria-pill">✓ Matched: "${rub}"</span>`;
          }
        });
        critWrap.appendChild(critContainer);
        contentCol.appendChild(critWrap);
      }

      grid.appendChild(contentCol);

      // Right Column (AI & Score Controls)
      const controlCol = document.createElement('div');
      controlCol.className = 'mark-control-col';

      const ctrlTop = document.createElement('div');
      ctrlTop.className = 'control-top';
      
      const badgeClass = ans.aiStatus === 'correct' ? 'good' : ans.aiStatus === 'incorrect' ? 'red' : 'warn';
      const badgeLabel = ans.aiStatus === 'correct' ? '✓ AI Correct' : ans.aiStatus === 'incorrect' ? '✗ AI Incorrect' : '⚡ AI Suggested';

      ctrlTop.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                             <span class="badge ${badgeClass}">${badgeLabel}</span>
                             <span class="confidence-lbl">Confidence: ${ans.aiConf}</span>
                           </div>
                           <div class="ai-desc-block">${ans.feedback}</div>`;
      controlCol.appendChild(ctrlTop);

      // Score / Accept Adjustments
      const ctrlActions = document.createElement('div');
      ctrlActions.className = 'control-actions';

      if (q.points === 1) {
        // Binary correct / incorrect buttons
        const binaryWrap = document.createElement('div');
        binaryWrap.className = 'binary-buttons';

        const correctBtn = document.createElement('button');
        correctBtn.type = 'button';
        correctBtn.className = `btn-binary correct ${ans.score === 1 ? 'active' : ''}`;
        correctBtn.innerHTML = '✓ Correct';
        correctBtn.addEventListener('click', function () {
          ans.score = 1;
          ans.confirmed = true;
          renderQuestionsList();
          flashSaved();
          announce('Set mark to Correct.');
        });

        const incorrectBtn = document.createElement('button');
        incorrectBtn.type = 'button';
        incorrectBtn.className = `btn-binary incorrect ${ans.score === 0 ? 'active' : ''}`;
        incorrectBtn.innerHTML = '✗ Incorrect';
        incorrectBtn.addEventListener('click', function () {
          ans.score = 0;
          ans.confirmed = true;
          renderQuestionsList();
          flashSaved();
          announce('Set mark to Incorrect.');
        });

        binaryWrap.appendChild(correctBtn);
        binaryWrap.appendChild(incorrectBtn);
        ctrlActions.appendChild(binaryWrap);
      } else {
        // Multi-point adjustments
        const scoreRow = document.createElement('div');
        scoreRow.className = 'score-tweak-row';
        scoreRow.innerHTML = `<span class="score-label">Mark:</span>`;

        const adjuster = document.createElement('div');
        adjuster.className = 'score-adjuster';

        const decBtn = document.createElement('button');
        decBtn.type = 'button';
        decBtn.className = 'btn-adjust';
        decBtn.textContent = '-';
        decBtn.disabled = ans.score === 0;
        decBtn.addEventListener('click', function () {
          if (ans.score > 0) {
            ans.score--;
            ans.confirmed = true;
            renderQuestionsList();
            flashSaved();
            announce(`Reduced score to ${ans.score}.`);
          }
        });

        const scoreText = document.createElement('span');
        scoreText.className = 'score-val';
        scoreText.textContent = `${ans.score} / ${q.points}`;

        const incBtn = document.createElement('button');
        incBtn.type = 'button';
        incBtn.className = 'btn-adjust';
        incBtn.textContent = '+';
        incBtn.disabled = ans.score === q.points;
        incBtn.addEventListener('click', function () {
          if (ans.score < q.points) {
            ans.score++;
            ans.confirmed = true;
            renderQuestionsList();
            flashSaved();
            announce(`Increased score to ${ans.score}.`);
          }
        });

        adjuster.appendChild(decBtn);
        adjuster.appendChild(scoreText);
        adjuster.appendChild(incBtn);
        scoreRow.appendChild(adjuster);
        ctrlActions.appendChild(scoreRow);
      }

      // Quick confirm suggestion button
      const confirmSugBtn = document.createElement('button');
      confirmSugBtn.type = 'button';
      confirmSugBtn.className = `button small ${ans.confirmed ? 'ghost' : 'primary'} confirm-suggestion-btn`;
      confirmSugBtn.textContent = ans.confirmed ? 'Marks Confirmed ✓' : 'Confirm AI Suggestion';
      confirmSugBtn.disabled = ans.confirmed;
      confirmSugBtn.addEventListener('click', function () {
        ans.confirmed = true;
        renderQuestionsList();
        flashSaved();
        announce('AI suggestion confirmed.');
      });
      ctrlActions.appendChild(confirmSugBtn);

      controlCol.appendChild(ctrlActions);
      grid.appendChild(controlCol);

      qBox.appendChild(grid);
      modalQuestionsContainer.appendChild(qBox);
    });
  }

  // Navigate through students in queue
  function navigateStudent(direction) {
    // Save current comment state
    const lesson = lessonsDataset[activeLessonKey];
    const student = lesson.students[activeStudentIdx];
    student.comment = modalTeacherCommentBox.value.trim();

    if (direction === 'next') {
      if (activeStudentIdx < lesson.students.length - 1) {
        activeStudentIdx++;
        renderStudentResponse();
        flashSaved();
        announce('Loaded next student: ' + lesson.students[activeStudentIdx].name);
      } else {
        // Complete class
        closeGradingQueue();
        alert('Congratulations! You have completed grading the submissions for ' + lesson.title + '. Feedback scores have been sent to their dashboards.');
      }
    } else if (direction === 'prev') {
      if (activeStudentIdx > 0) {
        activeStudentIdx--;
        renderStudentResponse();
        flashSaved();
        announce('Loaded previous student: ' + lesson.students[activeStudentIdx].name);
      }
    }
  }

  // Contrast Toggles
  document.querySelectorAll('[data-contrast-toggle]').forEach(button => {
    button.addEventListener('click', function () {
      const high = document.documentElement.dataset.contrast !== 'high';
      document.documentElement.dataset.contrast = high ? 'high' : 'standard';
      button.setAttribute('aria-pressed', String(high));
      announce(high ? 'High contrast enabled' : 'Standard contrast enabled');
    });
  });

  // Density Toggles
  document.querySelectorAll('[data-density-toggle]').forEach(button => {
    button.addEventListener('click', function () {
      const compact = document.documentElement.dataset.density !== 'compact';
      document.documentElement.dataset.density = compact ? 'compact' : 'comfortable';
      button.setAttribute('aria-pressed', String(compact));
      announce(compact ? 'Compact layout enabled' : 'Comfortable layout enabled');
    });
  });

  // Simulated Voice Dictation to comment box
  if (dictateBtn) {
    dictateBtn.addEventListener('click', function () {
      this.classList.toggle('speaking');
      if (this.classList.contains('speaking')) {
        this.innerHTML = '⏹️ Stop Voice';
        this.style.background = 'var(--red-soft)';
        this.style.borderColor = 'var(--red)';
        
        let counter = 0;
        const textSnippets = [
          " Excellent progression shown.",
          " Watch out for edge cases.",
          " Fully review loop limits before testing."
        ];
        
        this.dictationInterval = setInterval(() => {
          if (counter < textSnippets.length) {
            modalTeacherCommentBox.value += textSnippets[counter];
            counter++;
            announce('Dictating feedback notes...');
          } else {
            clearInterval(this.dictationInterval);
            this.classList.remove('speaking');
            this.innerHTML = '🎤 Dictate Feed';
            this.style.background = 'transparent';
            this.style.borderColor = 'var(--line-strong)';
            announce('Dictation finished.');
          }
        }, 1200);
      } else {
        clearInterval(this.dictationInterval);
        this.innerHTML = '🎤 Dictate Feed';
        this.style.background = 'transparent';
        this.style.borderColor = 'var(--line-strong)';
        announce('Dictation stopped.');
      }
    });
  }

  // Flag Response Simulation
  if (flagBtn) {
    flagBtn.addEventListener('click', function () {
      const studentName = lessonsDataset[activeLessonKey].students[activeStudentIdx].name;
      alert(`Answer flagged for ${studentName}. An alert has been sent to the department supervisor review queue.`);
      announce('Student answer flagged for review.');
    });
  }

  // Click listeners for example launchers
  document.querySelectorAll('[data-launch-lesson]').forEach(button => {
    button.addEventListener('click', function () {
      const lessonKey = this.getAttribute('data-launch-lesson');
      openGradingQueue(lessonKey);
    });
  });

  // Modal navigation click listeners
  prevPupilBtn.addEventListener('click', () => navigateStudent('prev'));
  prevFooterBtn.addEventListener('click', () => navigateStudent('prev'));
  nextPupilBtn.addEventListener('click', () => navigateStudent('next'));
  confirmNextBtn.addEventListener('click', () => navigateStudent('next'));
  cancelBtn.addEventListener('click', closeGradingQueue);
  closeXBtn.addEventListener('click', closeGradingQueue);

})();
