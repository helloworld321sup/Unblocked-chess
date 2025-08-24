const chess = new Chess();
const board = document.querySelector('.chess-board');
let selectedSquare = null;
let lastMove = null;
let moveCount = 1;

const pieceImages = {
  wP: "https://static.stands4.com/images/symbol/3409_white-pawn.png",
  wR: "https://static.stands4.com/images/symbol/3406_white-rook.png",
  wN: "https://static.stands4.com/images/symbol/3408_white-knight.png",
  wB: "https://static.stands4.com/images/symbol/3407_white-bishop.png",
  wQ: "https://static.stands4.com/images/symbol/3405_white-queen.png",
  wK: "https://static.stands4.com/images/symbol/3404_white-king.png",
  bP: "https://static.stands4.com/images/symbol/3403_black-pawn.png",
  bR: "https://static.stands4.com/images/symbol/3400_black-rook.png",
  bN: "https://static.stands4.com/images/symbol/3402_black-knight.png",
  bB: "https://static.stands4.com/images/symbol/3401_black-bishop.png",
  bQ: "https://static.stands4.com/images/symbol/3399_black-queen.png",
  bK: "https://static.stands4.com/images/symbol/3398_black-king.png",
};

// --- Sounds ---
const sounds = {
  move: new Audio("http://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3"),
  capture: new Audio("http://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3"),
  castle: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/castle.mp3"),
  check: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3"),
  promotion: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/promote.mp3"),
  checkmate: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_WEBM_/default/game-end.webm")
};

const resetButton = document.getElementById("reset-button");
const undoButton = document.getElementById("undo-button");

// --- Render Board ---
function renderBoard() {
  const positions = chess.board();
  board.querySelectorAll('.square').forEach(square => {
    const squareName = square.getAttribute('data-square');
    const file = squareName.charCodeAt(0) - 97;
    const rank = 8 - parseInt(squareName[1]);
    const piece = positions[rank][file];

    square.innerHTML = '';
    square.classList.remove('selected', 'highlight', 'recent-move');

    if (piece) {
      const key = piece.color + piece.type.toUpperCase();
      const img = document.createElement('img');
      img.src = pieceImages[key];
      img.alt = key;
      square.appendChild(img);
    }
  });

  const notationsDiv = document.getElementById('notations');
  let moveHistory = [];
  let currentMoveIndex = -1;

  function addMoveToHistory(move) {
    moveHistory = moveHistory.slice(0, currentMoveIndex + 1);
    moveHistory.push(move.san);
    currentMoveIndex++;
    updateNotations();
  }

  function updateNotations() {
    const movesToShow = moveHistory.slice(0, currentMoveIndex + 1);
    let formatted = "";
    
    for (let i = 0; i < movesToShow.length; i++) {
      if (i % 2 === 0) {
        formatted += `${Math.floor(i / 2) + 1}. ${movesToShow[i]} `;
      } else {
        formatted += `${movesToShow[i]}  `;
      }
    }

    notationsDiv.textContent = formatted.trim();
  }

  const legalMoves = chess.moves({ square: selectedSquare, verbose: true });
  legalMoves.forEach(move => {
    const target = document.querySelector(`[data-square="${move.to}"]`);
    if (target) {
      const dot = document.createElement('div');
      dot.classList.add('move-dot');
      target.appendChild(dot);
    }
  });

  // Highlight selected piece
  if (selectedSquare) {
    const selectedEl = document.querySelector(`[data-square="${selectedSquare}"]`);
    if (selectedEl) selectedEl.classList.add('selected');
  }

  // Highlight last move
  if (lastMove) {
    const fromSquare = document.querySelector(`[data-square="${lastMove.from}"]`);
    const toSquare = document.querySelector(`[data-square="${lastMove.to}"]`);
    if (fromSquare) fromSquare.classList.add('recent-move');
    if (toSquare) toSquare.classList.add('recent-move');
  }
}

// --- Play sound depending on move ---
function playMoveSound(move) {
  if (!move) return;

  if (move.flags.includes("c")) {
    sounds.capture.play();
  } else if (move.flags.includes("k") || move.flags.includes("q")) {
    sounds.castle.play();
  } else if (move.flags.includes("p")) {
    sounds.promotion.play();
  } else {
    sounds.move.play();
  }

  if (chess.in_checkmate()) {
    sounds.checkmate.play();
  } else if (chess.in_check()) {
    sounds.check.play();
  }
}

// --- Click Handler ---
board.addEventListener('click', e => {
  const targetSquare = e.target.closest('.square');
  if (!targetSquare) return;

  const clicked = targetSquare.getAttribute('data-square');
  const piece = chess.get(clicked);

  if (selectedSquare) {
    const move = chess.move({ from: selectedSquare, to: clicked, promotion: 'q' });
    if (move) {
      lastMove = move;
      playMoveSound(move); // <-- play sound here
      selectedSquare = null;
      moveCount++;
      renderBoard();
      return;
    } else if (piece && piece.color === chess.turn()) {
      selectedSquare = clicked;
    } else {
      selectedSquare = null;
    }
  } else {
    if (piece && piece.color === chess.turn()) selectedSquare = clicked;
  }

  renderBoard();
});

// --- Reset Board ---
resetButton.addEventListener("click", () => {
  chess.reset();
  moveCount = 1;
  selectedSquare = null;
  lastMove = null;
  renderBoard();
});

// --- Undo Move ---
undoButton.addEventListener("click", () => {
  const move = chess.undo();
  if (move) {
    moveCount--;
    selectedSquare = null;
    lastMove = chess.history({ verbose: true }).slice(-1)[0] || null;
    renderBoard();
  }
});

// --- Initial Render ---
renderBoard();

