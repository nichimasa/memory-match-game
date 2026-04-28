const assetVersion = "20260428-stages-1";
const finalImage = `assets/stages/final.jpg?v=${assetVersion}`;

const stages = [
  {
    title: "Stage 1",
    images: [
      "assets/stages/stage-1/card-1.png",
      "assets/stages/stage-1/card-2.png",
      "assets/stages/stage-1/card-3.png",
      "assets/stages/stage-1/card-4.png",
      "assets/stages/stage-1/card-5.png",
      "assets/stages/stage-1/card-6.png",
      "assets/stages/stage-1/card-7.png",
      "assets/stages/stage-1/card-8.png",
    ],
  },
  {
    title: "Stage 2",
    images: [
      "assets/stages/stage-2/card-1.png",
      "assets/stages/stage-2/card-2.png",
      "assets/stages/stage-2/card-3.jpeg",
      "assets/stages/stage-2/card-4.jpeg",
      "assets/stages/stage-2/card-5.png",
      "assets/stages/stage-2/card-6.png",
      "assets/stages/stage-2/card-7.png",
      "assets/stages/stage-2/card-8.jpg",
    ],
  },
  {
    title: "Stage 3",
    images: [
      "assets/stages/stage-3/card-1.png",
      "assets/stages/stage-3/card-2.png",
      "assets/stages/stage-3/card-3.png",
      "assets/stages/stage-3/card-4.png",
      "assets/stages/stage-3/card-5.png",
      "assets/stages/stage-3/card-6.png",
      "assets/stages/stage-3/card-7.png",
      "assets/stages/stage-3/card-8.png",
    ],
  },
  {
    title: "Stage 4",
    images: [
      "assets/stages/stage-4/card-1.png",
      "assets/stages/stage-4/card-2.png",
      "assets/stages/stage-4/card-3.png",
      "assets/stages/stage-4/card-4.png",
      "assets/stages/stage-4/card-5.png",
      "assets/stages/stage-4/card-6.webp",
      "assets/stages/stage-4/card-7.png",
      "assets/stages/stage-4/card-8.png",
    ],
  },
].map((stage) => ({
  ...stage,
  images: stage.images.map((src, index) => ({
    src: `${src}?v=${assetVersion}`,
    label: `${stage.title} 写真${index + 1}`,
  })),
}));

const stageView = document.querySelector("#stageView");
const gameView = document.querySelector("#gameView");
const stagePuzzle = document.querySelector("#stagePuzzle");
const stageList = document.querySelector("#stageList");
const stageProgressText = document.querySelector("#stageProgressText");
const resetProgressButton = document.querySelector("#resetProgressButton");
const board = document.querySelector("#board");
const stageNumberEl = document.querySelector("#stageNumber");
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
const homeButton = document.querySelector("#homeButton");
const soundButton = document.querySelector("#soundButton");
const soundIcon = document.querySelector("#soundIcon");
const soundState = document.querySelector("#soundState");
const pauseButton = document.querySelector("#pauseButton");
const pauseIcon = document.querySelector("#pauseIcon");
const pauseOverlay = document.querySelector("#pauseOverlay");
const resumeButton = document.querySelector("#resumeButton");
const restartButton = document.querySelector("#restartButton");
const playAgainButton = document.querySelector("#playAgainButton");
const stageSelectButton = document.querySelector("#stageSelectButton");

let currentStageIndex = 0;
let completedStages = loadCompletedStages();
let newlyCompletedStage = null;
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

function loadCompletedStages() {
  try {
    const saved = JSON.parse(localStorage.getItem("memoryMatchCompletedStages") || "[]");
    return new Set(saved.filter((index) => Number.isInteger(index)));
  } catch {
    return new Set();
  }
}

function saveCompletedStages() {
  localStorage.setItem("memoryMatchCompletedStages", JSON.stringify([...completedStages]));
}

function getStageImages() {
  return stages[currentStageIndex].images;
}

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

