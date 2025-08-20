window.onload = () => {
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
  let playBot = true;
  let botDifficulty = "medium";

  toggleBotBtn.textContent = playBot ? "Playing vs Bot" : "Playing vs Human";

  // Initialize Stockfish
  const engine = Stockfish();
  let waitingForStockfish = false;

  engine.onmessage = (event) => {
    const line = event.data || event;
    if (line.startsWith("bestmove")) {
      const bestMove = line.split(" ")[1];
      chess.move(bestMove, { sloppy: true });
      moveCount++;
      waitingForStockfish = false;
      renderBoard();
      // If bot still should move again (multi-ply), schedule next move
      if (playBot && chess.turn() === "b") setTimeout(botMove, 300);
    }
  };

  // --- Render Board ---
  function renderBoard() {
    const positions = chess.board();
    board.querySelectorAll(".square").forEach((square) => {
      const squareName = square.getAttribute("data-square");
      const file = squareName.charCodeAt(0) - 97;
      const rank = 8 - parseInt(squareName[1]);
      const piece = positions[rank][file];
      square.innerHTML = "";
      square.classList.remove("selected", "highlight");

      if (piece) {
        const key = piece.color + piece.type.toUpperCase();
        const img = document.createElement("img");
        img.src = pieceImages[key];
        img.alt = key;
        square.appendChild(img);
      }
    });

    if (selectedSquare) {
      const selectedEl = document.querySelector(`[data-square="${selectedSquare}"]`);
      if (selectedEl) selectedEl.classList.add("selected");

      const legalMoves = chess.moves({ square: selectedSquare, verbose: true });
      legalMoves.forEach((move) => {
        const target = document.querySelector(`[data-square="${move.to}"]`);
        if (target) target.classList.add("highlight");
      });
    }

    updateSidebar();
  }

  function updateSidebar() {
    moveCounterEl.textContent = `Move: ${moveCount}`;
    turnIndicatorEl.textContent = chess.turn() === "w" ? "White's Move" : "Black's Move";

    if (chess.game_over() && chess.in_checkmate()) {
      buzzerEl.classList.add("active");
      buzzerSound.play();
    } else {
      buzzerEl.classList.remove("active");
    }
  }

  // --- Bot Move ---
  function botMove() {
    if (!playBot || chess.turn() !== "b" || waitingForStockfish) return;

    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return;

    if (botDifficulty === "stockfish") {
      waitingForStockfish = true;
      engine.postMessage(`position fen ${chess.fen()}`);
      engine.postMessage("go depth 15"); // You can adjust depth
      return;
    }

    let move;
    if (botDifficulty === "hard") {
      // Knight development first
      const knightMoves = moves.filter((m) => {
        const piece = chess.get(m.from);
        if (!piece || piece.type !== "n") return false;
        return ["c6", "f6"].includes(m.to);
      });
      if (knightMoves.length) move = knightMoves[Math.floor(Math.random() * knightMoves.length)];

      // Safe captures
      if (!move) {
        const safeCaptures = moves.filter((m) => {
          if (!m.flags.includes("c") && !m.flags.includes("e")) return false;
          const captured = chess.get(m.to);
          const ourPiece = chess.get(m.from);
          if (!captured || !ourPiece) return false;
          const value = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 1000 };
          return value[captured.type] >= value[ourPiece.type];
        });
        if (safeCaptures.length) move = safeCaptures[Math.floor(Math.random() * safeCaptures.length)];
      }

      // Center development
      if (!move) {
        const centerMoves = moves.filter((m) => ["d6","e6","d5","e5","c6","f6"].includes(m.to));
        if (centerMoves.length) move = centerMoves[Math.floor(Math.random() * centerMoves.length)];
      }

      // Fallback
      if (!move) move = moves[Math.floor(Math.random() * moves.length)];
    } else if (botDifficulty === "medium") {
      const captures = moves.filter((m) => m.flags.includes("c") || m.flags.includes("e"));
      move = captures.length ? captures[Math.floor(Math.random() * captures.length)]
                             : moves[Math.floor(Math.random() * moves.length)];
    } else { // easy
      move = moves[Math.floor(Math.random() * moves.length)];
    }

    chess.move(move);
    moveCount++;
    renderBoard();
  }

  // --- Board Click ---
  board.addEventListener("click", (e) => {
    if (playBot && chess.turn() === "b") return;

    const targetSquare = e.target.closest(".square");
    if (!targetSquare) return;

    const clicked = targetSquare.getAttribute("data-square");
    const piece = chess.get(clicked);

    if (selectedSquare) {
      const move = chess.move({ from: selectedSquare, to: clicked, promotion: "q" });
      if (move) {
        selectedSquare = null;
        moveCount++;
        renderBoard();
        if (playBot) setTimeout(botMove, 300);
        return;
      } else if (piece && piece.color === chess.turn()) {
        selectedSquare = clicked;
      } else selectedSquare = null;
    } else {
      if (piece && piece.color === chess.turn()) selectedSquare = clicked;
    }

    renderBoard();
  });

  // --- Reset ---
  resetButton.addEventListener("click", () => {
    chess.reset();
    moveCount = 1;
    selectedSquare = null;
    buzzerEl.classList.remove("active");
    renderBoard();
  });

  // --- Toggle Bot ---
  toggleBotBtn.addEventListener("click", () => {
    playBot = !playBot;
    toggleBotBtn.textContent = playBot ? "Playing vs Bot" : "Playing vs Human";
    if (playBot && chess.turn() === "b") setTimeout(botMove, 300);
  });

  // --- Change Difficulty ---
  difficultySelect.addEventListener("change", () => {
    botDifficulty = difficultySelect.value;
  });

  // --- Initial Render ---
  renderBoard();
};

// --- Initial Render ---
renderBoard();
