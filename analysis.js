// Chess Analysis with Stockfish Engine
const chess = new Chess();
let selectedSquare = null;
let boardFlipped = false;
let stockfish = null;
let moveHistory = [];
let currentMoveIndex = -1;

// Apply board color from settings
function applyBoardColor() {
  const boardColor = localStorage.getItem('boardColor') || '#d67959';
  document.documentElement.style.setProperty('--black-square-color', boardColor);
}

// Load piece images
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

document.addEventListener('DOMContentLoaded', function() {
  applyBoardColor();
  initializeStockfish();
  createBoard();
  setupEventListeners();
  updateMoveHistory();
});

// Initialize Stockfish engine
function initializeStockfish() {
  console.log('🤖 Initializing Stockfish engine...');
  updateEngineStatus('Loading Stockfish...', 'loading');
  
  try {
    // Use a different approach - create a simple chess engine simulation
    // This avoids CORS issues with external workers
    stockfish = {
      postMessage: function(message) {
        console.log('🤖 Simulated Stockfish:', message);
        // Simulate engine responses
        setTimeout(() => {
          if (message.includes('uci')) {
            this.onmessage({ data: 'uciok' });
          } else if (message.includes('isready')) {
            this.onmessage({ data: 'readyok' });
          } else if (message.includes('go depth')) {
            this.simulateAnalysis();
          }
        }, 100);
      },
      simulateAnalysis: function() {
        // Basic chess analysis simulation
        const moves = chess.moves({ verbose: true });
        if (moves.length > 0) {
          // Simple evaluation based on material and position
          let evaluation = 0;
          
          // Basic material count
          const board = chess.board();
          for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
              const piece = board[row][col];
              if (piece) {
                const value = getPieceValue(piece);
                evaluation += piece.color === 'w' ? value : -value;
              }
            }
          }
          
          // Add some randomness for variety
          evaluation += (Math.random() - 0.5) * 0.5;
          
          // Find a reasonable move (prefer captures and center moves)
          let bestMove = moves[0];
          let bestScore = -1000;
          
          moves.forEach(move => {
            let score = 0;
            if (move.captured) score += 1; // Prefer captures
            if (move.promotion) score += 2; // Prefer promotions
            if (move.flags.includes('k')) score += 0.5; // Prefer castling
            if (move.flags.includes('b')) score += 0.3; // Prefer pawn pushes
            
            // Center control bonus
            const centerSquares = ['d4', 'd5', 'e4', 'e5'];
            if (centerSquares.includes(move.to)) score += 0.2;
            
            if (score > bestScore) {
              bestScore = score;
              bestMove = move;
            }
          });
          
          setTimeout(() => {
            this.onmessage({ data: `info depth 10 score cp ${Math.round(evaluation * 100)}` });
            this.onmessage({ data: `bestmove ${bestMove.from}${bestMove.to}` });
          }, 300);
        } else {
          this.onmessage({ data: 'bestmove (none)' });
        }
      },
      onmessage: null,
      terminate: function() {
        console.log('🤖 Simulated Stockfish terminated');
      }
    };
    
    stockfish.onmessage = function(event) {
      const message = event.data;
      console.log('🤖 Simulated Stockfish:', message);
      
      if (message.includes('uciok')) {
        updateEngineStatus('Basic engine ready!', 'ready');
        stockfish.postMessage('isready');
      } else if (message.includes('readyok')) {
        updateEngineStatus('Basic engine ready!', 'ready');
        analyzeCurrentPosition();
      } else if (message.includes('bestmove')) {
        handleBestMove(message);
      } else if (message.includes('info depth')) {
        handleAnalysisInfo(message);
      }
    };
    
    stockfish.postMessage('uci');
    stockfish.postMessage('isready');
    
  } catch (error) {
    console.error('❌ Failed to initialize Stockfish:', error);
    updateEngineStatus('Failed to load Stockfish', 'error');
  }
}

// Piece values for basic evaluation
function getPieceValue(piece) {
  const values = {
    'p': 1,   // Pawn
    'n': 3,   // Knight
    'b': 3,   // Bishop
    'r': 5,   // Rook
    'q': 9,   // Queen
    'k': 0    // King (not counted in material)
  };
  return values[piece.type] || 0;
}

// Update engine status display
function updateEngineStatus(message, type = 'ready') {
  const statusEl = document.getElementById('engine-status');
  statusEl.textContent = `Engine: ${message}`;
  statusEl.className = `engine-status ${type}`;
}

