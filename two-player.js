const chess = new Chess();
const board = document.querySelector('.chess-board');
let selectedSquare = null;
let lastMove = null;
let moveCount = 1;
let undoneMoves = [];

// --- UI assets ---
// Load settings from localStorage
function getPieceImages() {
  const style = localStorage.getItem('pieceStyle') || 'classic';
  
  if (style === 'modern') {
    return {
      wP: "https://assets-themes.chess.com/image/ejgfv/150/wp.png",
      wR: "https://assets-themes.chess.com/image/ejgfv/150/wr.png",
      wN: "https://assets-themes.chess.com/image/ejgfv/150/wn.png",
      wB: "https://assets-themes.chess.com/image/ejgfv/150/wb.png",
      wQ: "https://assets-themes.chess.com/image/ejgfv/150/wq.png",
      wK: "https://assets-themes.chess.com/image/ejgfv/150/wk.png",
      bP: "https://assets-themes.chess.com/image/ejgfv/150/bp.png",
      bR: "https://assets-themes.chess.com/image/ejgfv/150/br.png",
      bN: "https://assets-themes.chess.com/image/ejgfv/150/bn.png",
      bB: "https://assets-themes.chess.com/image/ejgfv/150/bb.png",
      bQ: "https://assets-themes.chess.com/image/ejgfv/150/bq.png",
      bK: "https://assets-themes.chess.com/image/ejgfv/150/bk.png",
    };
  } else {
    // Classic pieces (default)
    return {
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
  }
}

const pieceImages = getPieceImages();

const sounds = {
  move: new Audio("http://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3"),
  capture: new Audio("http://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3"),
  castle: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/castle.mp3"),
  check: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3"),
  promotion: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/promote.mp3"),
  checkmate: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_WEBM_/default/game-end.webm")
};

// ============================================================================
//                                   UI
// ============================================================================
const resetButton = document.getElementById("reset-button");
const undoButton = document.getElementById("undo-button");
const redoButton = document.getElementById("redo-button");
const scorebookButton = document.getElementById("scorebook-button");
const messageDiv = document.getElementById("game-message");
const gameOverPopup = document.getElementById("game-over-popup");
const gameOverTitle = document.getElementById("game-over-title");
const gameOverMessage = document.getElementById("game-over-message");
const playAgainBtn = document.getElementById("play-again-btn");
const homeBtn = document.getElementById("home-btn");
const scorebookPopup = document.getElementById("scorebook-popup");
const pgnText = document.getElementById("pgn-text");
const copyPgnBtn = document.getElementById("copy-pgn-btn");
const closeScorebookBtn = document.getElementById("close-scorebook-btn");

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

function updateGameStatus() {
  if (chess.in_checkmate()) {
    const winner = chess.turn() === 'w' ? 'Black' : 'White';
    showGameOverPopup('Checkmate!', `${winner} wins by checkmate!`);
  } else if (chess.in_draw() || chess.insufficient_material() || chess.in_stalemate()) {
    showGameOverPopup('Draw!', 'The game ended in a draw');
  } else if (chess.in_check()) {
    const player = chess.turn() === 'w' ? 'White' : 'Black';
    messageDiv.textContent = `${player} is in check!`;
  } else {
    const player = chess.turn() === 'w' ? 'White' : 'Black';
    messageDiv.textContent = `${player} to move`;
  }
}

function showGameOverPopup(title, message) {
  gameOverTitle.textContent = title;
  gameOverMessage.textContent = message;
  gameOverPopup.style.display = 'flex';
}

function hideGameOverPopup() {
  gameOverPopup.style.display = 'none';
}

function generatePGN() {
  const pgn = chess.pgn();
  const gameResult = chess.in_checkmate() ? 
    (chess.turn() === 'w' ? '0-1' : '1-0') :
    chess.in_draw() ? '1/2-1/2' : '*';
  
  const pgnHeader = `[Event "Two Player Game"]
[Site "Chess Game"]
[Date "${new Date().toISOString().split('T')[0]}"]
[Round "1"]
[White "Player 1"]
[Black "Player 2"]
[Result "${gameResult}"]
[TimeControl "-"]

${pgn} ${gameResult}`;
  
  return pgnHeader;
}

function showScorebook() {
  const pgn = generatePGN();
  pgnText.value = pgn;
  scorebookPopup.style.display = 'flex';
}

function hideScorebook() {
  scorebookPopup.style.display = 'none';
}

function copyPGN() {
  pgnText.select();
  pgnText.setSelectionRange(0, 99999); // For mobile devices
  document.execCommand('copy');
  
  // Visual feedback
  const originalText = copyPgnBtn.textContent;
  copyPgnBtn.textContent = 'Copied!';
  copyPgnBtn.style.backgroundColor = '#4CAF50';
  
  setTimeout(() => {
    copyPgnBtn.textContent = originalText;
    copyPgnBtn.style.backgroundColor = '';
  }, 2000);
}

function playMoveSound(move) {
  if (!move) return;
  
  // Check if sound is enabled
  const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  if (!soundEnabled) return;
  
  if (move.flags.includes("c")) sounds.capture.play();
  else if (move.flags.includes("k") || move.flags.includes("q")) sounds.castle.play();
  else if (move.flags.includes("p")) sounds.promotion.play();
  else sounds.move.play();

  if (chess.in_checkmate()) sounds.checkmate.play();
  else if (chess.in_check()) sounds.check.play();
}

// --- Click input ---
board.addEventListener('click', e => {
  if (gameOverPopup.style.display === 'flex') return; // Don't allow moves when popup is open
  
  const targetSquare = e.target.closest('.square');
  if (!targetSquare) return;
  const clicked = targetSquare.getAttribute('data-square');
  const piece = chess.get(clicked);

  if (selectedSquare) {
    const move = chess.move({ from: selectedSquare, to: clicked, promotion: 'q' });
    if (move) {
      lastMove = move;
      playMoveSound(move);
      undoneMoves = [];
      selectedSquare = null;
      moveCount++;
      renderBoard();
      updateGameStatus();
      return;
    }
    if (piece && piece.color === chess.turn()) selectedSquare = clicked; else selectedSquare = null;
  } else if (piece && piece.color === chess.turn()) {
    selectedSquare = clicked;
  }
  renderBoard();
});

// --- Drag & drop ---
let dragPiece = null;
let dragGhost = null;

board.addEventListener('dragstart', e => {
  if (gameOverPopup.style.display === 'flex') return;
  
  const img = e.target;
  if (!img.dataset.square) return;
  selectedSquare = img.dataset.square;
  const piece = chess.get(selectedSquare);
  if (!piece) return;
  dragPiece = img;
  img.style.opacity = '0';
  dragGhost = img.cloneNode();
  dragGhost.style.position = 'absolute';
  dragGhost.style.pointerEvents = 'none';
  dragGhost.style.width = img.offsetWidth + 'px';
  dragGhost.style.height = img.offsetHeight + 'px';
  dragGhost.style.zIndex = 1000;
  document.body.appendChild(dragGhost);
  e.dataTransfer.setDragImage(new Image(), 0, 0);
});

board.addEventListener('drag', e => {
  if (!dragGhost) return;
  dragGhost.style.left = e.pageX - dragGhost.offsetWidth / 2 + 'px';
  dragGhost.style.top = e.pageY - dragGhost.offsetHeight / 2 + 'px';
});

board.addEventListener('dragend', () => {
  if (dragGhost) { dragGhost.remove(); dragGhost = null; }
  if (dragPiece) { dragPiece.style.opacity = '1'; dragPiece = null; }
  selectedSquare = null;
  renderBoard();
});

board.addEventListener('dragover', e => {
  e.preventDefault();
  if (selectedSquare) {
    renderBoard();
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

board.addEventListener('drop', e => {
  e.preventDefault();
  if (gameOverPopup.style.display === 'flex') return;
  
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
    updateGameStatus();
  }
});

// --- Control buttons ---
resetButton?.addEventListener("click", () => {
  chess.reset();
  moveCount = 1;
  selectedSquare = null;
  lastMove = null;
  undoneMoves = [];
  hideGameOverPopup();
  renderBoard();
  updateGameStatus();
});

undoButton?.addEventListener("click", () => {
  if (gameOverPopup.style.display === 'flex') return;
  
  const move = chess.undo();
  if (move) {
    undoneMoves.push(move);
    moveCount--;
    selectedSquare = null;
    lastMove = chess.history({ verbose: true }).slice(-1)[0] || null;
    renderBoard();
    updateGameStatus();
  }
});

redoButton?.addEventListener("click", () => {
  if (gameOverPopup.style.display === 'flex') return;
  
  if (undoneMoves.length > 0) {
    const move = undoneMoves.pop();
    chess.move(move);
    lastMove = move;
    moveCount++;
    renderBoard();
    updateGameStatus();
  }
});

// --- Popup buttons ---
playAgainBtn?.addEventListener("click", () => {
  chess.reset();
  moveCount = 1;
  selectedSquare = null;
  lastMove = null;
  undoneMoves = [];
  hideGameOverPopup();
  renderBoard();
  updateGameStatus();
});

homeBtn?.addEventListener("click", () => {
  window.location.href = 'index.html';
});

// --- Game Over Popup Copy PGN button ---
const copyPgnGameoverBtn = document.getElementById("copy-pgn-gameover-btn");
copyPgnGameoverBtn?.addEventListener("click", () => {
  showScorebook();
});

// --- Scorebook buttons ---
scorebookButton?.addEventListener("click", () => {
  showScorebook();
});

closeScorebookBtn?.addEventListener("click", () => {
  hideScorebook();
});

copyPgnBtn?.addEventListener("click", () => {
  copyPGN();
});

// --- Home button ---
const homeButton = document.getElementById("home-button");
homeButton?.addEventListener("click", () => {
  window.location.href = 'index.html';
});

// Apply settings
const boardColor = localStorage.getItem('boardColor') || '#4800ff';
document.documentElement.style.setProperty('--black-square-color', boardColor);

// Initial render
renderBoard();
updateGameStatus();
