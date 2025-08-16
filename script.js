document.addEventListener('DOMContentLoaded', () => {
  const game = new Chess();
  let selectedSquare = null;

  function renderBoard() {
    const board = document.querySelector('.chess-board');
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    board.innerHTML = ''; // Clear existing board

    for (let rank = 8; rank >= 1; rank--) {
      const row = document.createElement('div');
      row.classList.add('row');

      for (let file = 0; file < 8; file++) {
        const squareId = files[file] + rank;
        const squareColor = (file + rank) % 2 === 0 ? 'white' : 'black';
        const square = document.createElement('div');
        square.classList.add('square', squareColor);
        square.setAttribute('data-square', squareId);

        // Add piece if present
        const piece = game.get(squareId);
        if (piece) {
          const img = document.createElement('img');
          img.src = getPieceImage(piece.color, piece.type);
          img.alt = `${piece.color} ${piece.type}`;
          square.appendChild(img);
        }

        // Click event
        square.addEventListener('click', handleSquareClick);
        row.appendChild(square);
      }

      board.appendChild(row);
    }
  }

  function getPieceImage(color, type) {
    return `images/${color}-${type}.png`; // Make sure filenames match this pattern
  }

  function handleSquareClick(event) {
  const squareElement = event.currentTarget;
  const square = squareElement.getAttribute('data-square');

  console.log("Clicked square:", square); // DEBUG

  clearHighlights();

  if (selectedSquare) {
    const move = game.move({
      from: selectedSquare,
      to: square,
      promotion: 'q'
    });

    if (move) {
      console.log("Move made:", move); // DEBUG
      selectedSquare = null;
      renderBoard();
    } else {
      console.log("Invalid move from", selectedSquare, "to", square); // DEBUG
      selectedSquare = null;
      renderBoard();
    }
  } else {
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      selectedSquare = square;
      squareElement.classList.add('selected');
      console.log("Selected square:", square); // DEBUG

      const moves = game.moves({ square, verbose: true });
      console.log("Legal moves:", moves); // DEBUG

      moves.forEach(move => {
        const targetSquare = document.querySelector(`[data-square="${move.to}"]`);
        if (targetSquare) {
          targetSquare.classList.add('highlight');
        }
      });
    }
  }
}

  // Initial render
  renderBoard();
});
