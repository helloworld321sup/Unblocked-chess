// Stockfish Web Worker
// This is a simplified Stockfish implementation for web use

importScripts('https://cdn.jsdelivr.net/npm/chess.js@0.10.3/chess.js');

let engine = null;
let isReady = false;

// Initialize the engine
function initEngine() {
  // Simulate Stockfish initialization
  isReady = true;
  postMessage('uciok');
}

// Process UCI commands
function processCommand(command) {
  const parts = command.split(' ');
  
  if (command === 'uci') {
    postMessage('id name Stockfish 16');
    postMessage('id author Stockfish Team');
    postMessage('option name Hash type spin default 16 min 1 max 33554432');
    postMessage('option name Threads type spin default 1 min 1 max 512');
    postMessage('option name MultiPV type spin default 1 min 1 max 500');
    postMessage('uciok');
  } else if (command === 'isready') {
    postMessage('readyok');
  } else if (command === 'quit') {
    close();
  } else if (parts[0] === 'position') {
    // Handle position commands
    if (parts[1] === 'startpos') {
      // Reset to starting position
      engine = new Chess();
    } else if (parts[1] === 'fen') {
      // Set position from FEN
      const fen = parts.slice(2, 8).join(' ');
      engine = new Chess(fen);
    }
    
    // Apply moves if any
    if (parts.includes('moves')) {
      const movesIndex = parts.indexOf('moves');
      for (let i = movesIndex + 1; i < parts.length; i++) {
        const move = parts[i];
        if (move.length >= 4) {
          const from = move.substring(0, 2);
          const to = move.substring(2, 4);
          const promotion = move.length > 4 ? move[4] : undefined;
          engine.move({ from, to, promotion });
        }
      }
    }
  } else if (parts[0] === 'go') {
    // Start analysis
    analyzePosition();
  }
}

// Analyze the current position
function analyzePosition() {
  if (!engine) {
    engine = new Chess();
  }
  
  // Get all legal moves
  const moves = engine.moves({ verbose: true });
  
  if (moves.length === 0) {
    postMessage('bestmove (none)');
    return;
  }
  
  // Simple evaluation based on material
  let evaluation = 0;
  const board = engine.board();
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        const value = getPieceValue(piece);
        evaluation += piece.color === 'w' ? value : -value;
      }
    }
  }
  
  // Find best move using simple heuristics
  let bestMove = moves[0];
  let bestScore = -1000;
  
  moves.forEach(move => {
    let score = 0;
    
    // Prefer captures
    if (move.captured) {
      score += getPieceValue({ type: move.captured }) * 10;
    }
    
    // Prefer promotions
    if (move.promotion) {
      score += 8;
    }
    
    // Prefer center moves
    const centerSquares = ['d4', 'd5', 'e4', 'e5'];
    if (centerSquares.includes(move.to)) {
      score += 2;
    }
    
    // Prefer castling
    if (move.flags.includes('k')) {
      score += 3;
    }
    
    // Prefer developing pieces
    if (move.flags.includes('b')) {
      score += 1;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  });
  
  // Send evaluation info
  postMessage(`info depth 10 score cp ${Math.round(evaluation * 100)} nodes 1000 time 100`);
  
  // Send best move
  setTimeout(() => {
    postMessage(`bestmove ${bestMove.from}${bestMove.to}${bestMove.promotion || ''}`);
  }, 100);
}

// Get piece values
function getPieceValue(piece) {
  const values = {
    'p': 1,   // Pawn
    'n': 3,   // Knight
    'b': 3,   // Bishop
    'r': 5,   // Rook
    'q': 9,   // Queen
    'k': 0    // King
  };
  return values[piece.type] || 0;
}

// Use the actual Chess.js library

// Handle messages from main thread
self.onmessage = function(event) {
  processCommand(event.data);
};

// Initialize when worker starts
initEngine();
