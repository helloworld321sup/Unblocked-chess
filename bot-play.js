const chess = new Chess();
const board = document.querySelector('.chess-board');
let selectedSquare = null;
let lastMove = null;
let moveCount = 1;
let undoneMoves = [];
let boardFlipped = false;
let gameEnded = false; // Track if game has ended (including resignation)

// --- UI assets ---
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

// Get difficulty setting and configure AI
function getAIConfig() {
  const difficulty = localStorage.getItem('botDifficulty') || 'medium';
  let depth, useAdvancedEval, useOpeningBook;
  
  switch (difficulty) {
    case 'easy':
      depth = 2;
      useAdvancedEval = false;
      useOpeningBook = false;
      break;
    case 'medium':
      depth = 3;
      useAdvancedEval = false;
      useOpeningBook = true;
      break;
    case 'hard':
      depth = 5;
      useAdvancedEval = true;
      useOpeningBook = true;
      break;
    default:
      depth = 3;
      useAdvancedEval = false;
      useOpeningBook = true;
  }
  
  return { depth, useAdvancedEval, useOpeningBook };
}

let AI = { 
  side: playerColor === 'white' ? 'b' : 'w', 
  ...getAIConfig()
};

// Update AI side when page loads
function updateAISide() {
  playerColor = localStorage.getItem('playerColor') || 'white';
  AI.side = playerColor === 'white' ? 'b' : 'w';
  // Update AI config based on difficulty
  Object.assign(AI, getAIConfig());
  console.log('updateAISide - playerColor:', playerColor, 'AI.side:', AI.side, 'AI config:', AI);
}

// Limit how deep the opening book is used (plies = half-moves). 16 = ~8 moves each side.
const BOOK_PLY_LIMIT = 16;

// ============================================================================
//                           OPENING BOOK (auto-built)
// ============================================================================
// We'll define a bunch of well-known opening mainlines in SAN and automatically build
// a transposition-table-like book keyed by UCI history (e2e4 e7e5 ...).
// You can add lines to BOOK_LINES to grow the book fast.

const BOOK_LINES = [
  // --- e4 open games ---
  "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7",
  "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5",
  "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nc3 Bb4 Nxc6 bxc6 Bd3 d5 O-O O-O Qf3 Re8",
  "e4 e5 Nf3 Nc6 d3 Nf6 c3 d5 Nbd2 a5 Be2 Be7 O-O O-O",
  "e4 e5 Bc4 Nf6 d3 c6 Nf3 d5 Bb3 Bb4+ c3 Bd6",
  // Scotch
  "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7",
  // Four Knights
  "e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6 Bg5",
  // King's Gambit
  "e4 e5 f4 exxf4 Nf3 g5 h4 g4 Ne5 Nf6 d4 d6 Nd3 Nxe4",

  // --- Sicilian ---
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7",
  "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 c4 Bg7 Be3 Nf6 Nc3 O-O",
  "e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 c4 Nf6 Nc3 Qc7 Be2 Be7",
  "e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4 Be2 e6 O-O Nc6",
  "e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 e6",
  // Dragon
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6",

  // --- French ---
  "e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 h4 a6 Qg4",
  "e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2",
  "e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 a5 Be2",
  "e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Be7 O-O O-O",

  // --- Caro-Kann ---
  "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7",
  "e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 O-O Nc6 c3",
  "e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4",

  // --- Pirc/Modern ---
  "e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O a6 a4",
  "e4 g6 d4 Bg7 Nc3 d6 Nf3 a6 a4 b6 Be2 Bb7 O-O",

  // --- Scandinavian ---
  "e4 d5 exd5 Qxd5 Nc3 Qa5 d4 c6 Nf3 Nf6 Bc4 Bf5 O-O e6",

  // --- Alekhine ---
  "e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4",

  // --- d4: Queen's Gambit / Indian Defenses ---
  "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6",
  "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5",
  "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6",
  "d4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3 dxc4 Qxc4 O-O e4",
  "d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O",
  "d4 Nf6 c4 e6 Nc3 d5 Nf3 Be7 Bf4 O-O e3 Nbd8 Rc1",
  "d4 e6 c4 f5 Nc3 Nf6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O",
  "d4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 Nf3 Bg7",
  "d4 Nf6 c4 c5 d5 b5 cxb5 a6 b6 e6 Nc3 exd5 Nxd5 Bb7",

  // --- Catalan ---
  "d4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6",

  // --- English / Reti ---
  "c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Be7 O-O",
  "c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 e3 e6 Nge2 Nge7 d4",
  "c4 Nf6 g3 g6 Bg2 Bg7 Nc3 O-O d3 d6 e4 c5 Nge2 Nc6",
  "Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O Nbd2 c5 e4 Nc6",

  // --- London / Colle / Tromp ---
  "d4 d5 Nf3 Nf6 Bf4 e6 e3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O",
  "d4 Nf6 Nf3 g6 Bf4 Bg7 e3 O-O h3 d6 Be2 Nbd7 O-O",
  "d4 Nf6 Bg5 e6 e4 h6 Bxf6 Qxf6 Nf3 d6 Nc3 g6 Be2 Bg7",

  // --- Misc sidelines to widen book ---
  "e4 e5 d4 exd4 Qxd4 Nc6 Qe3 Nf6 Nc3 Bb4 Bd2 O-O O-O-O",
  "e4 c5 b4 cxb4 a3 d5 exd5 Qxd5 Nf3 e5 c4 Qe6 Be2",
  "d4 f5 c4 Nf6 Nc3 e6 Nf3 Bb4 g3 O-O Bg2 d6 O-O Qe8",
  "c4 e6 Nc3 d5 d4 Nf6 Nf3 Be7 Bg5 O-O e3 h6 Bh4 b6",
  "Nf3 d5 d4 c6 c4 Nf6 Nc3 e6 e3 Nbd7 Qc2 Bd6 Bd3 O-O",
];

