const board = document.getElementById("board");
const game = new Chess();

const pieceImages = {
  p: 'https://static.stands4.com/images/symbol/3403_black-pawn.png',
  r: 'https://static.stands4.com/images/symbol/3400_black-rook.png',
  n: 'https://static.stands4.com/images/symbol/3402_black-knight.png',
  b: 'https://static.stands4.com/images/symbol/3401_black-bishop.png',
  q: 'https://static.stands4.com/images/symbol/3399_black-queen.png',
  k: 'https://static.stands4.com/images/symbol/3398_black-king.png',
  P: 'https://static.stands4.com/images/symbol/3409_white-pawn.png',
  R: 'https://static.stands4.com/images/symbol/3406_white-rook.png',
  N: 'https://static.stands4.com/images/symbol/3408_white-knight.png',
  B: 'https://static.stands4.com/images/symbol/3407_white-bishop.png',
  Q: 'https://static.stands4.com/images/symbol/3405_white-queen.png',
  K: 'https://static.stands4.com/images/symbol/3404_white-king.png'
};

let selectedSquare = null;

function renderBoard() {
  board.innerHTML = '';
  const position = game.board();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      const file = String.fromCharCode(97 + col); // 'a' to 'h'
      const rank = 8 - row;
      const squareId = file + rank;
      square.classList.add("square");
      square.classList.add((row + col) % 2 === 0 ? "white" : "black");
      square.dataset.square = squareId;

      const piece = position[row][col];
      if (piece) {
        const img = document.createElement("img");
        img.src = pieceImages[piece.color === 'w' ? piece.type.toUpperCase() : piece.type];
        img.alt = piece.type;
        square.appendChild(img);
      }

      square.addEventListener("click", () => onSquareClick(squareId));
      board.appendChild(square);
    }
  }
}

function onSquareClick(square) {
  if (!selectedSquare) {
    const moves = game.moves({ square, verbose: true });
    if (moves.length > 0) {
      selectedSquare = square;
      highlightSquare(square);
    }
  } else {
    const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
    clearHighlights();
    selectedSquare = null;

    if (move) {
      renderBoard();
      if (game.in_checkmate()) {
        alert("Checkmate! " + (game.turn() === 'w' ? "Black" : "White") + " wins.");
      } else if (game.in_stalemate()) {
        alert("Stalemate!");
      } else if (game.in_check()) {
        alert("Check!");
      }
    }
  }
}

function highlightSquare(square) {
  const el = document.querySelector(`[data-square="${square}"]`);
  if (el) el.classList.add('selected');
}

function clearHighlights() {
  document.querySelectorAll('.square').forEach(el => el.classList.remove('selected'));
}

renderBoard();
