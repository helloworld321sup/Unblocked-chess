const chess = new Chess();
const board = document.querySelector('.chess-board');
let selectedSquare = null;
let lastMove = null;
let moveCount = 1;
let undoneMoves = [];
let boardFlipped = false;
let gameEnded = false;

// --- UI assets ---
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

const sounds = {
  move: new Audio("http://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3"),
  capture: new Audio("http://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3"),
  castle: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/castle.mp3"),
  check: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3"),
  promotion: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/promote.mp3"),
  checkmate: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_WEBM_/default/game-end.webm")
};

// --- Engine config ---
let playerColor = localStorage.getItem('playerColor') || 'white';

// Sebastian Lague's clean AI approach with difficulty levels
function getAIConfig() {
  const difficulty = localStorage.getItem('botDifficulty') || 'medium';
  switch (difficulty) {
    case 'easy':
      return { depth: 2, useAdvancedEval: false, useOpeningBook: false };
    case 'hard':
      return { depth: 5, useAdvancedEval: true, useOpeningBook: true };
    case 'medium':
    default:
      return { depth: 3, useAdvancedEval: true, useOpeningBook: true };
  }
}

let AI = { 
  side: playerColor === 'white' ? 'b' : 'w', 
  ...getAIConfig()
};

// Update AI side when page loads
function updateAISide() {
  playerColor = localStorage.getItem('playerColor') || 'white';
  AI.side = playerColor === 'white' ? 'b' : 'w';
  AI = { ...AI, ...getAIConfig() };
}

// Initialize AI
updateAISide();

// --- Piece values ---
const PIECE_VALUES = {
  'p': 100,
  'n': 320,
  'b': 330,
  'r': 500,
  'q': 900,
  'k': 0
};

// --- Piece-Square Tables (Sebastian Lague's approach) ---
const pst_pawn = [
  [ 0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [ 5,  5, 10, 25, 25, 10,  5,  5],
  [ 0,  0,  0, 20, 20,  0,  0,  0],
  [ 5, -5,-10,  0,  0,-10, -5,  5],
  [ 5, 10, 10,-20,-20, 10, 10,  5],
  [ 0,  0,  0,  0,  0,  0,  0,  0]
];

const pst_knight = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

const pst_bishop = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

const pst_rook = [
  [  0,  0,  0,  5,  5,  0,  0,  0],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [  5, 10, 10, 10, 10, 10, 10,  5],
  [  0,  0,  0,  0,  0,  0,  0,  0]
];

const pst_queen = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [ -5,  0,  5,  5,  5,  5,  0, -5],
  [  0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

const pst_king = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [ 20, 20,  0,  0,  0,  0, 20, 20],
  [ 20, 30, 10,  0,  0, 10, 30, 20]
];

function getPieceValue(piece) {
  return PIECE_VALUES[piece] || 0;
}

function getPST(piece, row, col) {
  let pst;
  switch (piece.type) {
    case 'p': pst = pst_pawn; break;
    case 'n': pst = pst_knight; break;
    case 'b': pst = pst_bishop; break;
    case 'r': pst = pst_rook; break;
    case 'q': pst = pst_queen; break;
    case 'k': pst = pst_king; break;
    default: return 0;
  }
  
  // For black pieces, flip the board
  const actualRow = piece.color === 'w' ? row : 7 - row;
  return pst[actualRow][col];
}

// --- Sebastian Lague's clean evaluation with advanced features ---
function evaluateBoard(game) {
  let total = 0;
  const board = game.board();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = board[row][col];
      if (square !== null) {
        let value = getPieceValue(square.type);
        let pstBonus = getPST(square, row, col);
        
        // Hanging piece check
        const squareName = String.fromCharCode(97 + col) + (8 - row);
        const isAttacked = isSquareAttacked(game, squareName, square.color === 'w' ? 'b' : 'w');
        const isDefended = isSquareAttacked(game, squareName, square.color);
        
        if (isAttacked && !isDefended) {
          pstBonus -= value * 0.8; // 80% penalty for hanging pieces
        }
        
        // Advanced evaluation for hard difficulty
        if (AI.useAdvancedEval) {
          // Center control bonus
          if ((row >= 3 && row <= 4) && (col >= 3 && col <= 4)) {
            pstBonus += square.type === 'p' ? 12 : 5;
          }
          
          // King evaluation
          if (square.type === 'k') {
            const kingMoves = game.moves({ square: squareName, verbose: true });
            
            if (isInEndgame()) {
              // King activity in endgame
              pstBonus += kingMoves.length * 5;
              
              // King centralization bonus in endgame
              const centerDistance = Math.abs(row - 3.5) + Math.abs(col - 3.5);
              pstBonus += (7 - centerDistance) * 3;
            } else {
              // King safety in opening/midgame
              pstBonus -= kingMoves.length * 2;
            }
          }
          
          // Pawn structure evaluation
          if (square.type === 'p') {
            // Connected pawns bonus
            let hasConnectedPawn = false;
            for (let offset = -1; offset <= 1; offset += 2) {
              const adjFile = String.fromCharCode(97 + col + offset);
              if (adjFile >= 'a' && adjFile <= 'h') {
                const adjSquare = adjFile + (8 - row);
                const adjPiece = game.get(adjSquare);
                if (adjPiece && adjPiece.type === 'p' && adjPiece.color === square.color) {
                  pstBonus += 12; // Connected pawn bonus
                  hasConnectedPawn = true;
                  break;
                }
              }
            }
            
            // Isolated pawn penalty
            if (!hasConnectedPawn && isIsolatedPawn(square, row, col, game)) {
              pstBonus -= 20;
            }
            
            // Doubled pawn penalty
            if (isDoubledPawn(square, row, col, game)) {
              pstBonus -= 15;
            }
            
            // Passed pawn bonus
            if (isPassedPawn(square, row, col, game)) {
              pstBonus += 25;
            }
          }
          
          // Piece mobility
          if (square.type === 'q' || square.type === 'r' || square.type === 'b' || square.type === 'n') {
            const moves = game.moves({ square: squareName, verbose: true });
            pstBonus += moves.length * 1.5;
          }
        }
        
        if (square.color === 'w') {
          total += value + pstBonus;
        } else {
          total -= value + pstBonus;
        }
      }
    }
  }
  
  return total;
}

