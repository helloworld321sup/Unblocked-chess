const chess = new Chess();
const board = document.querySelector('.chess-board');
let selectedSquare = null;

let stockfish = null;
if (typeof Stockfish === "function") {
  stockfish = Stockfish();
  stockfish.postMessage("uci");

  stockfish.onmessage = function (event) {
    const line = event.data;
    if (line.startsWith("bestmove")) {
      const parts = line.split(" ");
      const best = parts[1]; // e.g. "e2e4"
      if (best && best !== "(none)") {
        const move = {
          from: best.substring(0, 2),
          to: best.substring(2, 4),
          promotion: best.length > 4 ? best.substring(4, 5) : "q"
        };
        if (chess.move(move)) {
          moveCount++;
          renderBoard();
        }
      }
    }
  };
}


// Piece images
const pieceImages = {
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

// Sidebar elements
const moveCounterEl = document.getElementById("move-counter");
const turnIndicatorEl = document.getElementById("turn-indicator");
const buzzerEl = document.getElementById("checkmate-buzzer");
const buzzerSound = new Audio("checkmate-buzzer.mp3");
const resetButton = document.getElementById("reset-button");
const toggleBotBtn = document.getElementById("toggle-mode");
const difficultySelect = document.getElementById("bot-difficulty");

let moveCount = 1;
let playBot = true; // true = bot enabled
let botDifficulty = "medium"; // default difficulty

// Initialize button text to show CURRENT MODE
toggleBotBtn.textContent = playBot ? "Playing vs Bot" : "Playing vs Human";

// --- Render Board ---
function renderBoard() {
  const positions = chess.board();
  board.querySelectorAll('.square').forEach(square => {
    const squareName = square.getAttribute('data-square');
    const file = squareName.charCodeAt(0) - 97;
    const rank = 8 - parseInt(squareName[1]);
    const piece = positions[rank][file];
    square.innerHTML = '';
    square.classList.remove('selected', 'highlight');

    if (piece) {
      const key = piece.color + piece.type.toUpperCase();
      const img = document.createElement('img');
      img.src = pieceImages[key];
      img.alt = key;
      square.appendChild(img);
    }
  });

  if (selectedSquare) {
    const selectedEl = document.querySelector(`[data-square="${selectedSquare}"]`);
    if (selectedEl) selectedEl.classList.add('selected');

    const legalMoves = chess.moves({ square: selectedSquare, verbose: true });
    legalMoves.forEach(move => {
      const target = document.querySelector(`[data-square="${move.to}"]`);
      if (target) target.classList.add('highlight');
    });
  }

  updateSidebar();
}

// --- Update Sidebar ---
function updateSidebar() {
  moveCounterEl.textContent = `Move: ${moveCount}`;
  const turn = chess.turn() === 'w' ? 'White' : 'Black';
  turnIndicatorEl.textContent = `${turn}'s Move`;

  if (chess.game_over() && chess.in_checkmate()) {
    buzzerEl.classList.add('active');
    buzzerSound.play();
  }
}

function botMove() {
  if (!playBot || chess.turn() !== "b") return;

  const allMoves = chess.moves({ verbose: true });
  if (allMoves.length === 0) return;

  let move;
  const value = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 1000 };

  // Helpers --------------------------------------------------------------
  const tempAfter = (m, base = chess) => {
    const t = new Chess(base.fen());
    t.move({ from: m.from, to: m.to, promotion: 'q' });
    return t;
  };

  const attackersOn = (board, square, color) => {
    const ms = board.moves({ verbose: true });
    return ms.filter(x => board.get(x.from) && board.get(x.from).color === color && x.to === square);
  };

  const countAttackers = (board, square, color) => attackersOn(board, square, color).length;

  const minAttackerValue = (board, square, color) => {
    const atks = attackersOn(board, square, color).map(x => value[board.get(x.from).type]);
    return atks.length ? Math.min(...atks) : Infinity;
  };

  const landingReasonablySafe = (m) => {
    const t = tempAfter(m);
    const sq = m.to;
    const opp = 'w', us = 'b';
    const attackers = countAttackers(t, sq, opp);
    if (attackers === 0) return true; // not attacked at all
    const defenders = countAttackers(t, sq, us);
    if (defenders > attackers) return true;
    if (defenders === attackers) {
      // compare cheapest exchanges
      const theirCheap = minAttackerValue(t, sq, opp);
      const ourCheap = minAttackerValue(t, sq, us);
      return ourCheap <= theirCheap; // we don't lose material on first two trades
    }
    return false;
  };

  const isGoodCapture = (m) => {
    if (!m.flags.includes('c') && !m.flags.includes('e')) return false;
    const captured = chess.get(m.to);
    const ourPiece = chess.get(m.from);
    if (!captured || !ourPiece) return false;

    // Strictly winning capture by value
    if (value[captured.type] > value[ourPiece.type]) return true;

    // Equal trade that is tactically safe
    const t = tempAfter(m);
    const sq = m.to;
    const attackers = countAttackers(t, sq, 'w');
    const defenders = countAttackers(t, sq, 'b');
    if (attackers === 0) return true; // free capture
    if (defenders >= attackers && value[captured.type] >= value[ourPiece.type]) return true;
    return false;
  };

  const findMateInOneFor = (color) => {
    const ms = chess.moves({ verbose: true }).filter(x => chess.get(x.from).color === color);
    for (const m of ms) {
      const t = tempAfter(m);
      if (t.in_checkmate()) return m;
    }
    return null;
  };

  const oppHasMateAfter = (board) => {
    // Does WHITE have a mate-in-one from this position?
    const ms = board.moves({ verbose: true }).filter(x => board.get(x.from).color === 'w');
    for (const m of ms) {
      const t2 = tempAfter(m, board);
      if (t2.in_checkmate()) return true;
    }
    return false;
  };

  const preventsOppMateInOne = (m) => {
    const t = tempAfter(m);
    return !oppHasMateAfter(t);
  };

  const canPlaySafe = (from, to) => {
    const m = allMoves.find(x => x.from === from && x.to === to);
    return m ? landingReasonablySafe(m) : false;
  };

  const hasPiece = (sq, type, color) => {
    const p = chess.get(sq);
    return p && p.type === type && p.color === color;
  };

  const fileOf = (sq) => sq[0];

  const fileHasOurPawn = (board, file) => {
    const ranks = ['1','2','3','4','5','6','7','8'];
    return ranks.some(r => {
      const p = board.get(file + r);
      return p && p.type === 'p' && p.color === 'b';
    });
  };

  const createsHighValueThreat = (m) => {
    const t = tempAfter(m);
    // After our move, do we attack their queen or rook for free/good trade?
    const targets = [];
    const oppPieces = ['q','r'];
    for (let file = 97; file <= 104; file++) {
      for (let rank = 1; rank <= 8; rank++) {
        const sq = String.fromCharCode(file) + rank;
        const p = t.get(sq);
        if (p && p.color === 'w' && oppPieces.includes(p.type)) targets.push(sq);
      }
    }
    for (const sq of targets) {
      const ourAtks = attackersOn(t, sq, 'b');
      if (ourAtks.length) {
        // If they can’t cheaply win that attacker, call it a good threat
        const theirCheapest = minAttackerValue(t, sq, 'w');
        const ourCheapest = minAttackerValue(t, sq, 'b');
        if (ourCheapest <= theirCheapest) return true;
      }
    }
    return false;
  };

  const fixesHangingPiece = (m) => {
    // If we move a hanging piece to safety, or add a defender to one of our attacked squares
    const opp = 'w', us = 'b';

    // Detect current hanging squares
    const hanging = [];
    for (let file = 97; file <= 104; file++) {
      for (let rank = 1; rank <= 8; rank++) {
        const sq = String.fromCharCode(file) + rank;
        const p = chess.get(sq);
        if (p && p.color === us) {
          const a = countAttackers(chess, sq, opp);
          if (a > 0) {
            const d = countAttackers(chess, sq, us);
            if (d < a) hanging.push(sq);
          }
        }
      }
    }

    const t = tempAfter(m);

    // If we moved a hanging piece, check its new square safety
    if (hanging.includes(m.from)) {
      const a = countAttackers(t, m.to, opp);
      const d = countAttackers(t, m.to, us);
      if (a === 0 || d >= a) return true;
    }

    // Or if after the move, any previously hanging square is now adequately defended
    for (const sq of hanging) {
      const a = countAttackers(t, sq, opp);
      const d = countAttackers(t, sq, us);
      if (a > 0 && d >= a) return true;
    }

    return false;
  };

  const rookToOpenFile = (m) => {
    const p = chess.get(m.from);
    if (!p || p.type !== 'r') return false;
    const t = tempAfter(m);
    const f = fileOf(m.to);
    return !fileHasOurPawn(t, f);
  };

  // ---------------------------------------------------------------------

if (botDifficulty === "stockfish") {
  if (!stockfish) return;

  stockfish.postMessage("position fen " + chess.fen());
  stockfish.postMessage("go depth 12");

  stockfish.onmessage = function (event) {
    const line = event.data;
    if (line.startsWith("bestmove")) {
      const parts = line.split(" ");
      const best = parts[1]; // e.g. "e2e4"
      if (best && best !== "(none)") {
        const move = {
          from: best.substring(0, 2),
          to: best.substring(2, 4),
          promotion: best.length > 4 ? best.substring(4, 5) : "q"
        };
        if (chess.move(move)) {
          moveCount++;
          renderBoard();
        }
      }
    }
  };

  return; // ⬅️ important so no other bot logic runs
}

  
  if (botDifficulty === "hard") {
    // Precompute safe (king-safe) legal moves
    const safeMoves = allMoves.filter(m => {
      const t = tempAfter(m);
      return !t.in_check();
    });

    // 0) Immediate tactics ------------------------------------------------
    //   a) Mate in one if available
    const mateNow = findMateInOneFor('b');
    if (mateNow) {
      move = mateNow;
    }

    //   b) If any move allows opponent mate-in-one, avoid those
    if (!move) {
      const avoid = safeMoves.filter(preventsOppMateInOne);
      if (avoid.length && avoid.length !== safeMoves.length) {
        // We found at least one safe-from-mate move and some moves that allow mate; restrict to avoid set
        safeMoves.splice(0, safeMoves.length, ...avoid);
      }
    }

    //   c) Free/good captures first
    if (!move) {
      const caps = safeMoves.filter(isGoodCapture);
      if (caps.length) {
        // Prefer biggest gain
        caps.sort((a,b) => {
          const gainA = (chess.get(a.to)?value[chess.get(a.to).type]:0) - value[chess.get(a.from).type];
          const gainB = (chess.get(b.to)?value[chess.get(b.to).type]:0) - value[chess.get(b.from).type];
          return gainB - gainA;
        });
        move = caps[0];
      }
    }

    // 1) Opening principles / development -------------------------------
    if (!move) {
      // Respond to e4/d4 with e5/d5 if safe
      const whiteE4 = hasPiece('e4','p','w');
      const whiteD4 = hasPiece('d4','p','w');
      if (whiteE4 && canPlaySafe('e7','e5')) move = { from: 'e7', to: 'e5' };
      else if (whiteD4 && canPlaySafe('d7','d5')) move = { from: 'd7', to: 'd5' };
    }

    if (!move) {
      // Develop knights to c6/f6 if the landing square is reasonably safe
      const kDevs = safeMoves.filter(m => {
        const p = chess.get(m.from);
        if (!p || p.type !== 'n') return false;
        if (m.to !== 'c6' && m.to !== 'f6') return false;
        return landingReasonablySafe(m);
      });
      if (kDevs.length) move = kDevs[Math.floor(Math.random()*kDevs.length)];
    }

    if (!move) {
      // Fianchetto plan: g6, Bg7, O-O (when legal and safe); then b6, Bb7
      const tryMovesInOrder = [
        () => allMoves.find(m => m.from==='g7' && m.to==='g6' && landingReasonablySafe(m)),
        () => allMoves.find(m => m.from==='f8' && m.to==='g7' && landingReasonablySafe(m)),
        () => safeMoves.find(m => m.flags && m.flags.includes('k')), // castle short for black
        () => allMoves.find(m => m.from==='b7' && m.to==='b6' && landingReasonablySafe(m)),
        () => allMoves.find(m => m.from==='c8' && m.to==='b7' && landingReasonablySafe(m)),
      ];
      for (const fn of tryMovesInOrder) {
        const m = fn();
        if (m) { move = m; break; }
      }
    }

    // 2) Tactical threats / defense (run every turn when no capture/develop) ----
    if (!move) {
      const fixers = safeMoves.filter(fixesHangingPiece);
      if (fixers.length) move = fixers[Math.floor(Math.random()*fixers.length)];
    }

    if (!move) {
      const threats = safeMoves.filter(createsHighValueThreat);
      if (threats.length) move = threats[Math.floor(Math.random()*threats.length)];
    }

    // 3) Rooks to open files --------------------------------------------
    if (!move) {
      const rookMoves = safeMoves.filter(rookToOpenFile);
      if (rookMoves.length) move = rookMoves[Math.floor(Math.random()*rookMoves.length)];
    }

    // 4) Space / pawn pushes that poke pawns -----------------------------
    if (!move) {
      const pawnPushes = safeMoves.filter(m => {
        const p = chess.get(m.from);
        if (!p || p.type !== 'p') return false;
        // Prefer pushes that will attack an enemy pawn next (like ...d5 vs c4/d4)
        const t = tempAfter(m);
        // squares this pawn would attack after push
        const dir = -1; // black pawns move down the board (toward rank decreasing)
        const f = m.to[0];
        const r = parseInt(m.to[1],10);
        const diag1 = String.fromCharCode(f.charCodeAt(0)-1) + (r+dir);
        const diag2 = String.fromCharCode(f.charCodeAt(0)+1) + (r+dir);
        const targets = [diag1, diag2];
        return targets.some(sq => {
          const pt = t.get(sq);
          if (pt && pt.color==='w' && pt.type==='p') {
            // is that pawn poorly defended?
            const a = countAttackers(t, sq, 'w');
            const d = countAttackers(t, sq, 'b');
            return d >= a; // we can win or at least contest it
          }
          return false;
        });
      });
      if (pawnPushes.length) move = pawnPushes[Math.floor(Math.random()*pawnPushes.length)];
    }

    // 5) Fallback: any reasonably safe move ------------------------------
    if (!move && safeMoves.length) {
      // Prefer moves whose landing square is not badly attacked
      const decent = safeMoves.filter(landingReasonablySafe);
      move = (decent[0] || safeMoves[0]);
    }
  } else if (botDifficulty === "medium") {
    const safeMoves = allMoves.filter(m => !tempAfter(m).in_check());
    const captures = safeMoves.filter(m => m.flags.includes('c') || m.flags.includes('e'));
    move = captures.length ? captures[Math.floor(Math.random()*captures.length)]
                           : safeMoves[Math.floor(Math.random()*safeMoves.length)];
  } else {
    const safeMoves = allMoves.filter(m => !tempAfter(m).in_check());
    move = safeMoves[Math.floor(Math.random()*safeMoves.length)];
  }

  if (!move) return; // no legal move found (shouldn't happen here)

  chess.move(move);
  moveCount++;
  renderBoard();
}