// Pawn
const pawnEvalWhite = [
  [ 0,   0,   0,   0,   0,   0,   0,   0],
  [ 5,  10,  10, -20, -20,  10,  10,   5],
  [ 5,  -5, -10,   0,   0, -10,  -5,   5],
  [ 0,   0,   0,  20,  20,   0,   0,   0],
  [ 5,   5,  10,  25,  25,  10,   5,   5],
  [10,  10,  20,  30,  30,  20,  10,  10],
  [50,  50,  50,  50,  50,  50,  50,  50],
  [ 0,   0,   0,   0,   0,   0,   0,   0]
];
const pawnEvalBlack = pawnEvalWhite.slice().reverse();

// Knight
const knightEval = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20,   0,   0,   0,   0, -20, -40],
  [-30,   0,  10,  15,  15,  10,   0, -30],
  [-30,   5,  15,  20,  20,  15,   5, -30],
  [-30,   0,  15,  20,  20,  15,   0, -30],
  [-30,   5,  10,  15,  15,  10,   5, -30],
  [-40, -20,   0,   5,   5,   0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50]
];

// Bishop
const bishopEval = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10,   5,   0,   0,   0,   0,   5, -10],
  [-10,  10,  10,  10,  10,  10,  10, -10],
  [-10,   0,  10,  10,  10,  10,   0, -10],
  [-10,   5,   5,  10,  10,   5,   5, -10],
  [-10,   0,   5,  10,  10,   5,   0, -10],
  [-10,   0,   0,   0,   0,   0,   0, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20]
];

// Rook
const rookEval = [
  [  0,   0,   0,   5,   5,   0,   0,   0],
  [ -5,   0,   0,   0,   0,   0,   0,  -5],
  [ -5,   0,   0,   0,   0,   0,   0,  -5],
  [ -5,   0,   0,   0,   0,   0,   0,  -5],
  [ -5,   0,   0,   0,   0,   0,   0,  -5],
  [ -5,   0,   0,   0,   0,   0,   0,  -5],
  [  5,  10,  10,  10,  10,  10,  10,   5],
  [  0,   0,   0,   0,   0,   0,   0,   0]
];

// Queen
const queenEval = [
  [-20, -10, -10,  -5,  -5, -10, -10, -20],
  [-10,   0,   0,   0,   0,   0,   0, -10],
  [-10,   0,   5,   5,   5,   5,   0, -10],
  [ -5,   0,   5,   5,   5,   5,   0,  -5],
  [  0,   0,   5,   5,   5,   5,   0,  -5],
  [-10,   5,   5,   5,   5,   5,   0, -10],
  [-10,   0,   5,   0,   0,   0,   0, -10],
  [-20, -10, -10,  -5,  -5, -10, -10, -20]
];

// King (early/midgame)
const kingEvalWhite = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [ 20,  20,   0,   0,   0,   0,  20,  20],
  [ 20,  30,  10,   0,   0,  10,  30,  20]
];
const kingEvalBlack = kingEvalWhite.slice().reverse();

// Piece-Square Tables (PST)
// values are from White's perspective
// (for Black, we'll just flip the board)

// Pawn
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

// Knight
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

// Bishop
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

// Rook
const pst_rook = [
  [ 0,  0,  0,  0,  0,  0,  0,  0],
  [ 5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [ 0,  0,  0,  5,  5,  0,  0,  0]
];

// Queen
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

// King (opening/midgame)
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

// King (endgame) - much more aggressive and centralized
const pst_king_endgame = [
  [-50,-40,-30,-20,-20,-30,-40,-50],
  [-40,-20,-10,  0,  0,-10,-20,-40],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-20,  0, 30, 40, 40, 30,  0,-20],
  [-20,  0, 30, 40, 40, 30,  0,-20],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-40,-20,-10,  0,  0,-10,-20,-40],
  [-50,-40,-30,-20,-20,-30,-40,-50]
];


// Build a map: key = UCI history string (e2e4 e7e5 ...), value = array of next UCI moves from those lines
function buildOpeningBook(lines) {
  const book = Object.create(null);
  for (const line of lines) {
    const tmp = new Chess();
    const sans = line.trim().split(/\s+/);
    const keyMoves = [];
    for (const san of sans) {
      const mv = tmp.move(san, { sloppy: true });
      if (!mv) break;
      const uci = mv.from + mv.to + (mv.promotion ? mv.promotion : '');
      const key = keyMoves.join(' '); // empty string at start means book for first mover
      if (!book[key]) book[key] = [];
      if (!book[key].includes(uci)) book[key].push(uci);
      keyMoves.push(uci);
    }
  }
  return book;
}

const openingBook = buildOpeningBook(BOOK_LINES);