// --- Sebastian Lague's clean move ordering ---
function orderMoves(ch, depth) {
  const moves = ch.moves({ verbose: true });
  return moves.sort((a, b) => {
    // 1. Captures (Most Valuable Victim - Least Valuable Attacker)
    if (a.captured && b.captured) {
      const aScore = PIECE_VALUES[a.captured] - PIECE_VALUES[a.piece];
      const bScore = PIECE_VALUES[b.captured] - PIECE_VALUES[b.piece];
      return bScore - aScore;
    }
    if (a.captured && !b.captured) return -1;
    if (!a.captured && b.captured) return 1;
    
    // 2. Promotions
    if (a.promotion && !b.promotion) return -1;
    if (!a.promotion && b.promotion) return 1;
    
    // 3. Piece value
    return PIECE_VALUES[b.piece] - PIECE_VALUES[a.piece];
  });
}

// --- Sebastian Lague's clean minimax search ---
function search(depth, alpha, beta, isMaximizing) {
  // Base case
  if (depth === 0) {
    return quiescenceSearch(alpha, beta, 0);
  }
  
  // Check for game over
  if (chess.is_checkmate()) {
    return isMaximizing ? -10000 : 10000;
  }
  if (chess.is_stalemate() || chess.is_draw()) {
    return 0;
  }
  
  const moves = orderMoves(chess, depth);
  let bestScore = isMaximizing ? -Infinity : Infinity;
  
  for (const move of moves) {
    const moveResult = chess.move(move);
    
    if (moveResult) {
      const score = -search(depth - 1, -beta, -alpha, !isMaximizing);
      chess.undo();
      
      if (isMaximizing) {
        bestScore = Math.max(bestScore, score);
        alpha = Math.max(alpha, score);
        if (alpha >= beta) break; // Beta cutoff
      } else {
        bestScore = Math.min(bestScore, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break; // Alpha cutoff
      }
    }
  }
  
  return bestScore;
}

// --- Quiescence search for tactics ---
function quiescenceSearch(alpha, beta, depth) {
  const standPat = evaluateBoard(chess);
  
  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;
  
  if (depth >= 4) return standPat;
  
  const moves = chess.moves({ verbose: true }).filter(move => move.captured);
  const orderedMoves = moves.sort((a, b) => {
    return PIECE_VALUES[b.captured] - PIECE_VALUES[a.captured];
  });
  
  for (const move of orderedMoves) {
    const moveResult = chess.move(move);
    if (moveResult) {
      const score = -quiescenceSearch(-beta, -alpha, depth + 1);
      chess.undo();
      
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
  }
  
  return alpha;
}

// --- Helper functions ---
function isInEndgame() {
  const board = chess.board();
  let pieceCount = 0;
  let queenCount = 0;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = board[row][col];
      if (square !== null) {
        pieceCount++;
        if (square.type === 'q') queenCount++;
      }
    }
  }
  
  return pieceCount <= 12 || queenCount === 0;
}