// --- Board Click Handler ---
board.addEventListener('click', e => {
  if (playBot && chess.turn() === "b") return;

  const targetSquare = e.target.closest('.square');
  if (!targetSquare) return;

  const clicked = targetSquare.getAttribute('data-square');
  const piece = chess.get(clicked);

  if (selectedSquare) {
    const move = chess.move({ from: selectedSquare, to: clicked, promotion: 'q' });
    if (move) {
      selectedSquare = null;
      moveCount++;
      renderBoard();
      if (playBot) setTimeout(botMove, 500);
      return;
    } else if (piece && piece.color === chess.turn()) selectedSquare = clicked;
    else selectedSquare = null;
  } else {
    if (piece && piece.color === chess.turn()) selectedSquare = clicked;
  }

  renderBoard();
});

// --- Reset Board ---
resetButton.addEventListener("click", () => {
  chess.reset();
  moveCount = 1;
  selectedSquare = null;
  buzzerEl.classList.remove("active");
  renderBoard();
});

// --- Toggle Bot Mode ---
toggleBotBtn.addEventListener("click", () => {
  playBot = !playBot;
  toggleBotBtn.textContent = playBot ? "Playing vs Bot" : "Playing vs Human";

  // Bot moves immediately if turned on during black's turn
  if (playBot && chess.turn() === "b") setTimeout(botMove, 500);
});

// --- Change Difficulty ---
difficultySelect.addEventListener("change", () => {
  botDifficulty = difficultySelect.value; // "easy", "medium", "hard"
});

// --- Initial Render ---
renderBoard();
// --- Initial Render ---
renderBoard();
