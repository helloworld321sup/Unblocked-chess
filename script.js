// Wait until DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const squares = document.querySelectorAll('.square');
  let selectedSquare = null;

  squares.forEach(square => {
    square.addEventListener('click', () => {
      // If no piece selected yet and clicked on a piece, select it
      if (!selectedSquare && square.querySelector('img')) {
        selectedSquare = square;
        square.classList.add('selected');
        highlightLegalMoves(square);
      }
      // If a piece is selected and clicked on a different square, move piece
      else if (selectedSquare) {
        movePiece(selectedSquare, square);
        clearHighlights();
        selectedSquare = null;
      }
    });
  });

  function highlightLegalMoves(square) {
    // Simple example: highlight all empty squares (you can improve logic later)
    squares.forEach(sq => {
      if (!sq.querySelector('img')) {
        sq.classList.add('highlight');
      }
    });
  }

  function clearHighlights() {
    squares.forEach(sq => {
      sq.classList.remove('highlight');
      sq.classList.remove('selected');
    });
  }

  function movePiece(fromSquare, toSquare) {
    const pieceImg = fromSquare.querySelector('img');
    if (pieceImg) {
      // Move piece image to new square
      toSquare.appendChild(pieceImg);
      fromSquare.innerHTML = '';
    }
  }
});
