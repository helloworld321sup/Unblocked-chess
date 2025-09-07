const chess = new Chess();
const board = document.querySelector('.chess-board');
let selectedPiece = null;
let boardFlipped = false;

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

function renderBoard() {
  const positions = chess.board();
  
  // Clear all pieces first
  board.querySelectorAll('.square img').forEach(img => img.remove());
  
  // Update pieces
  board.querySelectorAll('.square').forEach(square => {
    const squareName = square.getAttribute('data-square');
    const file = squareName.charCodeAt(0) - 97;
    const rank = 8 - parseInt(squareName[1]);
    const piece = positions[rank][file];

    if (piece) {
      const key = piece.color + piece.type.toUpperCase();
      const img = document.createElement('img');
      img.src = pieceImages[key];
      img.alt = key;
      img.draggable = false;
      square.appendChild(img);
    }
  });
}

function updateMessage(message, type = 'info') {
  const messageDiv = document.getElementById('setup-message');
  messageDiv.textContent = message;
  messageDiv.className = `setup-message ${type}`;
  
  if (type === 'error') {
    setTimeout(() => {
      messageDiv.textContent = '';
      messageDiv.className = 'setup-message';
    }, 3000);
  }
}

function clearBoard() {
  chess.clear();
  renderBoard();
  updateMessage('Board cleared');
}

function resetToStart() {
  chess.reset();
  renderBoard();
  updateMessage('Position reset to starting position');
}

function flipBoard() {
  boardFlipped = !boardFlipped;
  const rows = board.querySelectorAll('.row');
  const rowsArray = Array.from(rows);
  
  // Clear the board first
  board.innerHTML = '';
  
  if (boardFlipped) {
    // Reverse the order of rows
    rowsArray.reverse().forEach(row => board.appendChild(row));
  } else {
    // Restore original order
    rowsArray.reverse().forEach(row => board.appendChild(row));
  }
  
  // Re-render the board with pieces
  renderBoard();
}

function startGame() {
  // Validate position
  if (!chess.validate()) {
    updateMessage('Invalid position! Please check your setup.', 'error');
    return;
  }
  
  // Check for kings
  const board = chess.board();
  let whiteKing = false, blackKing = false;
  
  for (let row of board) {
    for (let piece of row) {
      if (piece && piece.type === 'k') {
        if (piece.color === 'w') whiteKing = true;
        if (piece.color === 'b') blackKing = true;
      }
    }
  }
  
  if (!whiteKing || !blackKing) {
    updateMessage('Both sides must have exactly one king!', 'error');
    return;
  }
  
  // Store the position in localStorage
  const position = {
    fen: chess.fen(),
    turn: document.getElementById('turn-select').value,
    castling: {
      w: {
        k: document.getElementById('white-kingside').checked,
        q: document.getElementById('white-queenside').checked
      },
      b: {
        k: document.getElementById('black-kingside').checked,
        q: document.getElementById('black-queenside').checked
      }
    },
    enPassant: document.getElementById('en-passant-select').value
  };
  
  localStorage.setItem('customPosition', JSON.stringify(position));
  updateMessage('Position saved! Redirecting to game...');
  
  // Redirect to choose color page
  setTimeout(() => {
    window.location.href = 'choose-color.html';
  }, 1000);
}

// Piece selection
document.querySelectorAll('.piece-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active class from all buttons
    document.querySelectorAll('.piece-btn').forEach(b => b.classList.remove('active'));
    
    // Add active class to clicked button
    btn.classList.add('active');
    
    selectedPiece = btn.dataset.piece;
    updateMessage(`Selected: ${btn.title || selectedPiece}`);
  });
});

// Board click handling
board.addEventListener('click', (e) => {
  const square = e.target.closest('.square');
  if (!square) return;
  
  const squareName = square.getAttribute('data-square');
  
  if (selectedPiece === 'clear') {
    clearBoard();
    return;
  }
  
  if (selectedPiece === 'erase') {
    // Remove piece from square
    const file = squareName.charCodeAt(0) - 97;
    const rank = 8 - parseInt(squareName[1]);
    chess.remove(squareName);
    renderBoard();
    updateMessage(`Removed piece from ${squareName}`);
    return;
  }
  
  if (selectedPiece && selectedPiece !== 'clear' && selectedPiece !== 'erase') {
    // Place piece on square
    const color = selectedPiece[0] === 'w' ? 'w' : 'b';
    const type = selectedPiece[1].toLowerCase();
    
    // Remove existing piece first
    chess.remove(squareName);
    
    // Add new piece
    chess.put({ type, color }, squareName);
    renderBoard();
    updateMessage(`Placed ${selectedPiece} on ${squareName}`);
  }
});

// Control buttons
document.getElementById('clear-board-btn').addEventListener('click', clearBoard);
document.getElementById('reset-position-btn').addEventListener('click', resetToStart);
document.getElementById('flip-board-btn').addEventListener('click', flipBoard);
document.getElementById('start-game-btn').addEventListener('click', startGame);
document.getElementById('home-btn').addEventListener('click', () => {
  window.location.href = 'index.html';
});

// Apply board color from settings
const boardColor = localStorage.getItem('boardColor') || '#4800ff';
document.documentElement.style.setProperty('--black-square-color', boardColor);

// Initial render
renderBoard();
updateMessage('Click a piece to select it, then click on the board to place it');