function isPassedPawn(pawn, row, col, game) {
  const enemyColor = pawn.color === 'w' ? 'b' : 'w';
  const direction = pawn.color === 'w' ? 1 : -1;
  
  for (let r = row + direction; r >= 0 && r < 8; r += direction) {
    // Check same file
    const sameFile = game.get(String.fromCharCode(97 + col) + (8 - r));
    if (sameFile && sameFile.type === 'p' && sameFile.color === enemyColor) {
      return false;
    }
    
    // Check adjacent files
    for (let c = Math.max(0, col - 1); c <= Math.min(7, col + 1); c++) {
      if (c === col) continue;
      const adjSquare = game.get(String.fromCharCode(97 + c) + (8 - r));
      if (adjSquare && adjSquare.type === 'p' && adjSquare.color === enemyColor) {
        return false;
      }
    }
  }
  
  return true;
}

function isIsolatedPawn(pawn, row, col, game) {
  const file = String.fromCharCode(97 + col);
  
  for (let offset = -1; offset <= 1; offset += 2) {
    const adjFile = String.fromCharCode(97 + col + offset);
    if (adjFile >= 'a' && adjFile <= 'h') {
      for (let r = 0; r < 8; r++) {
        const square = game.get(adjFile + (8 - r));
        if (square && square.type === 'p' && square.color === pawn.color) {
          return false;
        }
      }
    }
  }
  
  return true;
}

function isDoubledPawn(pawn, row, col, game) {
  const file = String.fromCharCode(97 + col);
  
  for (let r = 0; r < 8; r++) {
    if (r === row) continue;
    const square = game.get(file + (8 - r));
    if (square && square.type === 'p' && square.color === pawn.color) {
      return true;
    }
  }
  
  return false;
}

function isSquareAttacked(game, square, byColor) {
  const board = game.board();
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === byColor) {
        const pieceSquare = String.fromCharCode(97 + col) + (8 - row);
        const moves = game.moves({ square: pieceSquare, verbose: true });
        
        for (const move of moves) {
          if (move.to === square) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
}

// --- Find best move ---
function findBestMove() {
  const moves = orderMoves(chess, AI.depth);
  let bestMove = null;
  let bestScore = -Infinity;
  
  for (const move of moves) {
    const moveResult = chess.move(move);
    if (moveResult) {
      const score = -search(AI.depth - 1, -Infinity, Infinity, false);
      chess.undo();
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
  }
  
  return bestMove;
}

// --- Opening book ---
const openingBook = {
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1": [
    "e2e4", "d2d4", "g1f3", "c2c4"
  ],
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1": [
    "e7e5", "c7c5", "e7e6", "c7c6"
  ],
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2": [
    "g1f3", "b1c3", "f1c4", "d2d4"
  ],
  "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1": [
    "d7d5", "g8f6", "e7e6", "c7c5"
  ],
  "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3 0 1": [
    "e7e5", "g8f6", "e7e6", "c7c5"
  ]
};

function getOpeningMove() {
  if (!AI.useOpeningBook) return null;
  
  const fen = chess.fen().split(' ')[0]; // Get position part only
  const moves = openingBook[fen];
  if (moves && moves.length > 0) {
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    return {
      from: randomMove.substring(0, 2),
      to: randomMove.substring(2, 4),
      promotion: randomMove.length > 4 ? randomMove[4] : undefined
    };
  }
  return null;
}

