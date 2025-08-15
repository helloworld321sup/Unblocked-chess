const chess = new Chess();

const boardElement = document.querySelector('.chess-board');
let selectedSquare = null;

// Maps chess.js piece notation to image URLs
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

// Render the board pieces according to chess.js FEN
function renderBoard() {
  const squares = boardElement.querySelectorAll('.square');

  // Get board state as a 2D array from chess.js
  const boardState = chess.board();

  // boardState is array of rows starting from 8th rank (top) to 1st rank (bottom)
  // Rows: 0 is rank 8, 7 is rank 1
  // Columns: 0 is file a, 7 is file h

  squares.forEach(square => {
    const squareName = square.getAttribute('data-square');
    const file = squareName.charCodeAt(0) - 'a'.charCodeAt(0); // 0-based file index
    const rank = 8 - parseInt(squareName[1]); // 0-based rank index (top is 0)

    const piece = boardState[rank][file]; // piece object or null
    square.innerHTML = ''; // Clear square content

    if (piece) {
      const key = piece.color + piece.type.toUpperCase();
      const imgSrc = pieceImages[key];
      if (imgSrc) {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = `${piece.color === 'w' ? 'White' : 'Black'} ${piece.type.toUpperCase()}`;
        square.appendChild(img);
      }
    }

    // Remove highlight classes
    square.classList.remove('selected', 'highlight');
  });
}

// Highlight selected square and possible moves
function highlightSquares(selected) {
  // Clear all highlights
  boardElement.querySelectorAll('.square').forEach(sq => {
    sq.classList.remove('highlight');
  });

  if (!selected) return;

  // Highlight selected
  selected.classList.add('selected');

  // Get possible moves from selected square
  const from = selected.getAttribute('data-square');
  const moves = chess.moves({ square: from, verbose: true });

  moves.forEach(move => {
    const targetSquare = boardElement.querySelector(`.square[data-square="${move.to}"]`);
    if (targetSquare) {
      targetSquare.classList.add('highlight');
    }
  });
}

// Handle clicks on squares
boardElement.addEventListener('click', (e) => {
  const square = e.target.closest('.square');
  if (!square) return;

  const clickedSquare = square.getAttribute('data-square');

  if (selectedSquare) {
    // Try to make a move from selectedSquare to clickedSquare
    const move = chess.move({ from: selectedSquare, to: clickedSquare, promotion: 'q' }); // Always promote to queen for simplicity

    if (move) {
      // Move successful
      selectedSquare = null;
      renderBoard();
    } else {
      // Invalid move, if clicked on a square with current player's piece, select that instead
      const piece = chess.get(clickedSquare);
      if (piece && piece.color === chess.turn()) {
        selectedSquare = clickedSquare;
        renderBoard();
        highlightSquares(square);
      } else {
        // Deselect
        selectedSquare = null;
        renderBoard();
      }
    }
  } else {
    // No square selected yet, select if there is a piece of current player's color
    const piece = chess.get(clickedSquare);
    if (piece && piece.color === chess.turn()) {
      selectedSquare = clickedSquare;
      renderBoard();
      highlightSquares(square);
    }
  }
});

// Initial render
renderBoard();
