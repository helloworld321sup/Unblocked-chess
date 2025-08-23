const chess = new Chess();
const board = document.querySelector('.chess-board');
let selectedSquare = null;

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

async function botMove() {
  if (!playBot || chess.turn() !== "b") return;

  // Make sure engine is ready (non-fatal if not present)
  try { initEngine(); } catch (e) {}

  const value = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 1000 };

  // Helpers
  const our = 'b', opp = 'w';

  function cloneAndMove(m) {
    const tmp = new Chess(chess.fen());
    tmp.move({ from: m.from, to: m.to, promotion: 'q' });
    return tmp;
  }

  function listMovesBy(color, pos = chess) {
    return pos.moves({ verbose: true }).filter(mm => pos.get(mm.from)?.color === color);
  }

  function isSquareAttacked(pos, square, byColor) {
    const theirMoves = listMovesBy(byColor, pos);
    return theirMoves.some(mm => mm.to === square);
  }

  function attackersCount(pos, square, byColor) {
    return listMovesBy(byColor, pos).filter(mm => mm.to === square).length;
  }

  function pieceValAt(pos, sq) {
    const pc = pos.get(sq);
    return pc ? value[pc.type] : 0;
    }

  // does m hang our moved piece for free or for a losing trade?
  function isLosingMove(m) {
    const after = cloneAndMove(m);
    const toSq = m.to;
    // If we just gave checkmate / stalemate guard
    if (after.game_over()) return false;

    // If our piece on toSq can be captured
    if (!isSquareAttacked(after, toSq, opp)) return false;

    // crude but effective LVA/MVV check:
    const ourPiece = chess.get(m.from);
    const capturedVal = pieceValAt(chess, m.to); // 0 if quiet
    const ourVal = value[ourPiece.type];

    // If we didn't gain enough material and they can capture us, treat as losing.
    // Allow fair or better trades on capture.
    const gain = capturedVal - ourVal;
    if (gain >= 0) {
      // still ensure we aren't simply recaptured by many attackers while underdefended
      const ourDef = attackersCount(after, toSq, our);
      const theirAtt = attackersCount(after, toSq, opp);
      if (theirAtt > ourDef) return true;
      return false;
    }
    // quiet move or losing capture — if attacked, likely losing
    return true;
  }

  // find our currently threatened high-value pieces to defend first
  function threatenedOurPieces() {
    const out = [];
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const pc = board[r][f];
        if (!pc || pc.color !== our) continue;
        const sq = String.fromCharCode(97 + f) + (8 - r);
        if (isSquareAttacked(chess, sq, opp)) {
          out.push({ sq, pc });
        }
      }
    }
    // prioritize queen/rook/minors first
    return out.sort((a, b) => value[b.pc.type] - value[a.pc.type]);
  }

  function isOpenFileForRook(pos, fileChar) {
    // true if no pawns on that file
    for (let rank = 1; rank <= 8; rank++) {
      const sq = fileChar + rank;
      const p = pos.get(sq);
      if (p && p.type === 'p') return false;
    }
    return true;
  }

  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // Base lists
  const all = chess.moves({ verbose: true }).filter(m => chess.get(m.from)?.color === our);
  if (all.length === 0) return;

  // Filter illegal king-in-check moves
  const legalSafe = all.filter(m => {
    const t = cloneAndMove(m);
    return !t.in_check(); // never leave king in check
  });

  // HARD MODE LOGIC
  if (botDifficulty === "hard") {
    // A) 1-ply mate (or forced mate hint) via Stockfish if available
    if (sfReady && sf) {
      const { best: sfMateTry, mate } = await sfBest(chess.fen(), 4, { wantMateHint: true });
      if (sfMateTry && mate && mate > 0) {
        // Stockfish says "mate N" in our favor — play it
        const ok = legalSafe.find(m => (m.san && m.san.includes("#")) || (m.from + m.to) === sfMateTry.substring(0,4));
        if (ok) {
          chess.move(ok);
          moveCount++;
          renderBoard();
          return;
        }
      }
    }

    // B) Urgent defense: if a valuable piece is attacked, try saving/defending it first
    const threats = threatenedOurPieces();
    if (threats.length) {
      const target = threats[0]; // most valuable threatened
      const saveMoves = legalSafe.filter(m => {
        // move the threatened piece away, block, or defend
        if (m.from === target.sq) {
          const after = cloneAndMove(m);
          // don't move it to an attacked square unless defended enough
          const safe = !isSquareAttacked(after, m.to, opp) ||
                       attackersCount(after, m.to, our) >= attackersCount(after, m.to, opp);
          return safe && !isLosingMove(m);
        }
        // defend it by adding another attacker to that square
        const after = cloneAndMove(m);
        const ourDef = attackersCount(after, target.sq, our);
        const theirAtt = attackersCount(after, target.sq, opp);
        return ourDef > theirAtt; // improved defense
      });
      if (saveMoves.length) {
        chess.move(pickRandom(saveMoves));
        moveCount++;
        renderBoard();
        return;
      }
    }

    // C) Tactics first: checks, winning captures, free pieces
    const checks = legalSafe.filter(m => cloneAndMove(m).in_check()); // giving check
    if (checks.length) {
      // prefer checks that also gain material or avoid being captured
      const goodChecks = checks.filter(m => !isLosingMove(m));
      if (goodChecks.length) {
        chess.move(pickRandom(goodChecks));
        moveCount++;
        renderBoard();
        return;
      }
    }

    // winning / fair captures (MVV-LVA-ish)
    const captures = legalSafe.filter(m => m.flags.includes('c') || m.flags.includes('e'));
    const goodCaps = captures.filter(m => {
      const ourPiece = chess.get(m.from);
      const cap = chess.get(m.to);
      if (!cap) return false;
      const gain = value[cap.type] - value[ourPiece.type];
      // prefer >= fair trade and not a blunder
      return gain >= 0 && !isLosingMove(m);
    });
    if (goodCaps.length) {
      chess.move(pickRandom(goodCaps));
      moveCount++;
      renderBoard();
      return;
    }

    // D) Opening plan vs e4/d4; otherwise fianchetto/castle, then b6/Bb7
    const fenStartish = chess.history().length < 12; // opening window
    if (fenStartish) {
      const lastWhite = chess.history({ verbose: true }).filter(h => h.color === 'w').slice(-1)[0];
      const openingMoves = [];
      if (lastWhite) {
        // mirror center: if e4 -> e5, if d4 -> d5
        if (lastWhite.to === "e4" && chess.get("e7")) openingMoves.push({ from: "e7", to: "e5" });
        if (lastWhite.to === "d4" && chess.get("d7")) openingMoves.push({ from: "d7", to: "d5" });
      }
      // Otherwise: Nf6/Nc6 if safe and not a blunder
      ["g8f6", "b8c6"].forEach(u => {
        const from = u.slice(0,2), to = u.slice(2,4);
        openingMoves.push({ from, to });
      });
      // Fianchetto plan g6, Bg7, O-O (when legal), then b6, Bb7
      ["g7g6", "f8g7", "e8g8", "b7b6", "c8b7"].forEach(u => {
        const from = u.slice(0,2), to = u.slice(2,4);
        openingMoves.push({ from, to });
      });

      const playable = openingMoves.map(t => {
        const found = legalSafe.find(m => m.from === t.from && m.to === t.to);
        return found && !isLosingMove(found) ? found : null;
      }).filter(Boolean);

      // But—before any dev move—double-check there isn’t a free pawn/piece we can take safely
      if (!goodCaps.length) {
        const freeCaps = captures.filter(m => {
          const ourPiece = chess.get(m.from);
          const cap = chess.get(m.to);
          if (!cap) return false;
          const after = cloneAndMove(m);
          // treat as "free" if result square is not attacked more than defended
          const def = attackersCount(after, m.to, our);
          const att = attackersCount(after, m.to, opp);
          return att <= def && !isLosingMove(m);
        });
        if (freeCaps.length) {
          chess.move(pickRandom(freeCaps));
          moveCount++;
          renderBoard();
          return;
        }
      }

      if (playable.length) {
        chess.move(pickRandom(playable));
        moveCount++;
        renderBoard();
        return;
      }
    }

    // E) Positional improvements: rooks to open files (only if not hangy)
    const rookMoves = legalSafe.filter(m => chess.get(m.from)?.type === 'r')
      .filter(m => {
        const file = m.to[0];
        return isOpenFileForRook(chess, file) && !isLosingMove(m);
      });
    if (rookMoves.length) {
      chess.move(pickRandom(rookMoves));
      moveCount++;
      renderBoard();
      return;
    }

    // F) Quiet, safe development toward central influence (no hanging)
    const devTargets = new Set(["c6","d6","e6","f6","c5","d5","e5","f5"]);
    const devMoves = legalSafe.filter(m => {
      const pc = chess.get(m.from);
      if (!pc) return false;
      if (pc.type === 'n' || pc.type === 'b') {
        return devTargets.has(m.to) && !isLosingMove(m);
      }
      return false;
    });
    if (devMoves.length) {
      chess.move(pickRandom(devMoves));
      moveCount++;
      renderBoard();
      return;
    }

    // G) Push pawns to gain space IF not hanging
    const pawnPushes = legalSafe.filter(m => chess.get(m.from)?.type === 'p' && !isLosingMove(m));
    if (pawnPushes.length) {
      chess.move(pickRandom(pawnPushes));
      moveCount++;
      renderBoard();
      return;
    }

    // H) Last resort: any non-losing safe move
    const safest = legalSafe.filter(m => !isLosingMove(m));
    if (safest.length) {
      chess.move(pickRandom(safest));
      moveCount++;
      renderBoard();
      return;
    }
  }

  // ------- Medium / Easy fallback (your old logic, but safe baseline) -------
  const moves = chess.moves({ verbose: true }).filter(m => chess.get(m.from)?.color === our);
  const safe = moves.filter(m => {
    const t = cloneAndMove(m);
    return !t.in_check();
  });

  let move;
  if (botDifficulty === "medium") {
    const caps = safe.filter(m => m.flags.includes("c") || m.flags.includes("e"));
    move = (caps.length ? pickRandom(caps) : pickRandom(safe));
  } else {
    move = pickRandom(safe);
  }

  if (move) {
    chess.move(move);
    moveCount++;
    renderBoard();
  }
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
