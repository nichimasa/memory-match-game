const symbols = ["🍓", "🍋", "🍇", "🍑", "🥝", "🍒", "🍍", "🫐"];

const board = document.querySelector("#board");
const movesEl = document.querySelector("#moves");
const matchesEl = document.querySelector("#matches");
const timerEl = document.querySelector("#timer");
const result = document.querySelector("#result");
const resultText = document.querySelector("#resultText");
const restartButton = document.querySelector("#restartButton");
const playAgainButton = document.querySelector("#playAgainButton");

let firstCard = null;
let secondCard = null;
let lockBoard = false;
let moves = 0;
let matches = 0;
let startedAt = null;
let timerId = null;

function shuffle(items) {
  const copied = [...items];

  for (let index = copied.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copied[index], copied[swapIndex]] = [copied[swapIndex], copied[index]];
  }

  return copied;
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function startTimer() {
  if (timerId) {
    return;
  }

  startedAt = Date.now();
  timerId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    timerEl.textContent = formatTime(elapsed);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

function updateStats() {
  movesEl.textContent = moves;
  matchesEl.textContent = matches;
}

function createCard(symbol, index) {
  const card = document.createElement("button");
  card.className = "card";
  card.type = "button";
  card.dataset.symbol = symbol;
  card.setAttribute("aria-label", `${index + 1}枚目のカード`);

  card.innerHTML = `
    <span class="card-inner">
      <span class="card-face card-back"></span>
      <span class="card-face card-front" aria-hidden="true">${symbol}</span>
    </span>
  `;

  card.addEventListener("click", () => flipCard(card));
  return card;
}

function resetSelection() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
}

function handleMismatch() {
  lockBoard = true;

  setTimeout(() => {
    firstCard.classList.remove("is-flipped");
    secondCard.classList.remove("is-flipped");
    resetSelection();
  }, 780);
}

function handleMatch() {
  firstCard.classList.add("is-matched");
  secondCard.classList.add("is-matched");
  firstCard.disabled = true;
  secondCard.disabled = true;
  matches += 1;
  updateStats();
  resetSelection();

  if (matches === symbols.length) {
    finishGame();
  }
}

function flipCard(card) {
  if (lockBoard || card === firstCard || card.classList.contains("is-matched")) {
    return;
  }

  startTimer();
  card.classList.add("is-flipped");

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  moves += 1;
  updateStats();

  if (firstCard.dataset.symbol === secondCard.dataset.symbol) {
    handleMatch();
  } else {
    handleMismatch();
  }
}

function finishGame() {
  stopTimer();
  const elapsed = timerEl.textContent;
  resultText.textContent = `${moves}手、${elapsed}で全ペアを見つけました。`;
  result.hidden = false;
}

function newGame() {
  stopTimer();
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  moves = 0;
  matches = 0;
  startedAt = null;
  timerEl.textContent = "00:00";
  result.hidden = true;
  updateStats();

  const deck = shuffle([...symbols, ...symbols]);
  board.replaceChildren(...deck.map(createCard));
}

restartButton.addEventListener("click", newGame);
playAgainButton.addEventListener("click", newGame);

newGame();
