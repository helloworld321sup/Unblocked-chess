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
const toggleBotBtn = document.getElementById("toggle-mode");
const difficultySelect = document.getElementById("bot-difficulty");

let moveCount = 1;
let playBot = true; // true = bot enabled
let botDifficulty = "medium"; // default difficulty

toggleBotBtn.textContent = playBot ? "Playing vs Bot" : "Playing vs Human";

// --- Stockfish setup ---
const engine = Stockfish();
engine.onmessage = function(event) {
  const line = event.data || event;
  if (line.startsWith('bestmove')) {
    const bestMove = line.split(' ')[1];
    chess.move(bestMove, { sloppy: true });
    moveCount++;
    renderBoard();
  }
};

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

// --- Bot Move ---
function botMove() {
  if (!playBot || chess.turn() !== "b") return;

  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return;

  let move;

  if (botDifficulty === "stockfish") {
    const fen = chess.fen();
    engine.postMessage(`position fen ${fen}`);
    engine.postMessage("go depth 15");
    return; // Stockfish will respond via onmessage
  }

  else if (botDifficulty === "hard") {
    // --- Hard mode logic ---
    const knightDev = moves.filter(m => {
      const piece = chess.get(m.from);
      if (!piece || piece.type !== "n") return false;
      return m.to === "c6" || m.to === "f6";
    });
    if (knightDev.length) move = knightDev[Math.floor(Math.random()*knightDev.length)];

    if (!move) {
      const safeCaptures = moves.filter(m => {
        if (!m.flags.includes("c") && !m.flags.includes("e")) return false;
        const captured = chess.get(m.to);
        const ourPiece = chess.get(m.from);
        const value = { p:1, n:3, b:3, r:5, q:9, k:1000 };
        return captured && ourPiece && value[captured.type] >= value[ourPiece.type];
      });
      if (safeCaptures.length) move = safeCaptures[Math.floor(Math.random()*safeCaptures.length)];
    }

    if (!move) {
      const centerSquares = ["d6","e6","d5","e5","c6","f6"];
      const centerMoves = moves.filter(m => centerSquares.includes(m.to));
      if (centerMoves.length) move = centerMoves[Math.floor(Math.random()*centerMoves.length)];
    }

    if (!move) {
      const safeMoves = moves.filter(m => {
        const temp = new Chess(chess.fen());
        temp.move({ from: m.from, to: m.to, promotion: 'q' });
        return !temp.in_check();
      });
      move = safeMoves[Math.floor(Math.random()*safeMoves.length)];
    }
  }

  else if (botDifficulty === "medium") {
    const captures = moves.filter(m => m.flags.includes("c") || m.flags.includes("e"));
    const safe = moves.filter(m => {
      const temp = new Chess(chess.fen());
      temp.move({ from: m.from, to: m.to, promotion: 'q' });
      return !temp.in_check();
    });
    move = captures.length ? captures[Math.floor(Math.random()*captures.length)]
           : safe[Math.floor(Math.random()*safe.length)];
  }

  else {
    const safe = moves.filter(m => {
      const temp = new Chess(chess.fen());
      temp.move({ from: m.from, to: m.to, promotion: 'q' });
      return !temp.in_check();
    });
    move = safe[Math.floor(Math.random()*safe.length)];
  }

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

// --- Reset ---
resetButton.addEventListener("click", () => {
  chess.reset();
  moveCount = 1;
  selectedSquare = null;
  buzzerEl.classList.remove("active");
  renderBoard();
});

// --- Toggle Bot ---
toggleBotBtn.addEventListener("click", () => {
  playBot = !playBot;
  toggleBotBtn.textContent = playBot ? "Playing vs Bot" : "Playing vs Human";
  if (playBot && chess.turn() === "b") setTimeout(botMove, 500);
});

// --- Change Difficulty ---
difficultySelect.addEventListener("change", () => {
  botDifficulty = difficultySelect.value; // "easy", "medium", "hard", "stockfish"
});

// --- Initial Render ---
renderBoard();

// --- Initial Render ---
renderBoard();
