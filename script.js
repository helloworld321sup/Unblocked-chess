const chess = new Chess();
const board = document.querySelector('.chess-board');
let selectedSquare = null;
let lastMove = null;
let moveCount = 1;
let undoneMoves = []; // store moves you undo

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

// --- AI CONFIG ---
const AI = {
  side: 'b',   // bot plays black by default
  depth: 3     // tweak: 2 = fast, 3 = ok, 4 = slower/stronger
};

const openingBook = {
  "start": ["e2e4", "d2d4", "c2c4", "g1f3", "f2f4"],
  
  // 1. e4 openings
  "e2e4": ["e7e5", "c7c5", "e7e6", "c7c6"],
  "e2e4 e7e5": ["g1f3", "f1c4", "d2d4", "b1c3"],
  "e2e4 c7c5": ["g1f3", "c2c3", "d2d4"],

  // 1. d4 openings
  "d2d4": ["d7d5", "g8f6", "e7e6", "c7c5"],
  "d2d4 d7d5": ["c2c4", "g1f3", "e2e3"],
  "d2d4 g8f6": ["c2c4", "g1f3", "b1c3"],

  // 1. c4 openings
  "c2c4": ["e7e5", "g8f6", "c7c6", "e7e6"],
  "c2c4 e7e5": ["g1f3", "b1c3", "d2d4"],

  // 1. Nf3 openings
  "g1f3": ["d7d5", "g8f6", "c7c5", "e7e6"],

  // King's Pawn openings continued
  "e2e4 e7e5 g1f3": ["b8c6", "g8f6", "f8c5"],
  "e2e4 e7e5 f1c4": ["b8c6", "g8f6", "f8c5"],

  // Queen's Pawn openings continued
  "d2d4 d7d5 c2c4": ["e7e6", "c7c6", "g8f6"],
  "d2d4 g8f6 c2c4": ["e7e6", "g7g6", "c7c6"],

  // Ruy Lopez
  "e2e4 e7e5 g1f3 b8c6 f1b5": ["a7a6", "f8c5"],

  // Italian Game
  "e2e4 e7e5 g1f3 b8c6 f1c4": ["g8f6", "f8c5"],

  // Sicilian Defense
  "e2e4 c7c5 g1f3": ["d7d6", "e7e6", "g8f6"],

  // Queen's Gambit
  "d2d4 d7d5 c2c4 e7e6": ["g1f3", "b1c3"],

  // King's Indian Defense
  "d2d4 g8f6 c2c4 g7g6": ["g1f3", "b1c3"],

  // English Opening
  "c2c4 e7e5 g1f3": ["b8c6", "g8f6"],

  // London System
  "d2d4 d7d5 c1f4": ["g8f6", "e7e6"],

  // More random openings
  "f2f4": ["e7e5", "d7d5"],
  "g1f3 d7d5 f2f4": ["g8f6", "c7c5"],

  // add more variations as you like
};


// --- EVALUATION (white-positive score) ---
const PIECE_VALUES = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 0 };

function evaluatePosition(ch) {
  // material
  let score = 0;
  const board = ch.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = PIECE_VALUES[p.type];
      score += p.color === 'w' ? val : -val;
    }
  }
  // mobility (small bonus for number of legal moves)
  const curr = ch.turn();
  const moves = ch.moves();
  const mobility = moves.length * 2; // small weight
  score += (curr === 'w' ? mobility : -mobility);

  // checkmate/stalemate bonuses handled in search
  return score;
}

// --- MOVE ORDERING (captures first: MVV-LVA-ish) ---
function orderMoves(ch) {
  const moves = ch.moves({ verbose: true });
  return moves.sort((a, b) => {
    const aCap = a.captured ? (PIECE_VALUES[a.captured] - PIECE_VALUES[a.piece]) : -1;
    const bCap = b.captured ? (PIECE_VALUES[b.captured] - PIECE_VALUES[b.piece]) : -1;
    return bCap - aCap; // higher first
  });
}

