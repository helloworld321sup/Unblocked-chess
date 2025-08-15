document.addEventListener('DOMContentLoaded', () => {
  const game = new Chess(); // uses chess.js
  const squares = document.querySelectorAll('.square');
  let selectedSquare = null;

  squares.forEach(square => {
    square.addEventListener('click', () => {
      const from = selectedSquare?.dataset.square;
      const to = square.dataset.square;

      if (!selectedSquare && square.querySelector('img')) {
        const moves = game.moves({ square: square.dataset.square, verbose: true });
        if (moves.length) {
          selectedSquare = square;
          square.classList.add('selected');
          highlightMoves(moves);
        }
      } else if (selectedSquare) {
        const move = game.move({ from, to, promotion: 'q' });
        if (move) {
          movePiece(selectedSquare, square);
        }
        clearHighlights();
        selectedSquare = null;
      }
    });
  });

  function highlightMoves(moves) {
    clearHighlights();
    moves.forEach(move => {
      const toSquare = document.querySelector(`[data-square="${move.to}"]`);
      if (toSquare) toSquare.classList.add('highlight');
    });
  }

  function clearHighlights() {
    document.querySelectorAll('.square').forEach(sq => {
      sq.classList.remove('highlight', 'selected');
    });
  }

  function movePiece(fromSquare, toSquare) {
    const piece = fromSquare.querySelector('img');
    if (piece) {
      // Remove existing piece if captured
      if (toSquare.querySelector('img')) {
        toSquare.removeChild(toSquare.querySelector('img'));
      }
      toSquare.appendChild(piece);
      fromSquare.innerHTML = '';
    }
  }
});