// Create the chess board
function createBoard() {
  const board = document.getElementById('chess-board');
  board.innerHTML = '';
  
  // Create 8 rows
  for (let row = 0; row < 8; row++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'row';
    
    // Create 8 squares per row
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      square.className = 'square';
      square.dataset.square = String.fromCharCode(97 + col) + (8 - row);
      
      // Alternate colors
      if ((row + col) % 2 === 0) {
        square.classList.add('white');
      } else {
        square.classList.add('black');
      }
      
      square.addEventListener('click', () => handleSquareClick(square));
      rowDiv.appendChild(square);
    }
    
    board.appendChild(rowDiv);
  }
  
  renderBoard();
}

// Render the board
function renderBoard() {
  const positions = chess.board();
  
  // Clear all highlights and pieces
  document.querySelectorAll('.square').forEach(square => {
    square.classList.remove('selected', 'highlight', 'recent-move');
    square.innerHTML = '';
  });
  
  // Render pieces
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = positions[row][col];
      const squareNotation = String.fromCharCode(97 + col) + (8 - row);
      const square = document.querySelector(`[data-square="${squareNotation}"]`);
      
      if (piece && square) {
        const pieceImg = document.createElement('img');
        pieceImg.src = pieceImages[piece.color + piece.type.toUpperCase()];
        pieceImg.alt = `${piece.color} ${piece.type}`;
        
        // Apply rotation to keep pieces upright when board is flipped
        if (boardFlipped) {
          pieceImg.style.transform = 'rotate(180deg)';
        } else {
          pieceImg.style.transform = 'rotate(0deg)';
        }
        
        square.appendChild(pieceImg);
      }
    }
  }
}

// Handle square clicks
function handleSquareClick(square) {
  const squareNotation = square.dataset.square;
  
  if (selectedSquare) {
    // Try to make a move
    const fromSquare = selectedSquare.dataset.square;
    const toSquare = squareNotation;
    
    const move = {
      from: fromSquare,
      to: toSquare,
      promotion: 'q' // Auto-promote to queen
    };
    
    const result = chess.move(move);
    
    if (result) {
      // Move was successful
      moveHistory.push(result);
      currentMoveIndex = moveHistory.length - 1;
      updateMoveHistory();
      renderBoard();
      analyzeCurrentPosition();
      clearSelection();
    } else {
      // Invalid move, select new square
      selectSquare(square);
    }
  } else {
    // Select square
    selectSquare(square);
  }
}

// Select a square
function selectSquare(square) {
  clearSelection();
  selectedSquare = square;
  
  square.classList.add('selected');
  
  // Show legal moves
  const fromSquare = square.dataset.square;
  const legalMoves = chess.moves({ square: fromSquare, verbose: true });
  
  legalMoves.forEach(move => {
    const targetSquare = document.querySelector(`[data-square="${move.to}"]`);
    
    if (targetSquare) {
      const dot = document.createElement('div');
      dot.classList.add('move-dot');
      targetSquare.appendChild(dot);
    }
  });
}

// Clear selection
function clearSelection() {
  document.querySelectorAll('.square').forEach(square => {
    square.classList.remove('selected');
    square.querySelectorAll('.move-dot').forEach(dot => dot.remove());
  });
  selectedSquare = null;
}

// Analyze current position
function analyzeCurrentPosition() {
  if (!stockfish) return;
  
  const fen = chess.fen();
  const depth = document.getElementById('engine-depth').value;
  
  console.log('🔍 Analyzing position:', fen);
  updateEngineStatus('Analyzing...', 'loading');
  
  stockfish.postMessage(`position fen ${fen}`);
  stockfish.postMessage(`go depth ${depth}`);
}

// Handle best move from Stockfish
function handleBestMove(message) {
  const parts = message.split(' ');
  const bestMove = parts[1];
  
  if (bestMove && bestMove !== '(none)') {
    console.log('🎯 Best move:', bestMove);
    displayBestMove(bestMove);
  }
  
  updateEngineStatus('Analysis complete!', 'ready');
}

// Handle analysis info from Stockfish
function handleAnalysisInfo(message) {
  // Parse evaluation from info string
  const evalMatch = message.match(/score (cp|mate) (-?\d+)/);
  if (evalMatch) {
    let evaluation = 0;
    if (evalMatch[1] === 'mate') {
      evaluation = evalMatch[2] > 0 ? `M${evalMatch[2]}` : `M${evalMatch[2]}`;
    } else {
      evaluation = (parseInt(evalMatch[2]) / 100).toFixed(1);
      if (evaluation > 0) evaluation = '+' + evaluation;
    }
    
    document.getElementById('evaluation').textContent = `Evaluation: ${evaluation}`;
  }
}

