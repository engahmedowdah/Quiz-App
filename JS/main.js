let questionsData = [];
let categoriesData = [];
let difficultyData = [];
let anotherAnswersData = [];

let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let score = 0;
let timeLeft = 30;
let timerInterval = null;

async function loadData() {
  try {
    const [questions, categories, difficulty, anotherAnswers] =
      await Promise.all([
        fetch("JSON/Questions.json").then((res) => res.json()),
        fetch("JSON/Categories.json").then((res) => res.json()),
        fetch("JSON/DifficultyLevels.json").then((res) => res.json()),
        fetch("JSON/AnotherAnswers.json").then((res) => res.json()),
      ]);

    questionsData = questions;
    categoriesData = categories;
    difficultyData = difficulty;
    anotherAnswersData = anotherAnswers;

    console.log("All data loaded successfully");
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

function enableStartQuiz() {
  const startBtn = document.querySelector("#start-quiz-button");
  if (!startBtn) return;

  const category = sessionStorage.getItem("category");
  const numberOfQuestions = sessionStorage.getItem("number-of-questions");
  const difficulty = sessionStorage.getItem("difficulty-level");

  if (category && numberOfQuestions && difficulty) {
    startBtn.removeAttribute("disabled");
  } else {
    startBtn.setAttribute("disabled", "true");
  }
}

function selectElement(Elements, Name) {
  document.addEventListener("DOMContentLoaded", () => {
    let elements = document.querySelector(Elements);

    Array.from(elements.children).forEach((ele) => {
      if (ele.nodeType === 1) {
        ele.addEventListener("click", () => {
          Array.from(elements.children).forEach((btn) => {
            btn.classList.remove("selected");
          });

          ele.classList.add("selected");

          let dataKey = Object.keys(ele.dataset)[0];
          let dataValue = ele.dataset[dataKey];

          sessionStorage.setItem(Name, dataValue);
          enableStartQuiz();
        });
      }
    });
  });
}

function selectCategory() {
  selectElement(
    ".quiz-container .category-of-quiz-container .button-group",
    "category"
  );
}

function selectNumberOfQuestions() {
  selectElement(
    ".quiz-container .no-of-questions-container .button-group",
    "number-of-questions"
  );
}

function selectDifficultyLevel() {
  selectElement(
    ".quiz-container .difficulty-container .button-group",
    "difficulty-level"
  );
}

function clearSessionStorage() {
  sessionStorage.clear();
}

async function loadCategory(value) {
  try {
    const data = categoriesData;
    const categoryInfo = data.find(
      (c) => c.id === Number(value) || c.category === value
    );
    if (categoryInfo) return categoryInfo;
    console.error(`${value} category not found.`);
    return null;
  } catch (error) {
    console.error("Error fetching categories", error);
    return null;
  }
}

async function loadDifficultyLevel(value) {
  try {
    const data = difficultyData;
    const difficultyLevelInfo = data.find(
      (d) => d.id === Number(value) || d.difficulty === value
    );
    if (difficultyLevelInfo) return difficultyLevelInfo;
    console.error(`${value} difficulty level not found.`);
    return null;
  } catch (error) {
    console.error("Error fetching Difficulty Levels", error);
    return null;
  }
}

async function loadAnotherAnswers(value) {
  try {
    const data = anotherAnswersData;
    const answers = data.filter((ans) => ans.questionID === Number(value));

    if (answers.length > 0) {
      return answers;
    }

    console.error(`No another answers found for questionID ${value}.`);
    return [];
  } catch (error) {
    console.error("Error fetching AnotherAnswers", error);
    return [];
  }
}

async function loadQuizInfo(difficultyLevel, numberOfQuestions, category) {
  try {
    if (!difficultyLevel || !numberOfQuestions || !category) {
      console.error("Missing parameters for quiz info.");
      return null;
    }

    const [difficultyLevelInfo, categoryInfo] = await Promise.all([
      loadDifficultyLevel(difficultyLevel),
      loadCategory(category),
    ]);

    if (!difficultyLevelInfo || !categoryInfo) return null;

    const questions = questionsData
      .filter(
        (q) =>
          q.difficultyID === difficultyLevelInfo.id &&
          q.categoryID === categoryInfo.id
      )
      .slice(0, numberOfQuestions);

    if (questions.length === 0) {
      console.warn("No questions found for the selected criteria.");
      return null;
    }

    if (questions.length < numberOfQuestions) {
      console.warn(
        `Only ${questions.length} questions available, requested ${numberOfQuestions}`
      );
    }

    const questionsWithAnswers = questions.map((q) => {
      const wrongAnswers = anotherAnswersData
        .filter((ans) => ans.questionID === q.id)
        .map((ans) => ans.answer);

      const allAnswers = [q.answer, ...wrongAnswers];

      const shuffledAnswers = allAnswers.sort(() => Math.random() - 0.5);

      return {
        id: q.id,
        question: q.question,
        correctAnswer: q.answer,
        wrongAnswers: wrongAnswers,
        allAnswers: shuffledAnswers,
        categoryID: q.categoryID,
        difficultyID: q.difficultyID,
      };
    });

    const extendedQuizInfo = {
      DifficultyLevel: difficultyLevelInfo,
      Category: categoryInfo,
      NumberOfQuestions: numberOfQuestions,
      TotalQuestionsLoaded: questions.length,
      Questions: questionsWithAnswers,
    };

    console.log("Quiz Info Loaded:", extendedQuizInfo);
    return extendedQuizInfo;
  } catch (error) {
    console.error("Error fetching quiz info:", error);
    return null;
  }
}

async function startQuiz() {
  const difficultyLevel = sessionStorage.getItem("difficulty-level");
  const numberOfQuestions = Number(
    sessionStorage.getItem("number-of-questions")
  );
  const category = sessionStorage.getItem("category");

  let quizInfo;
  switch (difficultyLevel) {
    case "1":
      quizInfo = await loadQuizInfo("Easy", numberOfQuestions, category);
      break;
    case "2":
      quizInfo = await loadQuizInfo("Medium", numberOfQuestions, category);
      break;
    case "3":
      quizInfo = await loadQuizInfo("Hard", numberOfQuestions, category);
      break;
    default:
      console.error("Invalid difficulty level selected");
  }

  if (quizInfo) {
    currentQuiz = quizInfo;
    currentQuestionIndex = 0;
    userAnswers = [];
    score = 0;
    showQuizInterface();
  }
}

function showQuizInterface() {
  const quizConfig = document.getElementById("quiz-config");
  quizConfig.style.display = "none";

  const quizContainer = document.createElement("div");
  quizContainer.className = "questions";
  quizContainer.innerHTML = `
    <header>
      <h1>${currentQuiz.Category.category} Quiz</h1>
      <div class="timer-container">
        <i class="fas fa-clock timer-icon"></i>
        <span id="timer">${timeLeft}</span>
      </div>
    </header>
    <main>
      <div id="question"></div>
      <div class="answer-options" id="answer-options"></div>
    </main>
    <footer>
      <div id="question-counter">Question <b>${
        currentQuestionIndex + 1
      }</b> of <b>${currentQuiz.Questions.length}</b></div>
      <button id="next-question" style="display: none;">Next Question</button>
    </footer>
  `;

  document.body.appendChild(quizContainer);
  displayQuestion();
  startTimer();
}

function displayQuestion() {
  const question = currentQuiz.Questions[currentQuestionIndex];
  const questionElement = document.getElementById("question");
  const answerOptions = document.getElementById("answer-options");

  questionElement.textContent = question.question;

  answerOptions.innerHTML = "";
  question.allAnswers.forEach((answer, index) => {
    const button = document.createElement("button");
    button.textContent = answer;
    button.addEventListener("click", () => selectAnswer(answer, button));
    answerOptions.appendChild(button);
  });
}

function selectAnswer(selectedAnswer, buttonElement) {
  const question = currentQuiz.Questions[currentQuestionIndex];
  const answerButtons = document.querySelectorAll("#answer-options button");

  answerButtons.forEach((btn) => {
    btn.disabled = true;
    btn.classList.remove("selected");
  });

  buttonElement.classList.add("selected");

  answerButtons.forEach((btn) => {
    if (btn.textContent === question.correctAnswer) {
      btn.classList.add("correct");
    } else if (
      btn.textContent === selectedAnswer &&
      selectedAnswer !== question.correctAnswer
    ) {
      btn.classList.add("wrong");
    }
  });

  userAnswers.push({
    questionIndex: currentQuestionIndex,
    selectedAnswer: selectedAnswer,
    correctAnswer: question.correctAnswer,
    isCorrect: selectedAnswer === question.correctAnswer,
  });

  if (selectedAnswer === question.correctAnswer) {
    score++;
  }

  const nextButton = document.getElementById("next-question");
  nextButton.style.display = "block";
  nextButton.onclick = nextQuestion;

  clearInterval(timerInterval);
}

function nextQuestion() {
  currentQuestionIndex++;

  if (currentQuestionIndex < currentQuiz.Questions.length) {
    timeLeft = 30;
    document.getElementById("timer").textContent = timeLeft;

    document.getElementById("question-counter").innerHTML = `Question <b>${
      currentQuestionIndex + 1
    }</b> of <b>${currentQuiz.Questions.length}</b>`;

    displayQuestion();
    startTimer();
  } else {
    showResults();
  }
}

function startTimer() {
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      const firstButton = document.querySelector("#answer-options button");
      if (firstButton) {
        firstButton.click();
      }
    }
  }, 1000);
}