function uciHistoryKey(ch = chess) {
  const hist = ch.history({ verbose: true });
  return hist.map(m => m.from + m.to + (m.promotion || '')).join(' ');
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function getOpeningMove() {
  // Don't use opening book on easy difficulty
  if (!AI.useOpeningBook) return null;
  if (BOOK_PLY_LIMIT && chess.history().length >= BOOK_PLY_LIMIT) return null;
  const key = uciHistoryKey();
  const options = openingBook[key];
  return options && options.length ? pickRandom(options) : null;
}

function applyUci(uci) {
  const from = uci.slice(0,2);
  const to = uci.slice(2,4);
  const promotion = uci.length === 5 ? uci[4] : undefined;
  return chess.move({ from, to, promotion });
}

// ============================================================================
//                               SEARCH (minimax)
// ============================================================================
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

// Transposition table for position caching
const transpositionTable = new Map();
const MAX_TABLE_SIZE = 100000; // Limit memory usage

// Killer moves heuristic - moves that caused beta cutoffs
const killerMoves = new Map(); // depth -> [move1, move2]

// History heuristic - tracks how good moves have been
const historyTable = new Map(); // moveString -> score

// Time management
let searchStartTime = 0;
const MAX_SEARCH_TIME = 4000; // 4 seconds max per move for advanced search

function evaluateBoard(game) {
  let total = 0;
  const board = game.board();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = board[row][col];
      if (square !== null) {
        let value = getPieceValue(square.type);
        let pstBonus = getPST(square, row, col);
        
        // CRITICAL: Check if piece is hanging (attacked and undefended)
        const squareName = String.fromCharCode(97 + col) + (8 - row);
        const isAttacked = isSquareAttacked(game, squareName, square.color === 'w' ? 'b' : 'w');
        const isDefended = isSquareAttacked(game, squareName, square.color);
        
        if (isAttacked && !isDefended) {
          // Piece is hanging - massive penalty
          pstBonus -= value * 1.2; // 120% of piece value penalty - even bigger!
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
              // King activity in endgame - much more aggressive
              pstBonus += kingMoves.length * 5; // Higher bonus for king activity
              
              // King centralization bonus in endgame
              const centerDistance = Math.abs(row - 3.5) + Math.abs(col - 3.5);
              pstBonus += (7 - centerDistance) * 3; // Closer to center = better
              
              // King opposition (distance to enemy king)
              const enemyKing = findEnemyKing(game, square.color);
              if (enemyKing) {
                const distance = Math.abs(row - enemyKing.row) + Math.abs(col - enemyKing.col);
                pstBonus += (8 - distance) * 2; // Closer to enemy king = better
                
                // Opposition bonus (controlling squares in front of enemy king)
                if (isInOpposition(square, enemyKing, game)) {
                  pstBonus += 20; // Opposition bonus
                }
              }
            } else {
              // King safety in opening/midgame
              pstBonus -= kingMoves.length * 2; // Penalty for exposed king
            }
          }
          
          // Pawn structure evaluation
          if (square.type === 'p') {
            const file = String.fromCharCode(97 + col);
            const rank = 8 - row;
            
            // Connected pawns bonus
            let hasConnectedPawn = false;
            for (let offset = -1; offset <= 1; offset += 2) {
              const adjFile = String.fromCharCode(97 + col + offset);
              if (adjFile >= 'a' && adjFile <= 'h') {
                const adjSquare = adjFile + rank;
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
              pstBonus -= 20; // Isolated pawn penalty
            }
            
            // Doubled pawn penalty
            if (isDoubledPawn(square, row, col, game)) {
              pstBonus -= 15; // Doubled pawn penalty
            }
            
            // Backward pawn penalty
            if (isBackwardPawn(square, row, col, game)) {
              pstBonus -= 10; // Backward pawn penalty
            }
            
            // Passed pawn bonus
            if (isPassedPawn(square, row, col, game)) {
              pstBonus += 25; // Passed pawn bonus
            }
          }
          
          // Piece mobility
          if (square.type === 'q' || square.type === 'r' || square.type === 'b' || square.type === 'n') {
            const moves = game.moves({ square: squareName, verbose: true });
            pstBonus += moves.length * 1.5; // Mobility bonus
          }
        }
        
        total += square.color === 'w' ? value + pstBonus : -(value + pstBonus);
      }
    }
  }

  return total;
}

// Removed complex advanced evaluation - keeping it simple like Sebastian Lague recommends

function getPieceValue(type) {
  switch (type) {
    case 'p': return 100;
    case 'n': return 320;
    case 'b': return 330;
    case 'r': return 500;
    case 'q': return 900;
    case 'k': return 20000;
  }
}

function getPST(piece, row, col) {
  // flip row for black so they "see" the board from their side
  const r = piece.color === 'w' ? row : 7 - row;
  const c = col;

  switch (piece.type) {
    case 'p': return pst_pawn[r][c];
    case 'n': return pst_knight[r][c];
    case 'b': return pst_bishop[r][c];
    case 'r': return pst_rook[r][c];
    case 'q': return pst_queen[r][c];
    case 'k': 
      // Use endgame king table if in endgame
      return isInEndgame() ? pst_king_endgame[r][c] : pst_king[r][c];
  }
  return 0;
}


function orderMoves(ch, depth) {
  const moves = ch.moves({ verbose: true });
  return moves.sort((a, b) => {
    // 0. SAFETY FIRST: Avoid moves that hang pieces or create pawn weaknesses
    const aHangsPiece = wouldMoveHangPiece(ch, a);
    const bHangsPiece = wouldMoveHangPiece(ch, b);
    const aCreatesWeakness = wouldMoveCreatePawnWeakness(ch, a);
    const bCreatesWeakness = wouldMoveCreatePawnWeakness(ch, b);
    
    if (aHangsPiece && !bHangsPiece) return 1; // b is safer
    if (!aHangsPiece && bHangsPiece) return -1; // a is safer
    if (aCreatesWeakness && !bCreatesWeakness) return 1; // b is better
    if (!aCreatesWeakness && bCreatesWeakness) return -1; // a is better
    
    // 1. Captures using MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
    if (a.captured && b.captured) {
      const aMVV = PIECE_VALUES[a.captured];
      const bMVV = PIECE_VALUES[b.captured];
      if (aMVV !== bMVV) return bMVV - aMVV; // Higher value victim first
      
      const aLVA = PIECE_VALUES[a.piece];
      const bLVA = PIECE_VALUES[b.piece];
      return aLVA - bLVA; // Lower value attacker first
    }
    if (a.captured && !b.captured) return -1;
    if (!a.captured && b.captured) return 1;
    
    // 2. Killer moves (moves that caused beta cutoffs at this depth)
    const aKiller = isKillerMove(a, depth) ? 1 : 0;
    const bKiller = isKillerMove(b, depth) ? 1 : 0;
    if (aKiller !== bKiller) return bKiller - aKiller;
    
    // 3. Promotions
    if (a.promotion && !b.promotion) return -1;
    if (!a.promotion && b.promotion) return 1;
    
    // 4. History heuristic (moves that have been good in the past)
    const aHistory = getHistoryScore(a);
    const bHistory = getHistoryScore(b);
    if (aHistory !== bHistory) return bHistory - aHistory;
    
    // 5. Piece value (move higher value pieces first)
    return PIECE_VALUES[b.piece] - PIECE_VALUES[a.piece];
  });
}

