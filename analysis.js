// Chess Analysis with Stockfish Engine - Chess.com Style
const chess = new Chess();
let selectedSquare = null;
let boardFlipped = false;
let stockfish = null;
let moveHistory = [];
let currentMoveIndex = -1;
let analysisLines = [];
let currentAnalysis = null;
let isAnalyzing = false;
let evaluationBar = null;

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

// Initialize Stockfish engine with Chess.com-style features
function initializeStockfish() {
  console.log('🤖 Initializing Stockfish engine...');
  updateEngineStatus('Loading Stockfish...', 'loading');
  
  try {
    // Use local worker with enhanced implementation
    stockfish = new Worker('stockfish-worker.js');
    
    stockfish.onmessage = function(event) {
      const message = event.data;
      console.log('🤖 Stockfish:', message);
      
      if (message.includes('uciok')) {
        updateEngineStatus('Stockfish ready!', 'ready');
        stockfish.postMessage('isready');
      } else if (message.includes('readyok')) {
        updateEngineStatus('Stockfish ready!', 'ready');
        initializeEvaluationBar();
        analyzeCurrentPosition();
      } else if (message.includes('bestmove')) {
        handleBestMove(message);
      } else if (message.includes('info depth')) {
        handleAnalysisInfo(message);
      } else if (message.includes('error')) {
        updateEngineStatus('Engine error', 'error');
      }
    };
    
    stockfish.onerror = function(error) {
      console.error('❌ Stockfish error:', error);
      updateEngineStatus('Stockfish error', 'error');
    };
    
    // Initialize UCI
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
  
  // Add move dots for legal moves if a piece is selected
  if (selectedSquare) {
    const legalMoves = chess.moves({ square: selectedSquare, verbose: true });
    
    legalMoves.forEach(move => {
      const targetSquare = document.querySelector(`[data-square="${move.to}"]`);
      if (targetSquare && !targetSquare.querySelector('.move-dot')) {
        const dot = document.createElement('div');
        dot.classList.add('move-dot');
        targetSquare.appendChild(dot);
      }
    });
  }
  
  // Add selection highlight
  if (selectedSquare) {
    const selectedEl = document.querySelector(`[data-square="${selectedSquare}"]`);
    if (selectedEl) selectedEl.classList.add('selected');
  }
}

// Handle square clicks
function handleSquareClick(square) {
  const squareNotation = square.dataset.square;
  
  if (selectedSquare) {
    // Try to make a move
    const move = chess.move({ from: selectedSquare, to: squareNotation, promotion: 'q' });
    
    if (move) {
      // Move was successful
      moveHistory.push(move);
      currentMoveIndex = moveHistory.length - 1;
      updateMoveHistory();
      renderBoard();
      analyzeCurrentPosition();
      selectedSquare = null;
    } else {
      // Invalid move, select new square
      const piece = chess.get(squareNotation);
      if (piece && piece.color === chess.turn()) {
        selectedSquare = squareNotation;
      } else {
        selectedSquare = squareNotation;
      }
      renderBoard();
    }
  } else {
    // Select square
    const piece = chess.get(squareNotation);
    if (piece && piece.color === chess.turn()) {
      selectedSquare = squareNotation;
    } else {
      selectedSquare = squareNotation;
    }
    renderBoard();
  }
}

// Analyze current position with Chess.com-style features
function analyzeCurrentPosition() {
  if (!stockfish) return;
  
  const fen = chess.fen();
  const depth = document.getElementById('engine-depth').value;
  const multiPV = document.getElementById('engine-lines').value;
  
  console.log('🔍 Analyzing position:', fen);
  updateEngineStatus('Analyzing...', 'loading');
  
  // Clear previous analysis
  analysisLines = [];
  updateAnalysisLines();
  
  // Set position and start analysis
  stockfish.postMessage(`position fen ${fen}`);
  stockfish.postMessage(`setoption name MultiPV value ${multiPV}`);
  stockfish.postMessage(`go depth ${depth}`);
  
  isAnalyzing = true;
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

// Handle analysis info from Stockfish with Chess.com-style features
function handleAnalysisInfo(message) {
  // Parse evaluation from info string
  const evalMatch = message.match(/score (cp|mate) (-?\d+)/);
  const multipvMatch = message.match(/multipv (\d+)/);
  const depthMatch = message.match(/depth (\d+)/);
  const pvMatch = message.match(/pv ([a-h1-8]+)/);
  
  if (evalMatch) {
    let evaluation = 0;
    let isMate = false;
    
    if (evalMatch[1] === 'mate') {
      evaluation = parseInt(evalMatch[2]);
      isMate = true;
    } else {
      evaluation = parseInt(evalMatch[2]) / 100;
    }
    
    const multipv = multipvMatch ? parseInt(multipvMatch[1]) : 1;
    const depth = depthMatch ? parseInt(depthMatch[1]) : 0;
    const pv = pvMatch ? pvMatch[1] : '';
    
    // Update evaluation display
    updateEvaluationDisplay(evaluation, isMate);
    
    // Update evaluation bar
    updateEvaluationBar(evaluation, isMate);
    
    // Store analysis line
    if (multipv <= 5) { // Show up to 5 lines
      analysisLines[multipv - 1] = {
        evaluation,
        isMate,
        depth,
        pv: pv,
        multipv
      };
      updateAnalysisLines();
    }
  }
}

// Initialize evaluation bar
function initializeEvaluationBar() {
  const evaluationEl = document.getElementById('evaluation');
  evaluationEl.innerHTML = `
    <div class="evaluation-bar-container">
      <div class="evaluation-bar">
        <div class="evaluation-fill" id="evaluation-fill"></div>
        <div class="evaluation-text" id="evaluation-text">+0.0</div>
      </div>
    </div>
  `;
  evaluationBar = document.getElementById('evaluation-fill');
}

// Update evaluation display
function updateEvaluationDisplay(evaluation, isMate) {
  const evaluationText = document.getElementById('evaluation-text');
  if (!evaluationText) return;
  
  let displayText = '';
  if (isMate) {
    displayText = evaluation > 0 ? `+M${Math.abs(evaluation)}` : `-M${Math.abs(evaluation)}`;
  } else {
    displayText = evaluation > 0 ? `+${evaluation.toFixed(1)}` : evaluation.toFixed(1);
  }
  
  evaluationText.textContent = displayText;
}

// Update evaluation bar (Chess.com style)
function updateEvaluationBar(evaluation, isMate) {
  if (!evaluationBar) return;
  
  let percentage = 50; // Neutral position
  
  if (isMate) {
    // Mate positions
    if (evaluation > 0) {
      percentage = 100; // White winning
    } else {
      percentage = 0; // Black winning
    }
  } else {
    // Convert centipawns to percentage
    const maxEval = 5.0; // Maximum evaluation to show
    const clampedEval = Math.max(-maxEval, Math.min(maxEval, evaluation));
    percentage = 50 + (clampedEval / maxEval) * 50;
  }
  
  evaluationBar.style.width = `${percentage}%`;
  evaluationBar.style.backgroundColor = percentage > 50 ? '#4a90e2' : '#e74c3c';
}

// Update analysis lines display
function updateAnalysisLines() {
  const analysisContainer = document.getElementById('move-arrows');
  if (!analysisContainer) return;
  
  analysisContainer.innerHTML = '';
  
  analysisLines.forEach((line, index) => {
    if (!line) return;
    
    const lineEl = document.createElement('div');
    lineEl.className = `analysis-line line-${index + 1}`;
    
    const evaluationText = line.isMate 
      ? (line.evaluation > 0 ? `+M${Math.abs(line.evaluation)}` : `-M${Math.abs(line.evaluation)}`)
      : (line.evaluation > 0 ? `+${line.evaluation.toFixed(1)}` : line.evaluation.toFixed(1));
    
    const lineColors = ['#4a90e2', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c'];
    const lineColor = lineColors[index] || '#4a90e2';
    
    lineEl.innerHTML = `
      <div class="line-number" style="background-color: ${lineColor}">${index + 1}</div>
      <div class="line-evaluation">${evaluationText}</div>
      <div class="line-depth">d${line.depth}</div>
      <div class="line-moves">${formatPV(line.pv)}</div>
    `;
    
    analysisContainer.appendChild(lineEl);
  });
}

// Format principal variation moves
function formatPV(pv) {
  if (!pv) return '';
  
  const moves = [];
  for (let i = 0; i < pv.length; i += 4) {
    if (i + 4 <= pv.length) {
      const move = pv.substring(i, i + 4);
      moves.push(move);
    }
  }
  
  return moves.slice(0, 3).join(' '); // Show first 3 moves
}

// Display best move as an arrow
function displayBestMove(bestMove) {
  // This is now handled by updateAnalysisLines
  if (analysisLines.length > 0) {
    updateAnalysisLines();
  }
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
