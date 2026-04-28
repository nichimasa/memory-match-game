const cardImages = [
  { src: "assets/cards/card-1.jpeg?v=20260428-new-cards-pause", label: "写真1" },
  { src: "assets/cards/card-2.png?v=20260428-new-cards-pause", label: "写真2" },
  { src: "assets/cards/card-3.jpeg?v=20260428-new-cards-pause", label: "写真3" },
  { src: "assets/cards/card-4.png?v=20260428-new-cards-pause", label: "写真4" },
  { src: "assets/cards/card-5.png?v=20260428-new-cards-pause", label: "写真5" },
  { src: "assets/cards/card-6.png?v=20260428-new-cards-pause", label: "写真6" },
  { src: "assets/cards/card-7.png?v=20260428-new-cards-pause", label: "写真7" },
  { src: "assets/cards/card-8.png?v=20260428-new-cards-pause", label: "写真8" },
];

const board = document.querySelector("#board");
const movesEl = document.querySelector("#moves");
const matchesEl = document.querySelector("#matches");
const timerEl = document.querySelector("#timer");
const result = document.querySelector("#result");
const resultText = document.querySelector("#resultText");
const confetti = document.querySelector("#confetti");
const galleryImage = document.querySelector("#galleryImage");
const galleryCount = document.querySelector("#galleryCount");
const galleryThumbs = document.querySelector("#galleryThumbs");
const prevImageButton = document.querySelector("#prevImageButton");
const nextImageButton = document.querySelector("#nextImageButton");
const soundButton = document.querySelector("#soundButton");
const soundIcon = document.querySelector("#soundIcon");
const soundState = document.querySelector("#soundState");
const pauseButton = document.querySelector("#pauseButton");
const pauseIcon = document.querySelector("#pauseIcon");
const pauseOverlay = document.querySelector("#pauseOverlay");
const resumeButton = document.querySelector("#resumeButton");
const restartButton = document.querySelector("#restartButton");
const playAgainButton = document.querySelector("#playAgainButton");

let firstCard = null;
let secondCard = null;
let lockBoard = false;
let moves = 0;
let matches = 0;
let startedAt = null;
let timerId = null;
let elapsedBeforePause = 0;
let gameStarted = false;
let isPaused = false;
let galleryIndex = 0;
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

    if (gameStarted && !isPaused && result.hidden) {
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

function getElapsedSeconds() {
  if (!startedAt) {
    return elapsedBeforePause;
  }

  return elapsedBeforePause + Math.floor((Date.now() - startedAt) / 1000);
}

function renderTimer() {
  timerEl.textContent = formatTime(getElapsedSeconds());
}

function startTimer() {
  if (timerId) {
    return;
  }

  gameStarted = true;
  startedAt = Date.now();
  pauseButton.disabled = false;
  timerId = setInterval(renderTimer, 1000);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
  startedAt = null;
}

function updatePauseButton() {
  pauseButton.setAttribute("aria-label", isPaused ? "再開" : "一時停止");
  pauseIcon.textContent = isPaused ? "▶" : "Ⅱ";
}

function pauseGame() {
  if (!gameStarted || isPaused || lockBoard || !result.hidden) {
    return;
  }

  elapsedBeforePause = getElapsedSeconds();
  stopTimer();
  stopBgm();
  isPaused = true;
  lockBoard = true;
  pauseOverlay.hidden = false;
  updatePauseButton();
}

function resumeGame() {
  if (!isPaused) {
    return;
  }

  isPaused = false;
  lockBoard = false;
  pauseOverlay.hidden = true;
  updatePauseButton();
  startTimer();
  startBgm();
}

function togglePause() {
  if (isPaused) {
    resumeGame();
  } else {
    pauseGame();
  }
}

function updateStats() {
  movesEl.textContent = moves;
  matchesEl.textContent = matches;
}

function showGalleryImage(index) {
  galleryIndex = (index + cardImages.length) % cardImages.length;
  const image = cardImages[galleryIndex];
  galleryImage.src = image.src;
  galleryImage.alt = image.label;
  galleryCount.textContent = `${galleryIndex + 1} / ${cardImages.length}`;

  [...galleryThumbs.children].forEach((thumb, thumbIndex) => {
    thumb.classList.toggle("is-active", thumbIndex === galleryIndex);
  });
}

function buildGallery() {
  galleryThumbs.replaceChildren(
    ...cardImages.map((image, index) => {
      const button = document.createElement("button");
      button.className = "gallery-thumb";
      button.type = "button";
      button.setAttribute("aria-label", `${image.label}を表示`);
      button.innerHTML = `<img src="${image.src}" alt="${image.label}" />`;
      button.addEventListener("click", () => showGalleryImage(index));
      return button;
    }),
  );

  showGalleryImage(0);
}

function launchConfetti() {
  const colors = ["#e0a832", "#227c6f", "#274c77", "#d94f70", "#f4f1ea"];
  const pieces = Array.from({ length: 64 }, (_, index) => {
    const piece = document.createElement("span");
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.45}s`;
    piece.style.transform = `rotate(${Math.random() * 180}deg)`;
    return piece;
  });

  confetti.replaceChildren(...pieces);
  setTimeout(() => confetti.replaceChildren(), 2300);
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
    if (isPaused) {
      return;
    }

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
  if (isPaused || lockBoard || card === firstCard || card.classList.contains("is-matched")) {
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
  elapsedBeforePause = getElapsedSeconds();
  renderTimer();
  stopTimer();
  stopBgm();
  pauseButton.disabled = true;
  playClearSound();
  const elapsed = timerEl.textContent;
  resultText.textContent = `${moves}手、${elapsed}で全ペアを見つけました。`;
  buildGallery();
  result.hidden = false;
  result.classList.add("is-celebrating");
  launchConfetti();
}

function newGame() {
  stopTimer();
  stopBgm();
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  moves = 0;
  matches = 0;
  elapsedBeforePause = 0;
  gameStarted = false;
  isPaused = false;
  startedAt = null;
  timerEl.textContent = "00:00";
  result.hidden = true;
  result.classList.remove("is-celebrating");
  confetti.replaceChildren();
  pauseOverlay.hidden = true;
  pauseButton.disabled = true;
  updatePauseButton();
  updateStats();

  const deck = shuffle([...cardImages, ...cardImages]);
  board.replaceChildren(...deck.map(createCard));
}

restartButton.addEventListener("click", newGame);
playAgainButton.addEventListener("click", newGame);
soundButton.addEventListener("click", toggleSound);
pauseButton.addEventListener("click", togglePause);
resumeButton.addEventListener("click", resumeGame);
prevImageButton.addEventListener("click", () => showGalleryImage(galleryIndex - 1));
nextImageButton.addEventListener("click", () => showGalleryImage(galleryIndex + 1));

updateSoundButton();
newGame();