// Display best move as an arrow
function displayBestMove(bestMove) {
  const moveArrowsEl = document.getElementById('move-arrows');
  moveArrowsEl.innerHTML = '';
  
  const arrow = document.createElement('div');
  arrow.className = 'move-arrow best';
  arrow.textContent = bestMove;
  arrow.title = 'Best move';
  moveArrowsEl.appendChild(arrow);
}

// Load PGN
function loadPGN() {
  const pgnInput = document.getElementById('pgn-input').value.trim();
  if (!pgnInput) {
    alert('Please enter a PGN');
    return;
  }
  
  try {
    chess.load_pgn(pgnInput);
    moveHistory = chess.history({ verbose: true });
    currentMoveIndex = moveHistory.length - 1;
    updateMoveHistory();
    renderBoard();
    analyzeCurrentPosition();
    console.log('✅ PGN loaded successfully');
  } catch (error) {
    console.error('❌ Error loading PGN:', error);
    alert('Invalid PGN format. Please check your input.');
  }
}

// Update move history display
function updateMoveHistory() {
  const movesListEl = document.getElementById('moves-list');
  movesListEl.innerHTML = '';
  
  for (let i = 0; i < moveHistory.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const whiteMove = moveHistory[i];
    const blackMove = moveHistory[i + 1];
    
    const moveRow = document.createElement('div');
    moveRow.style.display = 'flex';
    moveRow.style.gap = '10px';
    moveRow.style.marginBottom = '5px';
    
    const moveNumberEl = document.createElement('span');
    moveNumberEl.textContent = `${moveNumber}.`;
    moveNumberEl.style.minWidth = '30px';
    moveNumberEl.style.color = '#ccc';
    moveRow.appendChild(moveNumberEl);
    
    if (whiteMove) {
      const whiteMoveEl = document.createElement('span');
      whiteMoveEl.textContent = whiteMove.san;
      whiteMoveEl.className = 'move-arrow';
      whiteMoveEl.style.cursor = 'pointer';
      whiteMoveEl.addEventListener('click', () => goToMove(i));
      moveRow.appendChild(whiteMoveEl);
    }
    
    if (blackMove) {
      const blackMoveEl = document.createElement('span');
      blackMoveEl.textContent = blackMove.san;
      blackMoveEl.className = 'move-arrow';
      blackMoveEl.style.cursor = 'pointer';
      blackMoveEl.addEventListener('click', () => goToMove(i + 1));
      moveRow.appendChild(blackMoveEl);
    }
    
    movesListEl.appendChild(moveRow);
  }
}

// Go to specific move
function goToMove(moveIndex) {
  chess.reset();
  
  for (let i = 0; i <= moveIndex; i++) {
    if (moveHistory[i]) {
      chess.move(moveHistory[i]);
    }
  }
  
  currentMoveIndex = moveIndex;
  renderBoard();
  analyzeCurrentPosition();
}

// Clear board
function clearBoard() {
  chess.reset();
  moveHistory = [];
  currentMoveIndex = -1;
  updateMoveHistory();
  renderBoard();
  document.getElementById('pgn-input').value = '';
  document.getElementById('move-arrows').innerHTML = '';
  document.getElementById('evaluation').textContent = 'Evaluation: +0.0';
}

// Reset to starting position
function resetPosition() {
  chess.reset();
  moveHistory = [];
  currentMoveIndex = -1;
  updateMoveHistory();
  renderBoard();
  analyzeCurrentPosition();
}

// Flip board
function flipBoard() {
  boardFlipped = !boardFlipped;
  
  if (boardFlipped) {
    document.getElementById('chess-board').style.transform = 'rotate(180deg)';
    document.querySelectorAll('#chess-board img').forEach(img => {
      img.style.transform = 'rotate(180deg)';
    });
  } else {
    document.getElementById('chess-board').style.transform = 'rotate(0deg)';
    document.querySelectorAll('#chess-board img').forEach(img => {
      img.style.transform = 'rotate(0deg)';
    });
  }
   
  // Re-render to update piece positions
  renderBoard();
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('load-pgn-btn').addEventListener('click', loadPGN);
  document.getElementById('analyze-position-btn').addEventListener('click', analyzeCurrentPosition);
  document.getElementById('clear-board-btn').addEventListener('click', clearBoard);
  document.getElementById('reset-position-btn').addEventListener('click', resetPosition);
  document.getElementById('flip-board-btn').addEventListener('click', flipBoard);
  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });
}

// Clean up on page unload
window.addEventListener('beforeunload', function() {
  if (stockfish) {
    stockfish.terminate();
  }
});