function getOpeningMove() {
  // Build the move history key in your book format
  const historyMoves = chess.history({ verbose: true }).map(m => m.from + m.to).join(' ');
  
  // If no moves yet, use "start"
  const key = historyMoves || "start";
  const moves = openingBook[key];
  
  if (moves && moves.length) {
    const move = moves[Math.floor(Math.random() * moves.length)];
    return move;
  }
  return null;
}


// --- MINIMAX + ALPHA-BETA ---
function search(depth, alpha, beta) {
  if (depth === 0) return { score: evaluatePosition(chess) };

  // terminal states
  if (chess.in_checkmate()) {
    // side to move is checkmated
    return { score: chess.turn() === 'w' ? -999999 : 999999 };
  }
  if (chess.in_stalemate() || chess.in_draw()) {
    return { score: 0 };
  }

  let bestMove = null;

  if (chess.turn() === 'w') {
    // maximize
    let best = -Infinity;
    for (const m of orderMoves(chess)) {
      chess.move(m);
      const { score } = search(depth - 1, alpha, beta);
      chess.undo();
      if (score > best) { best = score; bestMove = m; }
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break; // beta cutoff
    }
    return { score: best, move: bestMove };
  } else {
    // minimize
    let best = Infinity;
    for (const m of orderMoves(chess)) {
      chess.move(m);
      const { score } = search(depth - 1, alpha, beta);
      chess.undo();
      if (score < best) { best = score; bestMove = m; }
      beta = Math.min(beta, score);
      if (alpha >= beta) break; // alpha cutoff
    }
    return { score: best, move: bestMove };
  }
}

function findBestMove() {
  // Iterative deepening (optional): single depth is fine for now
  return search(AI.depth, -Infinity, Infinity).move || null;
}

function makeAIMove() {
  if (chess.game_over()) return;
  if (chess.turn() !== AI.side) return;

  // Try opening book first
  const openingMove = getOpeningMove();
  let move;
  if (openingMove) {
    move = chess.move(openingMove, { sloppy: true }); // sloppy=true allows SAN/coordinate moves
  } else {
    const best = findBestMove();
    if (!best) return;
    move = chess.move(best);
  }

  if (move) {
    lastMove = move;
    playMoveSound(move);
    undoneMoves = [];
    moveCount++;
    renderBoard();
  }
}



const resetButton = document.getElementById("reset-button");
const undoButton = document.getElementById("undo-button");
const redoButton = document.getElementById("redo-button");

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
      img.draggable = true;
      img.dataset.square = squareName;
      square.appendChild(img);
    }
  });

  const legalMoves = chess.moves({ square: selectedSquare, verbose: true });
  legalMoves.forEach(move => {
    const target = document.querySelector(`[data-square="${move.to}"]`);
    if (target) {
      const dot = document.createElement('div');
      dot.classList.add('move-dot');
      target.appendChild(dot);
    }
  });

  if (selectedSquare) {
    const selectedEl = document.querySelector(`[data-square="${selectedSquare}"]`);
    if (selectedEl) selectedEl.classList.add('selected');
  }

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
  if (move.flags.includes("c")) sounds.capture.play();
  else if (move.flags.includes("k") || move.flags.includes("q")) sounds.castle.play();
  else if (move.flags.includes("p")) sounds.promotion.play();
  else sounds.move.play();

  if (chess.in_checkmate()) sounds.checkmate.play();
  else if (chess.in_check()) sounds.check.play();
}

// --- Click Handler ---
// --- Click Handler ---
board.addEventListener('click', e => {
  const targetSquare = e.target.closest('.square');
  if (!targetSquare) return;
  const clicked = targetSquare.getAttribute('data-square');
  const piece = chess.get(clicked);

  if (selectedSquare) {
    // Try to move the selected piece to the clicked square
    const move = chess.move({ from: selectedSquare, to: clicked, promotion: 'q' });
    if (move) {
      lastMove = move;
      playMoveSound(move);
      undoneMoves = []; // clear redo history
      selectedSquare = null;
      moveCount++;
      renderBoard();

      setTimeout(makeAIMove, 120); // Bot moves after player
      return;
    }
    
    // If move invalid but clicked a piece of the same color, re-select it
    if (piece && piece.color === chess.turn()) {
      selectedSquare = clicked;
    } else {
      selectedSquare = null;
    }

  } else if (piece && piece.color === chess.turn()) {
    // If no piece selected yet, select clicked piece
    selectedSquare = clicked;
  }

  renderBoard();
});


