const BOARD_WIDTH = 920;
const BOARD_HEIGHT = 690;
const STONES_PER_PLAYER = 9;

const nodes = [
  { x: 203, y: 150, r: 15 }, // 0  outer top-left
  { x: 464, y: 150, r: 16 }, // 1  outer top-mid
  { x: 715, y: 148, r: 16 }, // 2  outer top-right
  { x: 465, y: 200, r: 16 }, // 3  middle top-mid
  { x: 634, y: 198, r: 17 }, // 4  middle top-right
  { x: 284, y: 200, r: 16 }, // 5  middle top-left
  { x: 462, y: 252, r: 17 }, // 6  inner top-mid
  { x: 550, y: 258, r: 17 }, // 7  inner top-right
  { x: 369, y: 255, r: 18 }, // 8  inner top-left
  { x: 275, y: 309, r: 18 }, // 9  inner left-mid
  { x: 186, y: 305, r: 17 }, // 10 outer left-mid
  { x: 365, y: 307, r: 17 }, // 11 middle left-mid
  { x: 552, y: 312, r: 17 }, // 12 inner right-mid
  { x: 647, y: 313, r: 18 }, // 13 middle right-mid
  { x: 737, y: 310, r: 17 }, // 14 outer right-mid
  { x: 361, y: 369, r: 17 }, // 15 inner bottom-left
  { x: 455, y: 372, r: 18 }, // 16 inner bottom-mid
  { x: 555, y: 373, r: 17 }, // 17 inner bottom-right
  { x: 656, y: 433, r: 18 }, // 18 middle bottom-right
  { x: 265, y: 434, r: 19 }, // 19 middle bottom-left
  { x: 458, y: 435, r: 18 }, // 20 middle bottom-mid
  { x: 163, y: 497, r: 18 }, // 21 outer bottom-left
  { x: 454, y: 497, r: 18 }, // 22 outer bottom-mid
  { x: 762, y: 500, r: 18 }  // 23 outer bottom-right
];

// Adjacency for the 24-point square Mola / Nine Men's Morris style board
const connections = {
  0:  [1, 10],
  1:  [0, 2, 3],
  2:  [1, 14],

  3:  [1, 4, 5, 6],
  4:  [3, 13],
  5:  [3, 9],

  6:  [3, 7, 8],
  7:  [6, 12],
  8:  [6, 11],

  9:  [5, 10, 11, 19],
  10: [0, 9, 21],
  11: [8, 9, 15],

  12: [7, 13, 17],
  13: [4, 12, 14, 18],
  14: [2, 13, 23],

  15: [11, 16],
  16: [15, 17, 20],
  17: [12, 16],

  18: [13, 20],
  19: [9, 20],
  20: [16, 18, 19, 22],

  21: [10, 22],
  22: [20, 21, 23],
  23: [14, 22]
};

// All valid mills (3 in a row)
const mills = [
  // outer square
  [0, 1, 2],
  [0, 10, 21],
  [21, 22, 23],
  [2, 14, 23],

  // middle square
  [5, 3, 4],
  [5, 9, 19],
  [19, 20, 18],
  [4, 13, 18],

  // inner square
  [8, 6, 7],
  [8, 11, 15],
  [15, 16, 17],
  [7, 12, 17],

  // connector lines
  [1, 3, 6],
  [10, 9, 11],
  [22, 20, 16],
  [14, 13, 12]
];

let board = Array(24).fill(null);
let currentPlayer = 1;
let placed = { 1: 0, 2: 0 };
let selected = null;
let gameOver = false;
let removeMode = false;
let hintsEnabled = true;

const game = document.getElementById("game");
const holesContainer = document.getElementById("holes");
const piecesContainer = document.getElementById("pieces");

const turnText = document.getElementById("turnText");
const countP1Board = document.getElementById("countP1Board");
const countP2Board = document.getElementById("countP2Board");
const toggleHintsBtn = document.getElementById("toggleHintsBtn");
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

function getPlayerStoneCount(player) {
  return board.filter(v => v === player).length;
}

function isPlacementPhase() {
  return placed[1] < STONES_PER_PLAYER || placed[2] < STONES_PER_PLAYER;
}

function getOpponent(player) {
  return player === 1 ? 2 : 1;
}

function clearSelection() {
  document.querySelectorAll(".piece.selected").forEach(el => {
    el.classList.remove("selected");
  });
  selected = null;
}

function updatePiecePosition(pieceEl, index) {
  const p = getNodePixel(index);
  pieceEl.style.left = `${p.x}px`;
  pieceEl.style.top = `${p.y}px`;
  pieceEl.dataset.index = String(index);
}

function getPieceElementAt(index) {
  return [...document.querySelectorAll(".piece")].find(
    el => Number(el.dataset.index) === index
  );
}

function isMillAt(index, player) {
  return mills.some(line =>
    line.includes(index) && line.every(i => board[i] === player)
  );
}

function formsMill(index, player) {
  return isMillAt(index, player);
}

function getRemovableOpponentNodes(player) {
  const opponent = getOpponent(player);
  const opponentNodes = board
    .map((value, index) => (value === opponent ? index : null))
    .filter(v => v !== null);

  const outsideMill = opponentNodes.filter(index => !isMillAt(index, opponent));
  return outsideMill.length > 0 ? outsideMill : opponentNodes;
}

function hasAnyLegalMove(player) {
  if (isPlacementPhase()) return true;

  return board.some((occupant, index) => {
    if (occupant !== player) return false;
    return connections[index].some(next => board[next] === null);
  });
}

