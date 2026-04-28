const cardImages = [
  { src: "assets/cards/card-1.jpg?v=20260428-photo-cards", label: "写真1" },
  { src: "assets/cards/card-2.jpg?v=20260428-photo-cards", label: "写真2" },
  { src: "assets/cards/card-3.jpg?v=20260428-photo-cards", label: "写真3" },
  { src: "assets/cards/card-4.jpg?v=20260428-photo-cards", label: "写真4" },
  { src: "assets/cards/card-5.jpg?v=20260428-photo-cards", label: "写真5" },
  { src: "assets/cards/card-6.jpg?v=20260428-photo-cards", label: "写真6" },
  { src: "assets/cards/card-7.jpg?v=20260428-photo-cards", label: "写真7" },
  { src: "assets/cards/card-8.jpg?v=20260428-photo-cards", label: "写真8" },
];

const board = document.querySelector("#board");
const movesEl = document.querySelector("#moves");
const matchesEl = document.querySelector("#matches");
const timerEl = document.querySelector("#timer");
const result = document.querySelector("#result");
const resultText = document.querySelector("#resultText");
const soundButton = document.querySelector("#soundButton");
const soundIcon = document.querySelector("#soundIcon");
const soundState = document.querySelector("#soundState");
const restartButton = document.querySelector("#restartButton");
const playAgainButton = document.querySelector("#playAgainButton");

let firstCard = null;
let secondCard = null;
let lockBoard = false;
let moves = 0;
let matches = 0;
let startedAt = null;
let timerId = null;
let audioContext = null;
let masterGain = null;
let bgmTimerId = null;
let soundEnabled = false;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.28;
    masterGain.connect(audioContext.destination);
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playTone(frequency, duration, options = {}) {
  if (!soundEnabled) {
    return;
  }

  const context = getAudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;
  const volume = options.volume ?? 0.45;

  oscillator.type = options.type ?? "sine";
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency ?? frequency, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function playFlipSound() {
  playTone(520, 0.08, { endFrequency: 700, type: "triangle", volume: 0.24 });
}

function playMatchSound() {
  playTone(660, 0.12, { type: "triangle", volume: 0.26 });
  setTimeout(() => playTone(880, 0.16, { type: "triangle", volume: 0.24 }), 90);
}

function playMismatchSound() {
  playTone(220, 0.16, { endFrequency: 150, type: "sawtooth", volume: 0.16 });
}

function playClearSound() {
  [523, 659, 784, 1047].forEach((frequency, index) => {
    setTimeout(() => playTone(frequency, 0.22, { type: "triangle", volume: 0.28 }), index * 120);
  });
}

function playBgmStep() {
  const notes = [262, 330, 392, 330, 294, 349, 440, 349];
  const note = notes[Math.floor(Date.now() / 850) % notes.length];
  playTone(note, 0.32, { type: "sine", volume: 0.055 });
}

function startBgm() {
  if (!soundEnabled || bgmTimerId) {
    return;
  }

  playBgmStep();
  bgmTimerId = setInterval(playBgmStep, 850);
}

function stopBgm() {
  clearInterval(bgmTimerId);
  bgmTimerId = null;
}

function updateSoundButton() {
  soundButton.classList.toggle("is-muted", !soundEnabled);
  soundButton.setAttribute("aria-label", soundEnabled ? "音をミュート" : "音をオン");
  soundIcon.textContent = soundEnabled ? "♪" : "×";
  soundState.textContent = soundEnabled ? "ON" : "OFF";
}

function toggleSound() {
  if (!soundEnabled) {
    soundEnabled = true;
    getAudioContext();
    playTone(740, 0.1, { type: "triangle", volume: 0.2 });
    updateSoundButton();

    if (startedAt) {
      startBgm();
    }
  } else {
    playTone(260, 0.08, { endFrequency: 180, type: "triangle", volume: 0.14 });
    soundEnabled = false;
    updateSoundButton();
    stopBgm();
  }
}

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

function createCard(image, index) {
  const card = document.createElement("button");
  card.className = "card";
  card.type = "button";
  card.dataset.symbol = image.src;
  card.setAttribute("aria-label", `${index + 1}枚目のカード`);

  card.innerHTML = `
    <span class="card-inner">
      <span class="card-face card-back"></span>
      <span class="card-face card-front" aria-hidden="true">
        <img src="${image.src}" alt="${image.label}" />
      </span>
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
  playMismatchSound();

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
  playMatchSound();
  updateStats();
  resetSelection();

  if (matches === cardImages.length) {
    finishGame();
  }
}

function flipCard(card) {
  if (lockBoard || card === firstCard || card.classList.contains("is-matched")) {
    return;
  }

  startTimer();
  startBgm();
  playFlipSound();
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
  stopBgm();
  playClearSound();
  const elapsed = timerEl.textContent;
  resultText.textContent = `${moves}手、${elapsed}で全ペアを見つけました。`;
  result.hidden = false;
}

function newGame() {
  stopTimer();
  stopBgm();
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  moves = 0;
  matches = 0;
  startedAt = null;
  timerEl.textContent = "00:00";
  result.hidden = true;
  updateStats();

  const deck = shuffle([...cardImages, ...cardImages]);
  board.replaceChildren(...deck.map(createCard));
}

restartButton.addEventListener("click", newGame);
playAgainButton.addEventListener("click", newGame);
soundButton.addEventListener("click", toggleSound);

updateSoundButton();
newGame();