// --- Make AI move ---
function makeAIMove() {
  if (chess.turn() !== AI.side || chess.is_game_over()) return;
  
  // Try opening book first
  const openingMove = getOpeningMove();
  if (openingMove) {
    const move = chess.move(openingMove);
    if (move) {
      renderBoard();
      updateGameStatus();
      playMoveSound(move);
      return;
    }
  }
  
  // Use minimax search
  const bestMove = findBestMove();
  if (bestMove) {
    const move = chess.move(bestMove);
    if (move) {
      renderBoard();
      updateGameStatus();
      playMoveSound(move);
    }
  }
}

// --- UI rendering with proper move dots and selection ---
function renderBoard() {
  const boardState = chess.board();
  
  // Clear all visual indicators first
  document.querySelectorAll('.square').forEach(square => {
    square.classList.remove('selected', 'highlight', 'recent-move');
    // Remove ALL move dots
    const existingDots = square.querySelectorAll('.move-dot');
    existingDots.forEach(dot => dot.remove());
  });
  
  // Update pieces efficiently
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const squareName = String.fromCharCode(97 + col) + (8 - row);
      const square = document.querySelector(`[data-square="${squareName}"]`);
      if (!square) continue;
      
      const piece = boardState[row][col];
      const existingImg = square.querySelector('img');
      
      if (piece) {
        const key = piece.color + piece.type.toUpperCase();
        const expectedSrc = pieceImages[key];
        
        // Only update if the piece image is different
        if (!existingImg || existingImg.src !== expectedSrc) {
          if (existingImg) {
            existingImg.src = expectedSrc;
            existingImg.alt = key;
          } else {
            const img = document.createElement('img');
            img.src = expectedSrc;
            img.alt = key;
            img.draggable = false;
            img.dataset.square = squareName;
            square.appendChild(img);
          }
        }
      } else if (existingImg) {
        existingImg.remove();
      }
    }
  }
  
  // Add move dots for legal moves
  if (selectedSquare) {
    const legalMoves = chess.moves({ square: selectedSquare, verbose: true });
    legalMoves.forEach(move => {
      const target = document.querySelector(`[data-square="${move.to}"]`);
      if (target && !target.querySelector('.move-dot')) {
        const dot = document.createElement('div');
        dot.classList.add('move-dot');
        dot.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        dot.style.width = '20px';
        dot.style.height = '20px';
        dot.style.borderRadius = '50%';
        dot.style.position = 'absolute';
        dot.style.top = '50%';
        dot.style.left = '50%';
        dot.style.transform = 'translate(-50%, -50%)';
        dot.style.pointerEvents = 'none';
        target.appendChild(dot);
      }
    });
  }
  
  // Add selection highlight
  if (selectedSquare) {
    const selectedEl = document.querySelector(`[data-square="${selectedSquare}"]`);
    if (selectedEl) selectedEl.classList.add('selected');
  }
  
  // Add recent move highlights
  if (lastMove) {
    const fromSquare = document.querySelector(`[data-square="${lastMove.from}"]`);
    const toSquare = document.querySelector(`[data-square="${lastMove.to}"]`);
    if (fromSquare) fromSquare.classList.add('recent-move');
    if (toSquare) toSquare.classList.add('recent-move');
  }
}

function updateGameStatus() {
  const gameMessage = document.getElementById('game-message');
  const playerColorChess = playerColor === 'white' ? 'w' : 'b';
  
  if (chess.is_checkmate()) {
    gameMessage.textContent = `Checkmate! ${chess.turn() === 'w' ? 'Black' : 'White'} wins!`;
    gameEnded = true;
    showGameOverPopup();
  } else if (chess.is_stalemate()) {
    gameMessage.textContent = 'Stalemate!';
    gameEnded = true;
    showGameOverPopup();
  } else if (chess.is_draw()) {
    gameMessage.textContent = 'Draw!';
    gameEnded = true;
    showGameOverPopup();
  } else if (chess.is_check()) {
    gameMessage.textContent = `Check! ${chess.turn() === 'w' ? 'White' : 'Black'} to move`;
  } else {
    gameMessage.textContent = `${chess.turn() === 'w' ? 'White' : 'Black'} to move`;
  }
}

