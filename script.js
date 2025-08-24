const chess = new Chess();
const board = document.querySelector('.chess-board');
let selectedSquare = null;

let stockfish = null;
if (typeof Stockfish === "function") {
  stockfish = Stockfish();
  stockfish.postMessage("uci");

  stockfish.onmessage = function (event) {
    const line = event.data;
    if (line.startsWith("bestmove")) {
      const parts = line.split(" ");
      const best = parts[1]; // e.g. "e2e4"
      if (best && best !== "(none)") {
        const move = {
          from: best.substring(0, 2),
          to: best.substring(2, 4),
          promotion: best.length > 4 ? best.substring(4, 5) : "q"
        };
        if (chess.move(move)) {
          moveCount++;
          renderBoard();
        }
      }
    }
  };
}


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
const toggleBotBtn = document.getElementById("toggle-mode");
const difficultySelect = document.getElementById("bot-difficulty");

let moveCount = 1;
let playBot = true; // true = bot enabled
let botDifficulty = "medium"; // default difficulty

// Initialize button text to show CURRENT MODE
toggleBotBtn.textContent = playBot ? "Playing vs Bot" : "Playing vs Human";

// --- Render Board ---
function renderBoard() {
  const positions = chess.board();
  board.querySelectorAll('.square').forEach(square => {
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

function botMove() {
  if (!playBot || chess.turn() !== "b") return;

  // Stockfish branch
  if (botDifficulty === "stockfish") {
    if (!stockfish) return;

    // Send current position to Stockfish
    stockfish.postMessage("position fen " + chess.fen());
    stockfish.postMessage("go depth 12"); // you can increase depth for stronger play

    // Stockfish will trigger 'onmessage' listener when move is ready
    return; // stop manual bot logic
  }

  // Manual bot logic for non-stockfish difficulties
  const allMoves = chess.moves({ verbose: true });
  if (allMoves.length === 0) return;

  let move;
  const value = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 1000 };

  const tempAfter = (m) => {
    const t = new Chess(chess.fen());
    t.move({ from: m.from, to: m.to, promotion: "q" });
    return t;
  };

  const safeMoves = allMoves.filter(m => !tempAfter(m).in_check());

  if (botDifficulty === "hard") {
    move = safeMoves[Math.floor(Math.random() * safeMoves.length)];
  } else if (botDifficulty === "medium") {
    const captures = safeMoves.filter(m => m.flags.includes('c') || m.flags.includes('e'));
    move = captures.length ? captures[Math.floor(Math.random()*captures.length)] 
                           : safeMoves[Math.floor(Math.random()*safeMoves.length)];
  } else {
    move = safeMoves[Math.floor(Math.random() * safeMoves.length)];
  }

  if (!move) return;

  chess.move(move);
  moveCount++;
  renderBoard();
}

// --- Board Click Handler ---
board.addEventListener('click', e => {
  if (playBot && chess.turn() === "b") return;

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
      if (playBot) setTimeout(botMove, 500);
      return;
    } else if (piece && piece.color === chess.turn()) selectedSquare = clicked;
    else selectedSquare = null;
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
  buzzerEl.classList.remove("active");
  renderBoard();
});

// --- Toggle Bot Mode ---
toggleBotBtn.addEventListener("click", () => {
  playBot = !playBot;
  toggleBotBtn.textContent = playBot ? "Playing vs Bot" : "Playing vs Human";

  // Bot moves immediately if turned on during black's turn
  if (playBot && chess.turn() === "b") setTimeout(botMove, 500);
});

// --- Change Difficulty ---
difficultySelect.addEventListener("change", () => {
  botDifficulty = difficultySelect.value; // "easy", "medium", "hard"
});

// --- Initial Render ---
renderBoard();
// --- Initial Render ---
renderBoard();