function refreshHoles() {
  document.querySelectorAll(".hole").forEach((holeEl, index) => {
    holeEl.classList.remove("occupied", "valid-target");

    if (board[index] !== null || gameOver || removeMode) {
      holeEl.classList.add("occupied");
      return;
    }

    if (selected && hintsEnabled && !isPlacementPhase()) {
      if (connections[selected.from].includes(index)) {
        holeEl.classList.add("valid-target");
      } else {
        holeEl.classList.add("occupied");
      }
    }
  });
}

function refreshPieceHighlights() {
  document.querySelectorAll(".piece").forEach(piece => {
    piece.classList.remove("removable");
  });

  if (!removeMode || gameOver) return;

  const removable = new Set(getRemovableOpponentNodes(currentPlayer));
  document.querySelectorAll(".piece").forEach(piece => {
    const index = Number(piece.dataset.index);
    if (removable.has(index)) {
      piece.classList.add("removable");
    }
  });
}

function updateStatus() {
  countP1Board.textContent = getPlayerStoneCount(1);
  countP2Board.textContent = getPlayerStoneCount(2);

  if (gameOver) {
    turnText.textContent = "Het spel is voorbij";
    turnText.className = "value";
    return;
  }

  if (removeMode) {
    turnText.textContent = `Speler ${currentPlayer}: neem 1 steen van je tegenstander weg`;
    turnText.className = `value player-${currentPlayer}`;
    return;
  }

  if (isPlacementPhase()) {
    turnText.textContent = `Speler ${currentPlayer}: kies een lege plek en plaats je steen`;
  } else {
    if (!selected) {
      turnText.textContent = `Speler ${currentPlayer}: kies een steen om te verplaatsen`;
    } else {
      turnText.textContent = `Speler ${currentPlayer}: kies een aangrenzende lege plek`;
    }
  }

  turnText.className = `value player-${currentPlayer}`;
}

function showWinPopup(player) {
  gameOver = true;
  clearSelection();
  refreshHoles();
  refreshPieceHighlights();
  updateStatus();

  winMessage.textContent = `Speler ${player} wint!`;
  winModal.classList.remove("hidden");
}

function hideWinPopup() {
  winModal.classList.add("hidden");
}

function checkForEndOfGame() {
  const opponent = getOpponent(currentPlayer);

  if (getPlayerStoneCount(opponent) < 3) {
    showWinPopup(currentPlayer);
    return true;
  }

  if (!isPlacementPhase() && !hasAnyLegalMove(opponent)) {
    showWinPopup(currentPlayer);
    return true;
  }

  return false;
}

function switchPlayer() {
  currentPlayer = getOpponent(currentPlayer);
  clearSelection();
  refreshHoles();
  refreshPieceHighlights();
  updateStatus();

  if (!isPlacementPhase() && !hasAnyLegalMove(currentPlayer)) {
    showWinPopup(getOpponent(currentPlayer));
  }
}

function finishTurnAfterAction(targetIndex) {
  refreshHoles();
  refreshPieceHighlights();
  updateStatus();

  if (!isPlacementPhase() && formsMill(targetIndex, currentPlayer)) {
    removeMode = true;
    refreshHoles();
    refreshPieceHighlights();
    updateStatus();
    return;
  }

  switchPlayer();
}

function createPiece(player, index) {
  const el = document.createElement("img");
  el.src = player === 1 ? "stone1.png" : "stone2.png";
  el.className = "piece";
  el.dataset.player = String(player);
  el.draggable = false;

  updatePiecePosition(el, index);

  el.addEventListener("click", event => {
    event.stopPropagation();

    if (gameOver) return;

    const piecePlayer = Number(el.dataset.player);
    const pieceIndex = Number(el.dataset.index);

    if (removeMode) {
      const removable = getRemovableOpponentNodes(currentPlayer);
      if (piecePlayer !== getOpponent(currentPlayer)) return;
      if (!removable.includes(pieceIndex)) return;

      board[pieceIndex] = null;
      el.remove();

      removeMode = false;
      clearSelection();
      refreshHoles();
      refreshPieceHighlights();
      updateStatus();

      if (checkForEndOfGame()) return;

      switchPlayer();
      return;
    }

    if (isPlacementPhase()) return;
    if (piecePlayer !== currentPlayer) return;

    clearSelection();
    el.classList.add("selected");
    selected = {
      el,
      from: pieceIndex
    };

    refreshHoles();
    updateStatus();
  });

  piecesContainer.appendChild(el);
}

function handleHoleClick(index) {
  if (gameOver || removeMode) return;

  // Phase 1: placing
  if (placed[currentPlayer] < STONES_PER_PLAYER) {
    if (board[index] !== null) return;

    board[index] = currentPlayer;
    createPiece(currentPlayer, index);
    placed[currentPlayer]++;

    finishTurnAfterAction(index);
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

  finishTurnAfterAction(index);
}

function createHoles() {
  holesContainer.innerHTML = "";

  nodes.forEach((node, index) => {
    const hole = document.createElement("div");
    const x = scaleX(node.x);
    const y = scaleY(node.y);
    const r = Math.max(scaleR(node.r), 14);

    hole.className = "hole";
    hole.dataset.index = String(index);
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
  board = Array(24).fill(null);
  currentPlayer = 1;
  placed = { 1: 0, 2: 0 };
  selected = null;
  gameOver = false;
  removeMode = false;

  piecesContainer.innerHTML = "";
  hideWinPopup();
  createHoles();
  refreshPieceHighlights();
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
  refreshPieceHighlights();
});

toggleHintsBtn.addEventListener("click", () => {
  hintsEnabled = !hintsEnabled;

  toggleHintsBtn.textContent = hintsEnabled
    ? "Zet hints uit"
    : "Zet hints aan";

  refreshHoles();
});
