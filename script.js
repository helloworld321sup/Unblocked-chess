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

  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return;

  let move;
  const value = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 1000 };

  // Filter safe moves
  const safeMoves = moves.filter(m => {
    const temp = new Chess(chess.fen());
    temp.move({ from: m.from, to: m.to, promotion: 'q' });
    return !temp.in_check();
  });

  if (botDifficulty === "impossible") {
    // 1. Develop pieces (knights, bishops, etc.) toward center
    const developMoves = safeMoves.filter(m => {
      const piece = chess.get(m.from);
      const centerSquares = ["d6","e6","d5","e5","c6","f6","c5","f5"];
      return (piece.type === 'n' || piece.type === 'b') && centerSquares.includes(m.to);
    });
    if (developMoves.length) move = developMoves[Math.floor(Math.random() * developMoves.length)];

    // 2. Capture free pawns safely
    if (!move) {
      const freePawnCaptures = safeMoves.filter(m => {
        const captured = chess.get(m.to);
        return captured && captured.type === 'p' && !threatenedByOpponent(m.to, m.from);
      });
      if (freePawnCaptures.length) move = freePawnCaptures[Math.floor(Math.random() * freePawnCaptures.length)];
    }

    // 3. Fair trades (capture if piece value >= our piece)
    if (!move) {
      const fairCaptures = safeMoves.filter(m => {
        const captured = chess.get(m.to);
        const ourPiece = chess.get(m.from);
        return captured && value[captured.type] >= value[ourPiece.type];
      });
      if (fairCaptures.length) move = fairCaptures[Math.floor(Math.random() * fairCaptures.length)];
    }

    // 4. Threaten pieces (move to attack without immediate capture)
    if (!move) {
      const threatenMoves = safeMoves.filter(m => isAttacking(m.to));
      if (threatenMoves.length) move = threatenMoves[Math.floor(Math.random() * threatenMoves.length)];
    }

    // 5. Fallback: any safe move
    if (!move) move = safeMoves[Math.floor(Math.random() * safeMoves.length)];
  }
  else if (botDifficulty === "hard") {
// 1. Develop knights to c6/f6 if safe
    const knightDevelopment = moves.filter(m => {
      const piece = chess.get(m.from);
      if (!piece || piece.type !== "n") return false;
      if ((m.to === "c6" || m.to === "f6")) {
        // Check if square is attacked by white pawns
        const tempChess = new Chess(chess.fen());
        tempChess.move({ from: m.from, to: m.to, promotion: 'q' });
        const attackers = tempChess.moves({ verbose: true }).filter(a => {
          return a.to === m.to && chess.get(a.from).color === 'w' && chess.get(a.from).type === 'p';
        });
        return attackers.length === 0;
      }
      return false;
    });
    if (knightDevelopment.length > 0) {
      move = knightDevelopment[Math.floor(Math.random() * knightDevelopment.length)];
    }
    // 2. Safe captures (good trades only)
    if (!move) {
      const safeCaptures = moves.filter(m => {
        if (!m.flags.includes("c") && !m.flags.includes("e")) return false;
        const tempChess = new Chess(chess.fen());
        tempChess.move({ from: m.from, to: m.to, promotion: 'q' });
        // Only capture if the captured piece is equal or more valuable than our piece
        const captured = chess.get(m.to);
        const ourPiece = chess.get(m.from);
        if (!captured || !ourPiece) return false;
        const value = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 1000 };
        return value[captured.type] >= value[ourPiece.type];
      });
      if (safeCaptures.length > 0) {
        move = safeCaptures[Math.floor(Math.random() * safeCaptures.length)];
      }
    }
    // 3. Develop other pieces toward center
    if (!move) {
      const centerSquares = ["d6", "e6", "d5", "e5", "c6", "f6"];
      const developMoves = moves.filter(m => centerSquares.includes(m.to));
      if (developMoves.length > 0) {
        move = developMoves[Math.floor(Math.random() * developMoves.length)];
      }
    }
    // 4. Fallback: pick safe move (not leaving king in check)
    if (!move) {
      const safeMoves = moves.filter(m => {
        const tempChess = new Chess(chess.fen());
        tempChess.move({ from: m.from, to: m.to, promotion: 'q' });
        return !tempChess.in_check();
      });
      move = safeMoves[Math.floor(Math.random() * safeMoves.length)];
    }

  }
  else if (botDifficulty === "medium") {
    const captures = moves.filter(m => m.flags.includes("c") || m.flags.includes("e"));
    move = captures.length > 0 ? captures[Math.floor(Math.random() * captures.length)]
           : safeMoves[Math.floor(Math.random() * safeMoves.length)];
  }
  else { // easy
    move = safeMoves[Math.floor(Math.random() * safeMoves.length)];
  }

  chess.move(move);
  moveCount++;
  renderBoard();

  // Helper: check if square is threatened by white, ignoring our attacking piece
  function threatenedByOpponent(square, ignoreFrom) {
    const moves = chess.moves({ verbose: true }).filter(m => chess.get(m.from).color === 'w' && m.from !== ignoreFrom);
    return moves.some(m => m.to === square);
  }

  // Helper: check if we are attacking a square
  function isAttacking(square) {
    const moves = chess.moves({ verbose: true }).filter(m => chess.get(m.from).color === 'b');
    return moves.some(m => m.to === square && !chess.get(m.to));
  }
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
