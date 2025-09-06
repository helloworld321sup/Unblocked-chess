const chess = new Chess();
const board = document.querySelector('.chess-board');
let selectedSquare = null;
let lastMove = null;
let moveCount = 1;
let undoneMoves = [];
let boardFlipped = false;

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
let AI = { side: playerColor === 'white' ? 'b' : 'w', depth: 3 };

// Update AI side when page loads
function updateAISide() {
  playerColor = localStorage.getItem('playerColor') || 'white';
  AI.side = playerColor === 'white' ? 'b' : 'w';
  console.log('updateAISide - playerColor:', playerColor, 'AI.side:', AI.side);
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

function evaluateBoard(game) {
  let total = 0;
  const board = game.board();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = board[row][col];
      if (square !== null) {
        let value = getPieceValue(square.type);
        let pstBonus = getPST(square, row, col);
        total += square.color === 'w' ? value + pstBonus : -(value + pstBonus);
      }
    }
  }

  return total;
}

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
    case 'k': return pst_king[r][c];
  }
  return 0;
}


function orderMoves(ch) {
  const moves = ch.moves({ verbose: true });
  return moves.sort((a, b) => {
    const aCap = a.captured ? (PIECE_VALUES[a.captured] - PIECE_VALUES[a.piece]) : -1;
    const bCap = b.captured ? (PIECE_VALUES[b.captured] - PIECE_VALUES[b.piece]) : -1;
    return bCap - aCap;
  });
}

function search(depth, alpha, beta) {
  if (depth === 0) return { score: evaluateBoard(chess) };
  if (chess.in_checkmate()) return { score: chess.turn() === 'w' ? -999999 : 999999 };
  if (chess.in_stalemate() || chess.in_draw()) return { score: 0 };

  let bestMove = null;
  if (chess.turn() === 'w') {
    let best = -Infinity;
    for (const m of orderMoves(chess)) {
      chess.move(m);
      const { score } = search(depth - 1, alpha, beta);
      chess.undo();
      if (score > best) { best = score; bestMove = m; }
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    return { score: best, move: bestMove };
  } else {
    let best = Infinity;
    for (const m of orderMoves(chess)) {
      chess.move(m);
      const { score } = search(depth - 1, alpha, beta);
      chess.undo();
      if (score < best) { best = score; bestMove = m; }
      if (score < beta) beta = score;
      if (alpha >= beta) break;
    }
    return { score: best, move: bestMove };
  }
}

function findBestMove() {
  const result = search(AI.depth, -Infinity, Infinity);
  return result.move || null;
}

function makeAIMove() {
  console.log('makeAIMove called, turn:', chess.turn(), 'AI.side:', AI.side, 'playerColor:', playerColor);
  if (chess.game_over()) return;
  if (chess.turn() !== AI.side) return;

  let move;
  const bookUci = getOpeningMove();
  if (bookUci) {
    move = applyUci(bookUci);
  } else {
    const best = findBestMove();
    if (!best) return;
    move = chess.move(best);
  }

  if (move) {
    lastMove = move;
    playMoveSound(move);
    undoneMoves = [];
    moveCount++;
    renderBoard();
    updateGameStatus();
    console.log('AI move completed, new turn:', chess.turn(), 'should be player turn:', playerColor);
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
    const winner = chess.turn() === playerColorChess ? 'Bot' : 'You';
    showGameOverPopup('Checkmate!', `${winner} wins by checkmate!`);
  } else if (chess.in_draw() || chess.insufficient_material() || chess.in_stalemate()) {
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
  scorebookPopup.style.display = 'none';
  // If game is over, show the game over popup again
  if (chess.game_over()) {
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
