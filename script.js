const game = new Chess();

let selectedSquare = null;

function renderBoard() {
  const board = document.querySelector('.chess-board');
  const squares = board.querySelectorAll('.square');

  // Clear all pieces
  squares.forEach(square => {
    square.innerHTML = '';
  });

  // Place pieces based on game state
  const boardState = game.board();
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  for (let rank = 8; rank >= 1; rank--) {
    for (let file = 0; file < 8; file++) {
      const squareId = files[file] + rank;
      const square = document.querySelector(`[data-square="${squareId}"]`);
      const piece = boardState[8 - rank][file];

      if (piece) {
        const color = piece.color === 'w' ? 'white' : 'black';
        const type = piece.type;

        // Map to image URLs
        const imgSrc = getPieceImage(color, type);
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = `${color} ${type}`;
        square.appendChild(img);
      }
    }
  }
}

function getPieceImage(color, type) {
  const base = 'https://static.stands4.com/images/symbol/';
  const map = {
    w: {
      p: '3409_white-pawn.png',
      r: '3406_white-rook.png',
      n: '3408_white-knight.png',
      b: '3407_white-bishop.png',
      q: '3405_white-queen.png',
      k: '3404_white-king.png',
    },
    b: {
      p: '3403_black-pawn.png',
      r: '3400_black-rook.png',
      n: '3402_black-knight.png',
      b: '3401_black-bishop.png',
      q: '3399_black-queen.png',
      k: '3398_black-king.png',
    }
  };

  return base + map[color[0]][type];
}

function handleSquareClick(event) {
  const squareElement = event.currentTarget;
  const square = squareElement.getAttribute('data-square');

  if (selectedSquare) {
    const move = game.move({
      from: selectedSquare,
      to: square,
      promotion: 'q' // always promote to queen for simplicity
    });

    if (move) {
      selectedSquare = null;
      renderBoard();
    } else {
      // Invalid move: deselect
      selectedSquare = null;
    }
  } else {
    selectedSquare = square;
  }
}

// Attach click listeners
document.querySelectorAll('.square').forEach(square => {
  square.addEventListener('click', handleSquareClick);
});

// Initial render
renderBoard();
