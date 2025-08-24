const chess = new Chess();
const board = document.querySelector('.chess-board');
let selectedSquare = null;
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

const moveCounterEl = document.getElementById("move-counter");
const turnIndicatorEl = document.getElementById("turn-indicator");
const resetButton = document.getElementById("reset-button");

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

  // Update sidebar
  moveCounterEl.textContent = `Move: ${moveCount}`;
  turnIndicatorEl.textContent = `${chess.turn() === 'w' ? 'White' : 'Black'}'s Move`;
}

// Click handler
board.addEventListener('click', e => {
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
      return;
    } else if (piece && piece.color === chess.turn()) selectedSquare = clicked;
    else selectedSquare = null;
  } else {
    if (piece && piece.color === chess.turn()) selectedSquare = clicked;
  }

  renderBoard();
});

// Reset board
resetButton.addEventListener("click", () => {
  chess.reset();
  moveCount = 1;
  selectedSquare = null;
  renderBoard();
});

// Initial render
renderBoard();

