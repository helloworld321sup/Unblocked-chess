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

    clearHighlights();

    if (selectedSquare) {
      const move = game.move({
        from: selectedSquare,
        to: square,
        promotion: 'q', // auto-promote to queen
      });

      if (move) {
        selectedSquare = null;
        renderBoard();
      } else {
        // Invalid move
        selectedSquare = null;
        renderBoard(); // refresh to clear highlight
      }
    } else {
      // Select square
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        selectedSquare = square;
        squareElement.classList.add('selected');
      }
    }
  }

  function clearHighlights() {
    document.querySelectorAll('.square').forEach(sq => {
      sq.classList.remove('selected', 'highlight');
    });
  }

  // Initial render
  renderBoard();
});