function playMoveSound(move) {
  const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  if (!soundEnabled) return;
  
  if (move.captured) {
    sounds.capture.play();
  } else if (move.flags.includes('k') || move.flags.includes('q')) {
    sounds.castle.play();
  } else if (move.san.includes('+')) {
    sounds.check.play();
  } else if (move.promotion) {
    sounds.promotion.play();
  } else {
    sounds.move.play();
  }
}

function showGameOverPopup() {
  const popup = document.getElementById('game-over-popup');
  popup.style.display = 'flex';
}

function hideGameOverPopup() {
  const popup = document.getElementById('game-over-popup');
  popup.style.display = 'none';
}

function showScorebook() {
  const popup = document.getElementById('scorebook-popup');
  popup.style.display = 'flex';
  
  // Close game over popup if open
  const gameOverPopup = document.getElementById('game-over-popup');
  if (gameOverPopup.style.display === 'flex') {
    gameOverPopup.style.display = 'none';
  }
  
  // Display PGN
  const pgnText = document.getElementById('pgn-text');
  pgnText.value = chess.pgn();
}

function hideScorebook() {
  const popup = document.getElementById('scorebook-popup');
  popup.style.display = 'none';
  
  // Re-show game over popup if game has ended
  if (chess.game_over() || gameEnded) {
    showGameOverPopup();
  }
}

function copyPGN() {
  const pgnText = document.getElementById('pgn-text');
  pgnText.select();
  document.execCommand('copy');
  
  // Show feedback
  const copyBtn = document.getElementById('copy-pgn-btn');
  const originalText = copyBtn.textContent;
  copyBtn.textContent = 'Copied!';
  setTimeout(() => {
    copyBtn.textContent = originalText;
  }, 1000);
}

function resign() {
  gameEnded = true;
  const gameMessage = document.getElementById('game-message');
  gameMessage.textContent = `Game over! ${playerColor === 'white' ? 'Black' : 'White'} wins by resignation!`;
  showGameOverPopup();
}

function flipBoard() {
  boardFlipped = !boardFlipped;
  const board = document.querySelector('.chess-board');
  board.style.transform = boardFlipped ? 'rotate(180deg)' : 'rotate(0deg)';
}

// --- Event listeners ---
document.addEventListener('DOMContentLoaded', function() {
  renderBoard();
  updateGameStatus();
  
  // Apply settings
  const blackSquareColor = localStorage.getItem('blackSquareColor') || '#769656';
  document.documentElement.style.setProperty('--black-square-color', blackSquareColor);
  
  // Make AI move if it's AI's turn
  if (chess.turn() === AI.side) {
    setTimeout(makeAIMove, 500);
  }
});

// Board click handler
document.addEventListener('click', function(e) {
  if (e.target.closest('.square')) {
    const square = e.target.closest('.square');
    const squareName = square.dataset.square;
    
    const playerColorChess = playerColor === 'white' ? 'w' : 'b';
    
    if (chess.turn() !== playerColorChess || chess.is_game_over() || gameEnded) return;
    
    if (selectedSquare) {
      const move = chess.move({
        from: selectedSquare,
        to: squareName,
        promotion: 'q'
      });
      
      if (move) {
        lastMove = move;
        renderBoard();
        updateGameStatus();
        playMoveSound(move);
        selectedSquare = null;
        
        // Make AI move after player move
        setTimeout(makeAIMove, 500);
      } else {
        selectedSquare = squareName;
      }
    } else {
      const piece = chess.get(squareName);
      if (piece && piece.color === playerColorChess) {
        selectedSquare = squareName;
      }
    }
    
    renderBoard();
  }
});

// Resign button
document.getElementById('resign-btn').addEventListener('click', resign);

// Flip board button
document.getElementById('flip-btn').addEventListener('click', flipBoard);

// Game over popup buttons
document.getElementById('play-again-btn').addEventListener('click', function() {
  window.location.href = 'choose-color.html';
});

document.getElementById('home-btn').addEventListener('click', function() {
  window.location.href = 'index.html';
});

// Scorebook buttons
document.getElementById('copy-pgn-btn').addEventListener('click', copyPGN);
document.getElementById('close-scorebook-btn').addEventListener('click', hideScorebook);

// Copy PGN from game over popup
document.getElementById('copy-pgn-gameover-btn').addEventListener('click', function() {
  showScorebook();
});
