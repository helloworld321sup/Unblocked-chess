const chess = new Chess();
const board = document.querySelector('.chess-board');
let selectedSquare = null;

// Piece images
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

// Sidebar elements
const moveCounterEl = document.getElementById("move-counter");
const turnIndicatorEl = document.getElementById("turn-indicator");
const buzzerEl = document.getElementById("checkmate-buzzer");
const buzzerSound = new Audio("checkmate-buzzer.mp3");
const resetButton = document.getElementById("reset-button");

let moveCount = 1;
let playingBot = false;
let botDifficulty = "easy";

// --- Render Board ---
function renderBoard() {
  const positions = chess.board();

  const squares = board.querySelectorAll('.square');
  squares.forEach(square => {
    const squareName = square.getAttribute('data-square');
    const file = squareName.charCodeAt(0) - 97;
    const rank = 8 - parseInt(squareName[1]);

    const piece = positions[rank][file];
    square.innerHTML = '';
    square.classList.remove('selected', 'highlight');

    if (piece) {
      const key = piece.color + piece.type.toUpperCase();
      const img = document.createElement('img');
      img.src = pieceImages[key];
      img.alt = key;
      square.appendChild(img);
    }
  });

  if (selectedSquare) {
    const selectedEl = document.querySelector(`[data-square="${selectedSquare}"]`);
    if (selectedEl) selectedEl.classList.add('selected');

    const legalMoves = chess.moves({ square: selectedSquare, verbose: true });
    legalMoves.forEach(move => {
      const target = document.querySelector(`[data-square="${move.to}"]`);
      if (target) target.classList.add('highlight');
    });
  }

  updateSidebar();
}

// --- Update Sidebar ---
function updateSidebar() {
  moveCounterEl.textContent = `Move: ${moveCount}`;
  const turn = chess.turn() === 'w' ? 'White' : 'Black';
  turnIndicatorEl.textContent = `${turn}'s Move`;

  if (chess.game_over() && chess.in_checkmate()) {
    buzzerEl.classList.add('active');
    buzzerSound.play();
  }
}

// ------------------
// BOT MOVE LOGIC
// ------------------
const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 1000 };

function botMoveEasy(game) {
  const moves = game.moves();
  return moves[Math.floor(Math.random() * moves.length)];
}

function botMoveMedium(game) {
  const moves = game.moves({ verbose: true });
  let best = null, bestScore = -999;
  for (let m of moves) {
    let score = m.captured ? (pieceValues[m.captured.toLowerCase()] || 0) : 0;
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best || moves[Math.floor(Math.random() * moves.length)];
}

function evaluateBoard(game) {
  let board = game.board();
  let score = 0;
  for (let row of board) {
    for (let piece of row) {
      if (piece) {
        let val = pieceValues[piece.type];
        score += piece.color === "w" ? val : -val;
      }
    }
  }
  return score;
}

function minimax(game, depth, alpha, beta, isMax) {
  if (depth === 0 || game.game_over()) return evaluateBoard(game);
  let moves = game.moves();
  if (isMax) {
    let maxEval = -Infinity;
    for (let move of moves) {
      game.move(move);
      let eval = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, eval);
      alpha = Math.max(alpha, eval);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let move of moves) {
      game.move(move);
      let eval = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, eval);
      beta = Math.min(beta, eval);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function botMoveHard(game) {
  let bestMove = null, bestVal = -Infinity;
  let moves = game.moves();
  for (let move of moves) {
    game.move(move);
    let value = minimax(game, 2, -Infinity, Infinity, false);
    game.undo();
    if (value > bestVal) {
      bestVal = value;
      bestMove = move;
    }
  }
  return bestMove;
}

function makeBotMove() {
  if (!playingBot || chess.turn() !== "b") return;
  let move;
  if (botDifficulty === "easy") move = botMoveEasy(chess);
  if (botDifficulty === "medium") move = botMoveMedium(chess);
  if (botDifficulty === "hard") move = botMoveHard(chess);
  if (move) {
    chess.move(move.san || move);
    moveCount++;
    renderBoard();
  }
}

// --- Toggle Button ---
document.getElementById("toggle-bot").addEventListener("click", () => {
  playingBot = !playingBot;
  document.getElementById("toggle-bot").textContent = playingBot ? "Playing: Bot" : "Playing: Human";
  document.getElementById("bot-difficulty").style.display = playingBot ? "inline-block" : "none";
  if (playingBot && chess.turn() === "b") setTimeout(makeBotMove, 500);
});

document.getElementById("bot-difficulty").addEventListener("change", (e) => {
  botDifficulty = e.target.value;
});

// --- Board Click Handler ---
board.addEventListener('click', e => {
  if (playingBot && chess.turn() === "b") return;

  const targetSquare = e.target.closest('.square');
  if (!targetSquare) return;

  const clicked = targetSquare.getAttribute('data-square');
  const piece = chess.get(clicked);

  if (selectedSquare) {
    const move = chess.move({ from: selectedSquare, to: clicked, promotion: 'q' });
    if (move) {
      selectedSquare = null;
      moveCount++;
      renderBoard();
      if (playingBot) setTimeout(makeBotMove, 500);
      return;
    } else if (piece && piece.color === chess.turn()) {
      selectedSquare = clicked;
    } else {
      selectedSquare = null;
    }
  } else {
    if (piece && piece.color === chess.turn()) {
      selectedSquare = clicked;
    }
  }

  renderBoard();
});

// --- Reset Button ---
resetButton.addEventListener("click", () => {
  chess.reset();
  moveCount = 1;
  selectedSquare = null;
  buzzerEl.classList.remove("active");
  renderBoard();
});

// --- Initial Render ---
renderBoard();