function isKillerMove(move, depth) {
  const killers = killerMoves.get(depth);
  if (!killers) return false;
  const moveStr = move.from + move.to + (move.promotion || '');
  return killers.includes(moveStr);
}

function addKillerMove(move, depth) {
  if (!killerMoves.has(depth)) {
    killerMoves.set(depth, []);
  }
  const killers = killerMoves.get(depth);
  const moveStr = move.from + move.to + (move.promotion || '');
  
  // Don't add if already present
  if (killers.includes(moveStr)) return;
  
  // Keep only 2 killer moves per depth
  if (killers.length >= 2) {
    killers.shift(); // Remove oldest
  }
  killers.push(moveStr);
}

function getHistoryScore(move) {
  const moveStr = move.from + move.to + (move.promotion || '');
  return historyTable.get(moveStr) || 0;
}

function updateHistoryScore(move, depth) {
  const moveStr = move.from + move.to + (move.promotion || '');
  const currentScore = historyTable.get(moveStr) || 0;
  const bonus = depth * depth; // Deeper cutoffs get higher bonuses
  historyTable.set(moveStr, currentScore + bonus);
}

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
  
  // Endgame if few pieces or no queens
  return pieceCount <= 12 || queenCount === 0;
}

function isPassedPawn(pawn, row, col, game) {
  const enemyColor = pawn.color === 'w' ? 'b' : 'w';
  const direction = pawn.color === 'w' ? 1 : -1;
  
  // Check if pawn can advance without being blocked
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
  const enemyColor = pawn.color === 'w' ? 'b' : 'w';
  
  // Check if there are any friendly pawns on adjacent files
  for (let offset = -1; offset <= 1; offset += 2) {
    const adjFile = String.fromCharCode(97 + col + offset);
    if (adjFile >= 'a' && adjFile <= 'h') {
      // Check all ranks for friendly pawns on this file
      for (let r = 0; r < 8; r++) {
        const square = game.get(adjFile + (8 - r));
        if (square && square.type === 'p' && square.color === pawn.color) {
          return false; // Found a friendly pawn on adjacent file
        }
      }
    }
  }
  
  return true; // No friendly pawns on adjacent files
}

function isDoubledPawn(pawn, row, col, game) {
  const file = String.fromCharCode(97 + col);
  
  // Check if there are other friendly pawns on the same file
  for (let r = 0; r < 8; r++) {
    if (r === row) continue; // Skip current pawn
    const square = game.get(file + (8 - r));
    if (square && square.type === 'p' && square.color === pawn.color) {
      return true; // Found another pawn on same file
    }
  }
  
  return false;
}

function isBackwardPawn(pawn, row, col, game) {
  const file = String.fromCharCode(97 + col);
  const enemyColor = pawn.color === 'w' ? 'b' : 'w';
  const direction = pawn.color === 'w' ? 1 : -1;
  
  // Check if pawn can advance without being blocked by enemy pawns
  for (let r = row + direction; r >= 0 && r < 8; r += direction) {
    // Check same file
    const sameFile = game.get(file + (8 - r));
    if (sameFile && sameFile.type === 'p' && sameFile.color === enemyColor) {
      return true; // Blocked by enemy pawn
    }
    
    // Check adjacent files for enemy pawns that can attack
    for (let c = Math.max(0, col - 1); c <= Math.min(7, col + 1); c++) {
      if (c === col) continue;
      const adjSquare = game.get(String.fromCharCode(97 + c) + (8 - r));
      if (adjSquare && adjSquare.type === 'p' && adjSquare.color === enemyColor) {
        return true; // Can be attacked by enemy pawn
      }
    }
  }
  
  return false;
}

function isSquareAttacked(game, square, byColor) {
  // Check if any piece of the given color attacks the square
  const board = game.board();
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === byColor) {
        const pieceSquare = String.fromCharCode(97 + col) + (8 - row);
        const moves = game.moves({ square: pieceSquare, verbose: true });
        
        // Check if any move from this piece captures the target square
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

function wouldMoveHangPiece(game, move) {
  // Check if making this move would hang a piece
  const originalPiece = game.get(move.from);
  if (!originalPiece) return false;
  
  // Make the move temporarily
  const tempMove = game.move(move);
  if (!tempMove) return false;
  
  // Check if ANY piece of the same color would be hanging after this move
  const board = game.board();
  const pieceColor = originalPiece.color;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = board[row][col];
      if (square && square.color === pieceColor) {
        const squareName = String.fromCharCode(97 + col) + (8 - row);
        const isAttacked = isSquareAttacked(game, squareName, pieceColor === 'w' ? 'b' : 'w');
        const isDefended = isSquareAttacked(game, squareName, pieceColor);
        
        if (isAttacked && !isDefended) {
          // Undo the move and return true
          game.undo();
          return true;
        }
      }
    }
  }
  
  // Undo the move
  game.undo();
  
  // No pieces would be hanging
  return false;
}