// --- Drag & Drop ---
let dragPiece = null;
let dragGhost = null;

// --- Drag Start ---
board.addEventListener('dragstart', e => {
  const img = e.target;
  if (!img.dataset.square) return;

  selectedSquare = img.dataset.square;
  const piece = chess.get(selectedSquare);
  if (!piece) return;

  dragPiece = img;

  // Hide the original piece while dragging
  img.style.opacity = '0';

  // Create a ghost piece that follows the cursor
  dragGhost = img.cloneNode();
  dragGhost.style.position = 'absolute';
  dragGhost.style.pointerEvents = 'none';
  dragGhost.style.width = img.offsetWidth + 'px';
  dragGhost.style.height = img.offsetHeight + 'px';
  dragGhost.style.zIndex = 1000;
  document.body.appendChild(dragGhost);

  // Remove default drag image
  e.dataTransfer.setDragImage(new Image(), 0, 0);
});

// --- Drag ---
board.addEventListener('drag', e => {
  if (!dragGhost) return;
  dragGhost.style.left = e.pageX - dragGhost.offsetWidth / 2 + 'px';
  dragGhost.style.top = e.pageY - dragGhost.offsetHeight / 2 + 'px';
});

// --- Drag End ---
board.addEventListener('dragend', e => {
  if (dragGhost) {
    dragGhost.remove();
    dragGhost = null;
  }
  if (dragPiece) {
    dragPiece.style.opacity = '1';
    dragPiece = null;
  }
  selectedSquare = null;
  renderBoard();
});

// --- Drag Over ---
board.addEventListener('dragover', e => {
  e.preventDefault();

  // Show legal moves dynamically while dragging
  if (selectedSquare) {
    renderBoard(); // clear previous highlights
    const legalMoves = chess.moves({ square: selectedSquare, verbose: true });
    legalMoves.forEach(move => {
      const target = document.querySelector(`[data-square="${move.to}"]`);
      if (target) {
        const dot = document.createElement('div');
        dot.classList.add('move-dot');
        target.appendChild(dot);
      }
    });

    const selectedEl = document.querySelector(`[data-square="${selectedSquare}"]`);
    if (selectedEl) selectedEl.classList.add('selected');
  }
});

// --- Drop ---
board.addEventListener('drop', e => {
  e.preventDefault();
  const targetSquareEl = e.target.closest('.square');
  if (!targetSquareEl || !selectedSquare) return;

  const toSquare = targetSquareEl.getAttribute('data-square');
  const move = chess.move({ from: selectedSquare, to: toSquare, promotion: 'q' });

if (move) {
  lastMove = move;
  playMoveSound(move);
  undoneMoves = [];
  selectedSquare = null;
  moveCount++;
  renderBoard();

  setTimeout(makeAIMove, 120); // <-- tell the bot to move
}
});


// --- Reset Board ---
resetButton.addEventListener("click", () => {
  chess.reset();
  moveCount = 1;
  selectedSquare = null;
  lastMove = null;
  undoneMoves = [];
  renderBoard();
});

// --- Undo Move ---
undoButton.addEventListener("click", () => {
  const move = chess.undo();
  if (move) {
    undoneMoves.push(move);
    moveCount--;
    selectedSquare = null;
    lastMove = chess.history({ verbose: true }).slice(-1)[0] || null;
    renderBoard();
  }
});

// --- Redo Move ---
redoButton.addEventListener("click", () => {
  if (undoneMoves.length > 0) {
    const move = undoneMoves.pop();
    chess.move(move);
    lastMove = move;
    moveCount++;
    renderBoard();
  }
});

// --- Initial Render ---
renderBoard();
