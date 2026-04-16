const BOARD_WIDTH = 4032;
const BOARD_HEIGHT = 3024;

const nodes = [
  { x: 1633, y: 581,  r: 138 }, // 0 top
  { x: 2705, y: 648,  r: 132 }, // 1 top-right
  { x: 3251, y: 1110, r: 131 }, // 2 right
  { x: 3325, y: 1923, r: 130 }, // 3 bottom-right
  { x: 2506, y: 2636, r: 135 }, // 4 bottom
  { x: 1263, y: 2508, r: 139 }, // 5 bottom-left
  { x: 732,  y: 1752, r: 132 }, // 6 left
  { x: 935,  y: 1040, r: 132 }, // 7 top-left
  { x: 2064, y: 1519, r: 132 }  // 8 center
];

const connections = {
  0: [1, 7, 8],
  1: [0, 2, 8],
  2: [1, 3, 8],
  3: [2, 4, 8],
  4: [3, 5, 8],
  5: [4, 6, 8],
  6: [5, 7, 8],
  7: [6, 0, 8],
  8: [0, 1, 2, 3, 4, 5, 6, 7]
};

const winningLines = [
  [0, 8, 4],
  [1, 8, 5],
  [2, 8, 6],
  [3, 8, 7]
];

let board = Array(9).fill(null);
let currentPlayer = 1;
let placed = { 1: 0, 2: 0 };
let selected = null;
let gameOver = false;

const game = document.getElementById("game");
const boardImg = document.getElementById("board");
const holesContainer = document.getElementById("holes");
const piecesContainer = document.getElementById("pieces");

const phaseText = document.getElementById("phaseText");
const turnText = document.getElementById("turnText");
const countP1 = document.getElementById("countP1");
const countP2 = document.getElementById("countP2");
const resetBtn = document.getElementById("resetBtn");

const winModal = document.getElementById("winModal");
const winMessage = document.getElementById("winMessage");
const playAgainBtn = document.getElementById("playAgainBtn");

function scaleX(x) {
  return (x / BOARD_WIDTH) * game.clientWidth;
}

function scaleY(y) {
  return (y / BOARD_HEIGHT) * game.clientHeight;
}

function scaleR(r) {
  const sx = game.clientWidth / BOARD_WIDTH;
  const sy = game.clientHeight / BOARD_HEIGHT;
  return r * Math.min(sx, sy);
}

function getNodePixel(index) {
  const n = nodes[index];
  return {
    x: scaleX(n.x),
    y: scaleY(n.y)
  };
}

function updatePiecePosition(pieceEl, index) {
  const p = getNodePixel(index);
  pieceEl.style.left = `${p.x}px`;
  pieceEl.style.top = `${p.y}px`;
  pieceEl.dataset.index = String(index);
}

function isPlacementPhase() {
  return placed[1] < 3 || placed[2] < 3;
}

function checkWin(player) {
  return winningLines.some(line => line.every(i => board[i] === player));
}

function clearSelection() {
  document.querySelectorAll(".piece.selected").forEach(el => {
    el.classList.remove("selected");
  });
  selected = null;
}

function switchPlayer() {
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updateStatus();
}

function refreshHoles() {
  document.querySelectorAll(".hole").forEach((holeEl, index) => {
    if (board[index] !== null || gameOver) {
      holeEl.classList.add("occupied");
    } else {
      holeEl.classList.remove("occupied");
    }
  });
}

function updateStatus() {
  countP1.textContent = placed[1];
  countP2.textContent = placed[2];

  if (gameOver) {
    phaseText.textContent = "Afgelopen";
    turnText.textContent = "Het spel is voorbij";
    turnText.className = "value";
    return;
  }

  if (isPlacementPhase()) {
    phaseText.textContent = "Plaatsen";

    turnText.textContent =
      `Speler ${currentPlayer}: kies een plek en plaats je steen`;

  } else {
    phaseText.textContent = "Verplaatsen";

    if (!selected) {
      turnText.textContent =
        `Speler ${currentPlayer}: kies een steen om te verplaatsen`;

    } else {
      turnText.textContent =
        `Speler ${currentPlayer}: kies een lege (aangrenzende) plek om naartoe te bewegen`;
    }
  }

  turnText.className = `value player-${currentPlayer}`;
}

function showWinPopup(player) {
  gameOver = true;
  updateStatus();
  refreshHoles();
  clearSelection();

  winMessage.textContent = `Speler ${player} wint!`;
  winModal.classList.remove("hidden");
}

function hideWinPopup() {
  winModal.classList.add("hidden");
}

function createPiece(player, index) {
  const el = document.createElement("img");
  el.src = player === 1 ? "stone1.png" : "stone2.png";
  el.className = "piece";
  el.dataset.player = String(player);
  el.draggable = false;

  updatePiecePosition(el, index);

  el.addEventListener("click", (event) => {
    event.stopPropagation();

    if (gameOver) return;
    if (isPlacementPhase()) return;
    if (player !== currentPlayer) return;

    clearSelection();
    el.classList.add("selected");
    selected = {
      el,
      from: Number(el.dataset.index)
    };

    updateStatus();
  });

  piecesContainer.appendChild(el);
}

function handleHoleClick(index) {
  if (gameOver) return;

  // Phase 1: placing
  if (placed[currentPlayer] < 3) {
    if (board[index] !== null) return;

    board[index] = currentPlayer;
    createPiece(currentPlayer, index);
    placed[currentPlayer]++;

    refreshHoles();
    updateStatus();

    if (checkWin(currentPlayer)) {
      showWinPopup(currentPlayer);
      return;
    }

    switchPlayer();
    return;
  }

  // Phase 2: moving
  if (!selected) return;
  if (board[index] !== null) return;
  if (!connections[selected.from].includes(index)) return;

  board[selected.from] = null;
  board[index] = currentPlayer;

  updatePiecePosition(selected.el, index);
  selected.el.classList.remove("selected");
  selected = null;

  refreshHoles();
  updateStatus();

  if (checkWin(currentPlayer)) {
    showWinPopup(currentPlayer);
    return;
  }

  switchPlayer();
}

function createHoles() {
  holesContainer.innerHTML = "";

  nodes.forEach((node, index) => {
    const hole = document.createElement("div");
    const x = scaleX(node.x);
    const y = scaleY(node.y);
    const r = scaleR(node.r);

    hole.className = "hole";
    hole.style.left = `${x}px`;
    hole.style.top = `${y}px`;
    hole.style.width = `${r * 2}px`;
    hole.style.height = `${r * 2}px`;

    hole.addEventListener("click", () => handleHoleClick(index));

    holesContainer.appendChild(hole);
  });

  refreshHoles();
}

function repositionPieces() {
  document.querySelectorAll(".piece").forEach(pieceEl => {
    const index = Number(pieceEl.dataset.index);
    updatePiecePosition(pieceEl, index);
  });
}

function resetGame() {
  board = Array(9).fill(null);
  currentPlayer = 1;
  placed = { 1: 0, 2: 0 };
  selected = null;
  gameOver = false;

  piecesContainer.innerHTML = "";
  hideWinPopup();
  createHoles();
  updateStatus();
}

resetBtn.addEventListener("click", resetGame);
playAgainBtn.addEventListener("click", resetGame);

window.addEventListener("load", () => {
  createHoles();
  updateStatus();
});

window.addEventListener("resize", () => {
  createHoles();
  repositionPieces();
});