function showResults() {
  const questionsContainer = document.querySelector(".questions");
  questionsContainer.style.display = "none";

  const resultsContainer = document.createElement("div");
  resultsContainer.className = "results";
  resultsContainer.innerHTML = `
    <h1>Quiz Complete!</h1>
    <div class="score-display">${score}/${currentQuiz.Questions.length}</div>
    <div class="score-details">
      <div class="score-item correct">
        <h3>Correct</h3>
        <div class="value">${score}</div>
      </div>
      <div class="score-item wrong">
        <h3>Wrong</h3>
        <div class="value">${currentQuiz.Questions.length - score}</div>
      </div>
      <div class="score-item">
        <h3>Percentage</h3>
        <div class="value">${Math.round(
          (score / currentQuiz.Questions.length) * 100
        )}%</div>
      </div>
    </div>
    <button class="restart-btn" onclick="restartQuiz()">🔄 Take Another Quiz</button>
  `;

  document.body.appendChild(resultsContainer);
}

function restartQuiz() {
  currentQuiz = null;
  currentQuestionIndex = 0;
  userAnswers = [];
  score = 0;
  timeLeft = 30;

  const questionsContainer = document.querySelector(".questions");
  const resultsContainer = document.querySelector(".results");
  if (questionsContainer) questionsContainer.remove();
  if (resultsContainer) resultsContainer.remove();

  const quizConfig = document.getElementById("quiz-config");
  quizConfig.style.display = "block";

  clearSessionStorage();
  enableStartQuiz();
  document.querySelectorAll(".button-group button").forEach((btn) => {
    btn.classList.remove("selected");
  });
}

clearSessionStorage();
loadData();
selectCategory();
selectNumberOfQuestions();
selectDifficultyLevel();
document
  .querySelector("#start-quiz-button")
  .addEventListener("click", startQuiz);
