const chess = new Chess();
const boardElement = document.querySelector('.chess-board');

let selectedSquare = null;

// Piece image map
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

// Renders the board based on current game state
function renderBoard() {
  const board = chess.board();

  boardElement.querySelectorAll('.square').forEach(square => {
    const squareName = square.getAttribute('data-square');
    const file = squareName.charCodeAt(0) - 97;
    const rank = 8 - parseInt(squareName[1]);

    const piece = board[rank][file];
    square.innerHTML = '';

    if (piece) {
      const pieceKey = piece.color + piece.type.toUpperCase();
      const img = document.createElement('img');
      img.src = pieceImages[pieceKey];
      img.alt = pieceKey;
      square.appendChild(img);
    }

    square.classList.remove('selected', 'highlight');
  });

  // Re-highlight selected square (if any)
  if (selectedSquare) {
    const fromSquare = document.querySelector(`[data-square="${selectedSquare}"]`);
    if (fromSquare) {
      fromSquare.classList.add('selected');
    }

    const moves = chess.moves({ square: selectedSquare, verbose: true });
    moves.forEach(move => {
      const target = document.querySelector(`[data-square="${move.to}"]`);
      if (target) {
        target.classList.add('highlight');
      }
    });
  }
}

// Handle clicking on squares
boardElement.addEventListener('click', e => {
  const squareEl = e.target.closest('.square');
  if (!squareEl) return;

  const clickedSquare = squareEl.getAttribute('data-square');
  const piece = chess.get(clickedSquare);

  if (selectedSquare) {
    // Try to move
    const move = chess.move({ from: selectedSquare, to: clickedSquare, promotion: 'q' });

    if (move) {
      selectedSquare = null;
    } else if (piece && piece.color === chess.turn()) {
      selectedSquare = clickedSquare;
    } else {
      selectedSquare = null;
    }
  } else {
    // First selection
    if (piece && piece.color === chess.turn()) {
      selectedSquare = clickedSquare;
    }
  }

  renderBoard();
});

// Initial board render
renderBoard();