function wouldMoveCreatePawnWeakness(game, move) {
  // Check if a pawn move would create structural weaknesses
  if (move.piece !== 'p') return false;
  
  const originalPiece = game.get(move.from);
  if (!originalPiece) return false;
  
  // Make the move temporarily
  const tempMove = game.move(move);
  if (!tempMove) return false;
  
  // Check if this move creates pawn weaknesses
  const board = game.board();
  const pieceColor = originalPiece.color;
  let createsWeakness = false;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = board[row][col];
      if (square && square.type === 'p' && square.color === pieceColor) {
        // Check if this pawn is now isolated, doubled, or backward
        if (isIsolatedPawn(square, row, col, game) || 
            isDoubledPawn(square, row, col, game) || 
            isBackwardPawn(square, row, col, game)) {
          createsWeakness = true;
          break;
        }
      }
    }
    if (createsWeakness) break;
  }
  
  // Undo the move
  game.undo();
  
  return createsWeakness;
}

function findEnemyKing(game, friendlyColor) {
  const board = game.board();
  const enemyColor = friendlyColor === 'w' ? 'b' : 'w';
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = board[row][col];
      if (square && square.type === 'k' && square.color === enemyColor) {
        return { row, col, color: enemyColor };
      }
    }
  }
  return null;
}

function isInOpposition(king, enemyKing, game) {
  // Opposition: kings are on the same rank, file, or diagonal with no pieces between
  const sameRank = king.row === enemyKing.row;
  const sameFile = king.col === enemyKing.col;
  const sameDiagonal = Math.abs(king.row - enemyKing.row) === Math.abs(king.col - enemyKing.col);
  
  if (!sameRank && !sameFile && !sameDiagonal) return false;
  
  // Check if there are pieces between the kings
  const rowStep = sameRank ? 0 : (enemyKing.row > king.row ? 1 : -1);
  const colStep = sameFile ? 0 : (enemyKing.col > king.col ? 1 : -1);
  
  let currentRow = king.row + rowStep;
  let currentCol = king.col + colStep;
  
  while (currentRow !== enemyKing.row || currentCol !== enemyKing.col) {
    const square = game.get(String.fromCharCode(97 + currentCol) + (8 - currentRow));
    if (square) return false; // Piece between kings
    
    currentRow += rowStep;
    currentCol += colStep;
  }
  
  return true;
}

function search(depth, alpha, beta, isMaximizing) {
  // Time check
  if (Date.now() - searchStartTime > MAX_SEARCH_TIME) {
    return { score: evaluateBoard(chess) };
  }
  
  // Transposition table lookup
  const positionKey = chess.fen();
  if (transpositionTable.has(positionKey)) {
    const entry = transpositionTable.get(positionKey);
    if (entry.depth >= depth) {
      if (entry.type === 'exact') return { score: entry.score };
      if (entry.type === 'lower' && entry.score >= beta) return { score: beta };
      if (entry.type === 'upper' && entry.score <= alpha) return { score: alpha };
    }
  }
  
  if (depth === 0) return { score: quiescenceSearch(alpha, beta, 0) };
  if (chess.in_checkmate()) return { score: isMaximizing ? -999999 : 999999 };
  if (chess.in_stalemate() || chess.in_draw()) return { score: 0 };
  
  // Null move pruning - if we can't improve by passing, we're probably winning
  if (depth >= 3 && !chess.in_check() && !isInEndgame()) {
    // Make a null move (pass turn) - this might not work with chess.js
    // Let's disable null move pruning for now to fix the bot
    // const nullMove = chess.move(null);
    // if (nullMove) {
    //   const nullScore = -search(depth - 1 - 2, -beta, -beta + 1, !isMaximizing).score;
    //   chess.undo();
    //   
    //   if (nullScore >= beta) {
    //     return { score: beta }; // Beta cutoff
    //   }
    // }
  }

  let bestMove = null;
  let originalAlpha = alpha;
  const moves = orderMoves(chess, depth);
  
  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      chess.move(m);
      
      let score;
      // Late Move Reduction - reduce depth for later moves
      if (i > 3 && depth > 2 && !m.captured && !m.promotion && !chess.in_check()) {
        score = search(depth - 2, alpha, alpha + 1, false).score;
        if (score > alpha) {
          score = search(depth - 1, alpha, beta, false).score;
        }
      } else {
        score = search(depth - 1, alpha, beta, false).score;
      }
      
      chess.undo();
      if (score > best) { best = score; bestMove = m; }
      if (score > alpha) alpha = score;
      if (alpha >= beta) {
        // Beta cutoff - this is a killer move
        if (!m.captured) {
          addKillerMove(m, depth);
          updateHistoryScore(m, depth);
        }
        break;
      }
    }
    
    // Store in transposition table
    storeTransposition(positionKey, best, depth, originalAlpha, beta);
    return { score: best, move: bestMove };
  } else {
    let best = Infinity;
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      chess.move(m);
      
      let score;
      // Late Move Reduction - reduce depth for later moves
      if (i > 3 && depth > 2 && !m.captured && !m.promotion && !chess.in_check()) {
        score = search(depth - 2, beta - 1, beta, true).score;
        if (score < beta) {
          score = search(depth - 1, alpha, beta, true).score;
        }
      } else {
        score = search(depth - 1, alpha, beta, true).score;
      }
      
      chess.undo();
      if (score < best) { best = score; bestMove = m; }
      if (score < beta) beta = score;
      if (alpha >= beta) {
        // Alpha cutoff - this is a killer move
        if (!m.captured) {
          addKillerMove(m, depth);
          updateHistoryScore(m, depth);
        }
        break;
      }
    }
    
    // Store in transposition table
    storeTransposition(positionKey, best, depth, originalAlpha, beta);
    return { score: best, move: bestMove };
  }
}