function playCompleteSound() {
  [392, 523, 659, 784, 1047].forEach((frequency, index) => {
    setTimeout(() => playTone(frequency, 0.22, { type: "triangle", volume: 0.3 }), index * 110);
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
  stageNumberEl.textContent = currentStageIndex + 1;
  movesEl.textContent = moves;
  matchesEl.textContent = matches;
}

function setGameControlsEnabled(isEnabled) {
  homeButton.hidden = !isEnabled;
  pauseButton.disabled = !isEnabled || !gameStarted;
  restartButton.disabled = !isEnabled;
}

function renderStageSelection() {
  const completedCount = completedStages.size;
  const isAllComplete = completedCount === stages.length;
  stageProgressText.textContent = isAllComplete
    ? "すべてのパネルが開きました。完成画像ができあがりました。"
    : `${completedCount} / ${stages.length} ステージクリア`;

  stagePuzzle.replaceChildren(
    ...stages.map((stage, index) => {
      const tile = document.createElement("button");
      tile.className = "stage-tile";
      tile.type = "button";
      tile.style.setProperty("--tile-bg", `url("${finalImage}")`);
      tile.style.setProperty("--tile-position", getTilePosition(index));
      tile.setAttribute("aria-label", `${stage.title}を開始`);

      if (completedStages.has(index)) {
        tile.classList.add("is-complete");
      }

      if (newlyCompletedStage === index) {
        tile.classList.add("is-newly-complete");
      }

      tile.innerHTML = `
        <span class="stage-tile-inner">
          <span class="stage-tile-face stage-tile-front">
            <span>${stage.title}</span>
          </span>
          <span class="stage-tile-face stage-tile-back"></span>
        </span>
      `;
      tile.addEventListener("click", () => startStage(index));
      return tile;
    }),
  );

  stageList.replaceChildren(
    ...stages.map((stage, index) => {
      const button = document.createElement("button");
      button.className = "stage-list-button";
      button.type = "button";
      button.innerHTML = `
        <span>${stage.title}</span>
        <strong>${completedStages.has(index) ? "CLEAR" : "PLAY"}</strong>
      `;
      button.addEventListener("click", () => startStage(index));
      return button;
    }),
  );
}

function getTilePosition(index) {
  const positions = ["0% 0%", "100% 0%", "0% 100%", "100% 100%"];
  return positions[index];
}

function showStageSelection() {
  stopTimer();
  stopBgm();
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  gameStarted = false;
  isPaused = false;
  result.hidden = true;
  result.classList.remove("is-celebrating");
  pauseOverlay.hidden = true;
  confetti.replaceChildren();
  setGameControlsEnabled(false);
  updatePauseButton();
  renderStageSelection();
  stageView.hidden = false;
  gameView.hidden = true;

  if (newlyCompletedStage !== null) {
    setTimeout(() => {
      newlyCompletedStage = null;
      renderStageSelection();
    }, 1100);
  }
}

function showGalleryImage(index) {
  const images = getStageImages();
  galleryIndex = (index + images.length) % images.length;
  const image = images[galleryIndex];
  galleryImage.src = image.src;
  galleryImage.alt = image.label;
  galleryCount.textContent = `${galleryIndex + 1} / ${images.length}`;

  [...galleryThumbs.children].forEach((thumb, thumbIndex) => {
    thumb.classList.toggle("is-active", thumbIndex === galleryIndex);
  });
}

function buildGallery() {
  const images = getStageImages();
  galleryThumbs.replaceChildren(
    ...images.map((image, index) => {
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

  if (matches === getStageImages().length) {
    finishGame();
  }
}

function flipCard(card) {
  if (isPaused || lockBoard || card === firstCard || card.classList.contains("is-matched")) {
    return;
  }

  startTimer();
  setGameControlsEnabled(true);
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
  completedStages.add(currentStageIndex);
  newlyCompletedStage = currentStageIndex;
  saveCompletedStages();
  playClearSound();

  if (completedStages.size === stages.length) {
    setTimeout(playCompleteSound, 480);
  }

  const elapsed = timerEl.textContent;
  resultText.textContent = `${stages[currentStageIndex].title}を${moves}手、${elapsed}でクリアしました。`;
  buildGallery();
  result.hidden = false;
  result.classList.add("is-celebrating");
  launchConfetti();
}

function startStage(index) {
  currentStageIndex = index;
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
  updatePauseButton();
  updateStats();
  setGameControlsEnabled(true);
  pauseButton.disabled = true;
  stageView.hidden = true;
  gameView.hidden = false;

  const deck = shuffle([...getStageImages(), ...getStageImages()]);
  board.replaceChildren(...deck.map(createCard));
}

function resetProgress() {
  completedStages = new Set();
  newlyCompletedStage = null;
  saveCompletedStages();
  renderStageSelection();
}

homeButton.addEventListener("click", showStageSelection);
restartButton.addEventListener("click", () => startStage(currentStageIndex));
playAgainButton.addEventListener("click", () => startStage(currentStageIndex));
stageSelectButton.addEventListener("click", showStageSelection);
resetProgressButton.addEventListener("click", resetProgress);
soundButton.addEventListener("click", toggleSound);
pauseButton.addEventListener("click", togglePause);
resumeButton.addEventListener("click", resumeGame);
prevImageButton.addEventListener("click", () => showGalleryImage(galleryIndex - 1));
nextImageButton.addEventListener("click", () => showGalleryImage(galleryIndex + 1));

updateSoundButton();
setGameControlsEnabled(false);
showStageSelection();