function storeTransposition(key, score, depth, alpha, beta) {
  // Limit table size
  if (transpositionTable.size >= MAX_TABLE_SIZE) {
    // Clear half the table (simple strategy)
    const entries = Array.from(transpositionTable.entries());
    transpositionTable.clear();
    for (let i = 0; i < entries.length / 2; i++) {
      transpositionTable.set(entries[i][0], entries[i][1]);
    }
  }
  
  let type = 'exact';
  if (score <= alpha) type = 'upper';
  else if (score >= beta) type = 'lower';
  
  transpositionTable.set(key, { score, depth, type });
}

// Quiescence search for better tactical play (properly implemented)
function quiescenceSearch(alpha, beta, depth) {
  // Prevent infinite recursion
  if (depth > 4) return evaluateBoard(chess);
  
  // Time check
  if (Date.now() - searchStartTime > MAX_SEARCH_TIME) {
    return evaluateBoard(chess);
  }
  
  const standPat = evaluateBoard(chess);
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;
  
  // Only look at captures that are not losing trades
  const moves = chess.moves({ verbose: true }).filter(move => 
    move.captured && PIECE_VALUES[move.captured] >= PIECE_VALUES[move.piece] - 25
  );
  
  // Order captures by value
  moves.sort((a, b) => {
    const aVal = a.captured ? PIECE_VALUES[a.captured] - PIECE_VALUES[a.piece] : 0;
    const bVal = b.captured ? PIECE_VALUES[b.captured] - PIECE_VALUES[b.piece] : 0;
    return bVal - aVal;
  });
  
  for (const move of moves) {
    chess.move(move);
    const score = -quiescenceSearch(-beta, -alpha, depth + 1);
    chess.undo();
    
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  
  return alpha;
}

function findBestMove() {
  searchStartTime = Date.now();
  
  // Clear transposition table, killer moves, and history for new search
  transpositionTable.clear();
  killerMoves.clear();
  historyTable.clear();
  
  // Aspiration windows for better search
  let bestMove = null;
  let actualDepth = 0;
  let alpha = -Infinity;
  let beta = Infinity;
  
  // Start with depth 1 and work up to AI.depth
  for (let depth = 1; depth <= AI.depth; depth++) {
    const isMaximizing = chess.turn() === 'w';
    
    // Aspiration window - narrow search around previous best score
    if (depth > 1) {
      const window = 50; // Aspiration window size
      alpha = Math.max(-Infinity, bestMove ? evaluateBoard(chess) - window : -Infinity);
      beta = Math.min(Infinity, bestMove ? evaluateBoard(chess) + window : Infinity);
    }
    
    let result;
    try {
      result = search(depth, alpha, beta, isMaximizing);
    } catch (e) {
      // Aspiration window failed, search with full window
      alpha = -Infinity;
      beta = Infinity;
      result = search(depth, alpha, beta, isMaximizing);
    }
    
    // If we have time, use this result
    if (Date.now() - searchStartTime < MAX_SEARCH_TIME * 0.8) {
      bestMove = result.move;
      actualDepth = depth;
    } else {
      // Time's up, use previous result
      break;
    }
  }
  
  console.log(`AI search completed in ${Date.now() - searchStartTime}ms, depth: ${actualDepth}/${AI.depth}`);
  return bestMove || null;
}

function makeAIMove() {
  console.log('makeAIMove called, turn:', chess.turn(), 'AI.side:', AI.side, 'playerColor:', playerColor);
  if (chess.game_over()) {
    console.log('Game is over, not making AI move');
    return;
  }
  if (chess.turn() !== AI.side) {
    console.log('Not AI turn, current turn:', chess.turn(), 'AI side:', AI.side);
    return;
  }

  let move;
  const bookUci = getOpeningMove();
  console.log('Opening book move:', bookUci);
  
  if (bookUci) {
    console.log('Using opening book move:', bookUci);
    move = applyUci(bookUci);
  } else {
    console.log('No opening book move, searching for best move...');
    const best = findBestMove();
    console.log('Best move found:', best);
    if (!best) {
      console.log('No best move found, this is a problem!');
      return;
    }
    move = chess.move(best);
  }

  if (move) {
    console.log('AI move successful:', move);
    lastMove = move;
    playMoveSound(move);
    undoneMoves = [];
    moveCount++;
    renderBoard();
    updateGameStatus();
    console.log('AI move completed, new turn:', chess.turn(), 'should be player turn:', playerColor);
  } else {
    console.log('AI move failed!');
  }
}

// ============================================================================
//                                   UI
// ============================================================================
const resignButton = document.getElementById("resign-button");
const flipButton = document.getElementById("flip-button");
const scorebookButton = document.getElementById("scorebook-button");
const messageDiv = document.getElementById("game-message");
const gameOverPopup = document.getElementById("game-over-popup");
const gameOverTitle = document.getElementById("game-over-title");
const gameOverMessage = document.getElementById("game-over-message");
const playAgainBtn = document.getElementById("play-again-btn");
const homeBtn = document.getElementById("home-btn");
const scorebookPopup = document.getElementById("scorebook-popup");
const pgnText = document.getElementById("pgn-text");
const copyPgnBtn = document.getElementById("copy-pgn-btn");
const closeScorebookBtn = document.getElementById("close-scorebook-btn");

function renderBoard() {
  const positions = chess.board();
  
  // Clear all visual indicators first
  board.querySelectorAll('.square').forEach(square => {
    square.classList.remove('selected', 'highlight', 'recent-move');
    // Remove ALL move dots (in case there are multiple)
    const existingDots = square.querySelectorAll('.move-dot');
    existingDots.forEach(dot => dot.remove());
  });
  
  // Update pieces efficiently
  board.querySelectorAll('.square').forEach(square => {
    const squareName = square.getAttribute('data-square');
    const file = squareName.charCodeAt(0) - 97;
    const rank = 8 - parseInt(squareName[1]);
    const piece = positions[rank][file];

    const existingImg = square.querySelector('img');
    
    if (piece) {
      const key = piece.color + piece.type.toUpperCase();
      const expectedSrc = pieceImages[key];
      
      // Only update if the piece image is different
      if (!existingImg || existingImg.src !== expectedSrc) {
        if (existingImg) {
          // Replace existing image
          existingImg.src = expectedSrc;
          existingImg.alt = key;
        } else {
          // Create new image
          const img = document.createElement('img');
          img.src = expectedSrc;
          img.alt = key;
          img.draggable = true;
          img.dataset.square = squareName;
          square.appendChild(img);
        }
      }
    } else if (existingImg) {
      // Remove piece if square is empty
      existingImg.remove();
    }
  });

  // Add move dots for legal moves
  if (selectedSquare) {
    const legalMoves = chess.moves({ square: selectedSquare, verbose: true });
    legalMoves.forEach(move => {
      const target = document.querySelector(`[data-square="${move.to}"]`);
      if (target && !target.querySelector('.move-dot')) {
        const dot = document.createElement('div');
        dot.classList.add('move-dot');
        // Ensure correct styling
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
  const playerColorChess = playerColor === 'white' ? 'w' : 'b';
  
  if (chess.in_checkmate()) {
    gameEnded = true;
    const winner = chess.turn() === playerColorChess ? 'Bot' : 'You';
    showGameOverPopup('Checkmate!', `${winner} wins by checkmate!`);
  } else if (chess.in_draw() || chess.insufficient_material() || chess.in_stalemate()) {
    gameEnded = true;
    showGameOverPopup('Draw!', 'The game ended in a draw');
  } else if (chess.in_check()) {
    const player = chess.turn() === playerColorChess ? 'You' : 'Bot';
    messageDiv.textContent = `${player} is in check!`;
  } else {
    const player = chess.turn() === playerColorChess ? 'Your' : 'Bot\'s';
    messageDiv.textContent = `${player} turn`;
  }
}

function showGameOverPopup(title, message) {
  gameOverTitle.textContent = title;
  gameOverMessage.textContent = message;
  gameOverPopup.style.display = 'flex';
}

function hideGameOverPopup() {
  gameOverPopup.style.display = 'none';
}

function generatePGN() {
  const pgn = chess.pgn();
  const gameResult = chess.in_checkmate() ? 
    (chess.turn() === 'w' ? '0-1' : '1-0') :
    chess.in_draw() ? '1/2-1/2' : '*';
  
  const whitePlayer = playerColor === 'white' ? 'Human' : 'Bot';
  const blackPlayer = playerColor === 'black' ? 'Human' : 'Bot';
  
  const pgnHeader = `[Event "Human vs Bot"]
[Site "Chess Game"]
[Date "${new Date().toISOString().split('T')[0]}"]
[Round "1"]
[White "${whitePlayer}"]
[Black "${blackPlayer}"]
[Result "${gameResult}"]
[TimeControl "-"]

${pgn} ${gameResult}`;
  
  return pgnHeader;
}

function showScorebook() {
  const pgn = generatePGN();
  pgnText.value = pgn;
  // Close game over popup if it's open
  if (gameOverPopup.style.display === 'flex') {
    gameOverPopup.style.display = 'none';
  }
  scorebookPopup.style.display = 'flex';
}

function hideScorebook() {
  console.log('hideScorebook called, game_over:', chess.game_over(), 'gameEnded:', gameEnded);
  scorebookPopup.style.display = 'none';
  // If game is over, show the game over popup again
  if (chess.game_over() || gameEnded) {
    console.log('Game is over, showing game over popup');
    gameOverPopup.style.display = 'flex';
  }
}

function copyPGN() {
  pgnText.select();
  pgnText.setSelectionRange(0, 99999); // For mobile devices
  document.execCommand('copy');
  
  // Visual feedback
  const originalText = copyPgnBtn.textContent;
  copyPgnBtn.textContent = 'Copied!';
  copyPgnBtn.style.backgroundColor = '#4CAF50';
  
  setTimeout(() => {
    copyPgnBtn.textContent = originalText;
    copyPgnBtn.style.backgroundColor = '';
  }, 2000);
}

function playMoveSound(move) {
  if (!move) return;
  
  // Check if sound is enabled
  const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  if (!soundEnabled) return;
  
  if (move.flags.includes("c")) sounds.capture.play();
  else if (move.flags.includes("k") || move.flags.includes("q")) sounds.castle.play();
  else if (move.flags.includes("p")) sounds.promotion.play();
  else sounds.move.play();

  if (chess.in_checkmate()) sounds.checkmate.play();
  else if (chess.in_check()) sounds.check.play();
}

function flipBoard() {
  boardFlipped = !boardFlipped;
  const rows = board.querySelectorAll('.row');
  const rowsArray = Array.from(rows);
  
  // Store current pieces before flipping
  const currentPositions = chess.board();
  
  // Clear the board first to prevent visual glitches
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

function resign() {
  gameEnded = true;
  showGameOverPopup('Game Resigned', 'You resigned. Bot wins!');
}

// --- Click input ---
board.addEventListener('click', e => {
  if (gameOverPopup.style.display === 'flex') return; // Don't allow moves when popup is open
  const playerColorChess = playerColor === 'white' ? 'w' : 'b';
  console.log('Click detected, turn:', chess.turn(), 'playerColor:', playerColor, 'can move:', chess.turn() === playerColorChess);
  if (chess.turn() !== playerColorChess) return; // Only allow human moves on player's turn
  
  const targetSquare = e.target.closest('.square');
  if (!targetSquare) return;
  const clicked = targetSquare.getAttribute('data-square');
  const piece = chess.get(clicked);

  if (selectedSquare) {
    const move = chess.move({ from: selectedSquare, to: clicked, promotion: 'q' });
    if (move) {
      lastMove = move;
      playMoveSound(move);
      undoneMoves = [];
      selectedSquare = null;
      moveCount++;
      renderBoard();
      updateGameStatus();
      console.log('Human move completed, new turn:', chess.turn(), 'calling AI in 120ms');
      setTimeout(() => {
        console.log('About to call makeAIMove after human move');
        makeAIMove();
      }, 120);
      return;
    }
    if (piece && piece.color === chess.turn()) selectedSquare = clicked; else selectedSquare = null;
  } else if (piece && piece.color === chess.turn()) {
    selectedSquare = clicked;
  }
  renderBoard();
});

// --- Drag & drop ---
let dragPiece = null;
let dragGhost = null;

board.addEventListener('dragstart', e => {
  if (gameOverPopup.style.display === 'flex') return;
  const playerColorChess = playerColor === 'white' ? 'w' : 'b';
  if (chess.turn() !== playerColorChess) return;
  
  const img = e.target;
  if (!img.dataset.square) return;
  selectedSquare = img.dataset.square;
  const piece = chess.get(selectedSquare);
  if (!piece) return;
  dragPiece = img;
  img.style.opacity = '0';
  dragGhost = img.cloneNode();
  dragGhost.style.position = 'absolute';
  dragGhost.style.pointerEvents = 'none';
  dragGhost.style.width = img.offsetWidth + 'px';
  dragGhost.style.height = img.offsetHeight + 'px';
  dragGhost.style.zIndex = 1000;
  document.body.appendChild(dragGhost);
  e.dataTransfer.setDragImage(new Image(), 0, 0);
});

board.addEventListener('drag', e => {
  if (!dragGhost) return;
  dragGhost.style.left = e.pageX - dragGhost.offsetWidth / 2 + 'px';
  dragGhost.style.top = e.pageY - dragGhost.offsetHeight / 2 + 'px';
});

board.addEventListener('dragend', () => {
  if (dragGhost) { dragGhost.remove(); dragGhost = null; }
  if (dragPiece) { dragPiece.style.opacity = '1'; dragPiece = null; }
  selectedSquare = null;
  renderBoard();
});

board.addEventListener('dragover', e => {
  e.preventDefault();
  if (selectedSquare) {
    renderBoard(); // This will handle move dots and selection
  }
});

board.addEventListener('drop', e => {
  e.preventDefault();
  if (gameOverPopup.style.display === 'flex') return;
  const playerColorChess = playerColor === 'white' ? 'w' : 'b';
  if (chess.turn() !== playerColorChess) return;
  
  const targetSquareEl = e.target.closest('.square');
  if (!targetSquareEl || !selectedSquare) return;
  const toSquare = targetSquareEl.getAttribute('data-square');
  const move = chess.move({ from: selectedSquare, to: toSquare, promotion: 'q' });
  if (move) {
    lastMove = move;
    playMoveSound(move);
    undoneMoves = [];
    selectedSquare = null;
    moveCount++;
    renderBoard();
    updateGameStatus();
    setTimeout(makeAIMove, 120);
  }
});

// --- Control buttons ---
resignButton?.addEventListener("click", () => {
  if (gameOverPopup.style.display === 'flex') return;
  resign();
});

flipButton?.addEventListener("click", () => {
  flipBoard();
});

// --- Popup buttons ---
playAgainBtn?.addEventListener("click", () => {
    window.location.href = 'choose-color.html';
});

homeBtn?.addEventListener("click", () => {
  window.location.href = 'index.html';
});

// --- Game Over Popup Copy PGN button ---
const copyPgnGameoverBtn = document.getElementById("copy-pgn-gameover-btn");
copyPgnGameoverBtn?.addEventListener("click", () => {
  showScorebook();
});

// --- Scorebook buttons ---
scorebookButton?.addEventListener("click", () => {
  showScorebook();
});

closeScorebookBtn?.addEventListener("click", () => {
  hideScorebook();
});

copyPgnBtn?.addEventListener("click", () => {
  copyPGN();
});

// Update AI side based on player choice
updateAISide();
console.log('Initial setup - playerColor:', playerColor, 'AI.side:', AI.side, 'chess.turn():', chess.turn());

// Apply settings
const boardColor = localStorage.getItem('boardColor') || '#4800ff';
document.documentElement.style.setProperty('--black-square-color', boardColor);

// Initial render
renderBoard();
updateGameStatus();

// If player chose black, make AI move first
if (playerColor === 'black' && chess.turn() === 'w') {
  console.log('Player chose black, making AI move first');
  setTimeout(makeAIMove, 500);
} else if (playerColor === 'white' && chess.turn() === 'b') {
  console.log('Player chose white, AI should move first but turn is black - this might be an issue');
}
