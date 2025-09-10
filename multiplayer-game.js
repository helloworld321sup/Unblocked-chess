// Multiplayer Game functionality
const chess = new Chess();
const board = document.querySelector('.chess-board');
let selectedSquare = null;
let currentRoom = null;
let playerRole = null;
let gameStartTime = null;
let gameTimer = null;
let moveCount = 0;
let boardFlipped = false;
let lastMove = null;

// Sound effects
const sounds = {
  move: new Audio("http://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3"),
  capture: new Audio("http://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3"),
  castle: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/castle.mp3"),
  check: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3"),
  promotion: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/promote.mp3"),
  checkmate: new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_WEBM_/default/game-end.webm")
};

// Apply board color from settings
function applyBoardColor() {
  const boardColor = localStorage.getItem('boardColor') || '#d67959';
  document.documentElement.style.setProperty('--black-square-color', boardColor);
}

// Play move sound effects
function playMoveSound(move) {
  console.log('🔊 Playing move sound for:', move);
  
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

// Apply board color on page load
applyBoardColor();

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

document.addEventListener('DOMContentLoaded', function() {
  // Load room data
  loadRoomData();
  
  // Wait for Firebase multiplayer server to be ready
  waitForMultiplayerServer();
  
  // Set up event listeners
  setupEventListeners();
  
  // Start game timer
  startGameTimer();
});

// Wait for multiplayer server to be ready
function waitForMultiplayerServer() {
  if (window.multiplayerServer) {
    console.log('✅ Multiplayer server ready, initializing game...');
    initializeGame();
    setupFirebaseListeners();
  } else {
    console.log('⏳ Waiting for multiplayer server...');
    setTimeout(waitForMultiplayerServer, 100);
  }
}

// Set up Firebase listeners for real-time updates
function setupFirebaseListeners() {
  if (!window.multiplayerServer || !currentRoom) {
    console.error('Multiplayer server or room data not available');
    return;
  }
  
  console.log('🔔 Setting up Firebase listeners for room:', currentRoom.id);
  
  // Listen for game state changes
  const gameRef = window.multiplayerServer.database.ref(`rooms/${currentRoom.id}/currentGame`);
  gameRef.on('value', (snapshot) => {
    const gameData = snapshot.val();
    if (gameData) {
      console.log('🔄 Game state updated:', gameData);
      updateGameFromFirebase(gameData);
    }
  });
  
  // Listen for moves
  const movesRef = window.multiplayerServer.database.ref(`rooms/${currentRoom.id}/moves`);
  movesRef.on('child_added', (snapshot) => {
    const move = snapshot.val();
    console.log('🔄 New move received:', move);
    applyMoveFromFirebase(move);
  });
  
  // Listen for game events (resignation, draw offers, etc.)
  const gameEventsRef = window.multiplayerServer.database.ref(`rooms/${currentRoom.id}/gameEvents`);
  gameEventsRef.on('child_added', (snapshot) => {
    const event = snapshot.val();
    console.log('🔄 New game event received:', event);
    handleGameEventFromFirebase(event);
  });
}

// Load room data from localStorage
function loadRoomData() {
  const roomData = localStorage.getItem('currentRoom');
  const role = localStorage.getItem('playerRole');
  
  if (!roomData || !role) {
    alert('No room data found. Redirecting to multiplayer.');
    window.location.href = 'multiplayer.html';
    return;
  }

  currentRoom = JSON.parse(roomData);
  playerRole = role;

  // Check if room has both players
  if (!currentRoom.guestId) {
    alert('No opponent found. Redirecting to waiting room.');
    window.location.href = 'waiting-room.html';
    return;
  }

  // Display room information
  displayRoomInfo();
  
  // Set up player information
  setupPlayerInfo();
}

// Display room information
function displayRoomInfo() {
  document.getElementById('room-id').textContent = currentRoom.id.slice(-6);
  document.getElementById('game-number').textContent = `Game ${currentRoom.currentGame || 1}`;
  document.getElementById('total-games').textContent = `of ${currentRoom.gamesCount}`;
  
  if (currentRoom.roomType === 'private' && currentRoom.roomCode) {
    document.getElementById('room-code-display').style.display = 'inline';
    document.getElementById('room-code').textContent = currentRoom.roomCode;
  }
}

// Set up player information
function setupPlayerInfo() {
  // Determine who plays white based on room settings
  let isHostWhite = false;
  
  if (currentRoom.firstPlayer === 'host') {
    isHostWhite = true;
  } else if (currentRoom.firstPlayer === 'guest') {
    isHostWhite = false;
  } else if (currentRoom.firstPlayer === 'random') {
    // Use a consistent random seed based on room ID
    const seed = currentRoom.id.split('_')[1];
    isHostWhite = parseInt(seed) % 2 === 0;
  }
  
  // Store player colors
  currentRoom.hostColor = isHostWhite ? 'w' : 'b';
  currentRoom.guestColor = isHostWhite ? 'b' : 'w';
  
  if (playerRole === 'host') {
    document.getElementById('white-player-name').textContent = isHostWhite ? 'You' : 'Opponent';
    document.getElementById('black-player-name').textContent = isHostWhite ? 'Opponent' : 'You';
    document.getElementById('white-player-role').textContent = 'Host';
    document.getElementById('black-player-role').textContent = 'Guest';
  } else {
    document.getElementById('white-player-name').textContent = isHostWhite ? 'Opponent' : 'You';
    document.getElementById('black-player-name').textContent = isHostWhite ? 'You' : 'Opponent';
    document.getElementById('white-player-role').textContent = 'Host';
    document.getElementById('black-player-role').textContent = 'Guest';
  }
}

// Initialize the game
function initializeGame() {
  console.log('🎮 Initializing game...');
  console.log('📊 Current room:', currentRoom);
  console.log('👤 Player role:', playerRole);
  
  // Create the chess board
  createBoard();
  
  // Render the initial position
  renderBoard();
  
  // Update game status
  updateGameStatus();
  
  console.log('✅ Game initialized successfully!');
}

// Create the chess board
function createBoard() {
  console.log('🏗️ Creating chess board...');
  console.log('📊 Board element:', board);
  
  board.innerHTML = '';
  
  for (let row = 0; row < 8; row++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'row';
    
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      square.className = 'square';
      square.dataset.row = row;
      square.dataset.col = col;
      
      // Add alternating colors
      if ((row + col) % 2 === 0) {
        square.classList.add('white');
      } else {
        square.classList.add('black');
      }
      
      // Add click event
      square.addEventListener('click', handleSquareClick);
      
      rowDiv.appendChild(square);
    }
    
    board.appendChild(rowDiv);
  }
  
  console.log('✅ Board created with', board.children.length, 'rows');
  console.log('✅ Total squares:', board.querySelectorAll('.square').length);
}

// Render the board with pieces
function renderBoard() {
  const positions = chess.board();
  
  // Clear all highlights first
  document.querySelectorAll('.square').forEach(square => {
    square.classList.remove('selected', 'highlight', 'recent-move');
    // Remove existing move dots
    square.querySelectorAll('.move-dot').forEach(dot => dot.remove());
  });
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
      const piece = positions[row][col];
      
      // Clear existing piece
      square.innerHTML = '';
      
      if (piece) {
        const pieceImg = document.createElement('img');
        pieceImg.src = pieceImages[piece.color + piece.type.toUpperCase()];
        pieceImg.alt = `${piece.color} ${piece.type}`;
        square.appendChild(pieceImg);
      }
    }
  }
  
  // Add move dots for legal moves if a piece is selected
  if (selectedSquare) {
    console.log('🎯 Adding move dots for selected square:', selectedSquare);
    const legalMoves = chess.moves({ square: selectedSquare, verbose: true });
    console.log('📋 Legal moves:', legalMoves);
    
    legalMoves.forEach(move => {
      const targetRow = 8 - parseInt(move.to[1]);
      const targetCol = move.to.charCodeAt(0) - 97;
      const targetSquare = document.querySelector(`[data-row="${targetRow}"][data-col="${targetCol}"]`);
      
      console.log('🎯 Adding dot to:', move.to, 'row:', targetRow, 'col:', targetCol, 'element:', targetSquare);
      
      if (targetSquare) {
        const dot = document.createElement('div');
        dot.classList.add('move-dot');
        targetSquare.appendChild(dot);
        console.log('✅ Move dot added to', move.to, 'dot element:', dot);
        console.log('✅ Target square after adding dot:', targetSquare);
        console.log('✅ Dots in target square:', targetSquare.querySelectorAll('.move-dot').length);
      } else {
        console.error('❌ Could not find target square for', move.to);
      }
    });
    
    // Highlight selected square
    const selectedRow = 8 - parseInt(selectedSquare[1]);
    const selectedCol = selectedSquare.charCodeAt(0) - 97;
    const selectedSquareEl = document.querySelector(`[data-row="${selectedRow}"][data-col="${selectedCol}"]`);
    if (selectedSquareEl) {
      selectedSquareEl.classList.add('selected');
      console.log('✅ Selected square highlighted:', selectedSquare);
    } else {
      console.error('❌ Could not find selected square element for:', selectedSquare);
    }
  }
  
  // Highlight last move
  if (lastMove) {
    console.log('🔄 Highlighting last move:', lastMove);
    const fromRow = 8 - parseInt(lastMove.from[1]);
    const fromCol = lastMove.from.charCodeAt(0) - 97;
    const toRow = 8 - parseInt(lastMove.to[1]);
    const toCol = lastMove.to.charCodeAt(0) - 97;
    
    const fromSquare = document.querySelector(`[data-row="${fromRow}"][data-col="${fromCol}"]`);
    const toSquare = document.querySelector(`[data-row="${toRow}"][data-col="${toCol}"]`);
    
    if (fromSquare) {
      fromSquare.classList.add('recent-move');
      console.log('✅ Last move from square highlighted:', lastMove.from);
    }
    if (toSquare) {
      toSquare.classList.add('recent-move');
      console.log('✅ Last move to square highlighted:', lastMove.to);
    }
  }
}

// Handle square clicks
function handleSquareClick(event) {
  console.log('🎯 Square clicked!', event.target);
  
  // Find the actual square element (in case we clicked on a piece image)
  let squareElement = event.target;
  while (squareElement && !squareElement.classList.contains('square')) {
    squareElement = squareElement.parentElement;
  }
  
  if (!squareElement) {
    console.error('❌ Could not find square element');
    return;
  }
  
  const row = parseInt(squareElement.dataset.row);
  const col = parseInt(squareElement.dataset.col);
  const square = `${String.fromCharCode(97 + col)}${8 - row}`;
  
  console.log('📍 Clicked square:', square, 'row:', row, 'col:', col);
  
  // Check if it's the player's turn
  const currentPlayer = chess.turn();
  const myColor = playerRole === 'host' ? currentRoom.hostColor : currentRoom.guestColor;
  const isMyTurn = currentPlayer === myColor;
  
  console.log('🎮 Turn check:', {
    currentPlayer,
    myColor,
    isMyTurn,
    playerRole,
    hostColor: currentRoom.hostColor,
    guestColor: currentRoom.guestColor
  });
  
  if (!isMyTurn) {
    console.log('❌ Not your turn!');
    return;
  }
  
  if (selectedSquare) {
    // Try to make a move
    const move = {
      from: selectedSquare,
      to: square,
      promotion: 'q' // Auto-promote to queen
    };
    
    const result = chess.move(move);
    
    if (result) {
      // Move was successful
      moveCount++;
      lastMove = result; // Store the last move
      
      // Play move sound
      playMoveSound(result);
      
      updateMoveHistory(result);
      renderBoard();
      updateGameStatus();
      
      // Send move to Firebase
      sendMoveToFirebase(result);
      
      // Check for game over
      if (chess.in_checkmate() || chess.in_draw() || chess.in_stalemate()) {
        handleGameOver();
      }
      
      // Clear selection
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
  
  const row = 8 - parseInt(square[1]);
  const col = square.charCodeAt(0) - 97;
  const squareElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  
  console.log('🎯 Selecting square:', square, 'row:', row, 'col:', col, 'element:', squareElement);
  
  if (squareElement) {
    squareElement.classList.add('selected');
    selectedSquare = square;
    console.log('✅ Square selected:', square);
    
    // Re-render board to show move dots
    renderBoard();
  } else {
    console.error('❌ Could not find square element for:', square);
  }
}

// Clear selection
function clearSelection() {
  document.querySelectorAll('.square').forEach(square => {
    square.classList.remove('selected');
  });
  selectedSquare = null;
}

// Update game status
function updateGameStatus() {
  const turnElement = document.getElementById('current-turn');
  const currentPlayer = chess.turn();
  
  if (currentPlayer === 'w') {
    turnElement.textContent = 'White to move';
  } else {
    turnElement.textContent = 'Black to move';
  }
  
  // Update move count
  document.getElementById('move-count').textContent = moveCount;
}

// Update move history
function updateMoveHistory(move) {
  const movesList = document.getElementById('moves-list');
  const moveElement = document.createElement('div');
  moveElement.className = 'move-item';
  moveElement.textContent = `${moveCount}. ${move.san}`;
  movesList.appendChild(moveElement);
  
  // Scroll to bottom
  movesList.scrollTop = movesList.scrollHeight;
}

// Handle game over
function handleGameOver() {
  console.log('🏁 Game over detected!');
  console.log('📊 Chess object methods:', Object.getOwnPropertyNames(chess));
  
  const modal = document.getElementById('game-over-modal');
  const title = document.getElementById('game-over-title');
  const message = document.getElementById('game-over-message');
  const winner = document.getElementById('winner');
  const endReason = document.getElementById('end-reason');
  
  let result = '';
  let reason = '';
  
  // Check what type of game over it is
  if (chess.in_checkmate()) {
    result = chess.turn() === 'w' ? 'Black wins' : 'White wins';
    reason = 'Checkmate';
  } else if (chess.in_draw()) {
    result = 'Draw';
    reason = 'Draw';
  } else if (chess.in_stalemate()) {
    result = 'Draw';
    reason = 'Stalemate';
  } else {
    // Fallback
    result = 'Game Over';
    reason = 'Game ended';
  }
  
  console.log('🏆 Game result:', result, 'Reason:', reason);
  
  title.textContent = 'Game Over';
  message.textContent = result;
  winner.textContent = result;
  endReason.textContent = reason;
  
  // Show/hide Next Game button based on whether there are more games
  const nextGameBtn = document.getElementById('next-game-btn');
  if (currentRoom && currentRoom.gamesCount > currentRoom.currentGame) {
    nextGameBtn.style.display = 'block';
  } else {
    nextGameBtn.style.display = 'none';
  }
  
  modal.style.display = 'block';
  
  // Stop timer
  if (gameTimer) {
    clearInterval(gameTimer);
  }
}

// Start game timer
function startGameTimer() {
  gameStartTime = Date.now();
  
  gameTimer = setInterval(() => {
    const elapsed = Date.now() - gameStartTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    document.getElementById('game-time').textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, 1000);
}

// Set up event listeners
function setupEventListeners() {
  // Flip board
  document.getElementById('flip-board-btn').addEventListener('click', flipBoard);
  
  // Resign
  document.getElementById('resign-btn').addEventListener('click', resign);
  
  // Offer draw
  document.getElementById('offer-draw-btn').addEventListener('click', offerDraw);
  
  // Undo move
  document.getElementById('undo-move-btn').addEventListener('click', undoMove);
  
  // Game over modal buttons
  document.getElementById('next-game-btn').addEventListener('click', nextGame);
  document.getElementById('finish-match-btn').addEventListener('click', finishMatch);
  
  // Draw offer modal buttons
  document.getElementById('accept-draw-btn').addEventListener('click', acceptDraw);
  document.getElementById('decline-draw-btn').addEventListener('click', declineDraw);
}

// Flip board
function flipBoard() {
  boardFlipped = !boardFlipped;
  
  // Rotate the board 180 degrees but keep pieces upright
  if (boardFlipped) {
    board.style.transform = 'rotate(180deg)';
    // Rotate pieces back to keep them upright
    board.querySelectorAll('img').forEach(img => {
      img.style.transform = 'rotate(180deg)';
    });
  } else {
    board.style.transform = 'rotate(0deg)';
    // Reset piece rotation
    board.querySelectorAll('img').forEach(img => {
      img.style.transform = 'rotate(0deg)';
    });
  }
}

// Resign
function resign() {
  if (confirm('Are you sure you want to resign?')) {
    // Determine who won by resignation (the player who didn't resign wins)
    const myColor = playerRole === 'host' ? currentRoom.hostColor : currentRoom.guestColor;
    const winnerColor = myColor === 'w' ? 'Black' : 'White';
    const winner = `${winnerColor} wins`;
    const reason = 'Resignation';
    
    // Show game over modal
    const modal = document.getElementById('game-over-modal');
    const title = document.getElementById('game-over-title');
    const message = document.getElementById('game-over-message');
    const winnerSpan = document.getElementById('winner');
    const endReason = document.getElementById('end-reason');
    
    title.textContent = 'Game Over';
    message.textContent = winner;
    winnerSpan.textContent = winner;
    endReason.textContent = reason;
    
    modal.style.display = 'block';
    
    // Stop timer
    if (gameTimer) {
      clearInterval(gameTimer);
    }
    
    // Send resignation to Firebase
    sendResignationToFirebase();
  }
}

// Leave game
function leaveGame() {
  if (confirm('Are you sure you want to leave the game?')) {
    // Clean up
    if (gameTimer) {
      clearInterval(gameTimer);
    }
    
    // Remove room data
    localStorage.removeItem('currentRoom');
    localStorage.removeItem('playerRole');
    
    // Redirect
    window.location.href = 'multiplayer.html';
  }
}

// Offer draw
function offerDraw() {
  if (confirm('Offer a draw to your opponent?')) {
    // Send draw offer to Firebase
    sendDrawOfferToFirebase();
  }
}

// Accept draw
function acceptDraw() {
  console.log('🤝 Draw accepted!');
  
  // Close the draw offer modal
  const modal = document.getElementById('draw-offer-modal');
  modal.style.display = 'none';
  
  // Show game over modal with draw result
  const gameOverModal = document.getElementById('game-over-modal');
  const title = document.getElementById('game-over-title');
  const message = document.getElementById('game-over-message');
  const winnerSpan = document.getElementById('winner');
  const endReason = document.getElementById('end-reason');
  
  title.textContent = 'Game Over';
  message.textContent = 'Draw';
  winnerSpan.textContent = 'Draw';
  endReason.textContent = 'Draw by agreement';
  
  gameOverModal.style.display = 'block';
  
  // Stop timer
  if (gameTimer) {
    clearInterval(gameTimer);
  }
  
  // Send draw acceptance to Firebase
  sendDrawResponseToFirebase('accepted');
}

// Decline draw
function declineDraw() {
  console.log('🤝 Draw declined!');
  
  // Close the draw offer modal
  const modal = document.getElementById('draw-offer-modal');
  modal.style.display = 'none';
  
  // Send draw decline to Firebase
  sendDrawResponseToFirebase('declined');
}

// Undo move
function undoMove() {
  // This would undo the last move (if allowed)
  console.log('Undo move');
}

// Next game
function nextGame() {
  console.log('🎮 Starting next game...');
  
  if (!currentRoom) {
    console.error('No current room found');
    return;
  }
  
  // Increment game number
  currentRoom.currentGame++;
  
  // Reset the chess game
  chess.reset();
  moveCount = 0;
  lastMove = null;
  selectedSquare = null;
  
  // Update game number display
  document.getElementById('game-number').textContent = `Game ${currentRoom.currentGame}`;
  
  // Update game status
  updateGameStatus();
  
  // Re-render the board
  renderBoard();
  
  // Update Firebase with new game number
  if (window.multiplayerServer) {
    const gameRef = window.multiplayerServer.database.ref(`rooms/${currentRoom.id}/currentGame`);
    gameRef.set(currentRoom.currentGame);
  }
  
  // Close the game over modal
  const modal = document.getElementById('game-over-modal');
  modal.style.display = 'none';
  
  console.log('✅ Next game started:', currentRoom.currentGame);
}

// Finish match
function finishMatch() {
  // Check if there are more games to play
  if (currentRoom && currentRoom.gamesCount > currentRoom.currentGame) {
    // Start next game
    nextGame();
  } else {
    // All games completed, go to home screen
    window.location.href = 'index.html';
  }
}

// Send move to Firebase
function sendMoveToFirebase(move) {
  if (!window.multiplayerServer || !currentRoom) {
    console.error('Cannot send move: multiplayer server or room not available');
    return;
  }
  
  const moveData = {
    from: move.from,
    to: move.to,
    piece: move.piece,
    color: move.color,
    san: move.san,
    timestamp: Date.now(),
    playerId: playerRole === 'host' ? currentRoom.hostId : currentRoom.guestId
  };
  
  console.log('📤 Sending move to Firebase:', moveData);
  
  const movesRef = window.multiplayerServer.database.ref(`rooms/${currentRoom.id}/moves`);
  movesRef.push(moveData).then(() => {
    console.log('✅ Move sent to Firebase successfully');
  }).catch((error) => {
    console.error('❌ Error sending move to Firebase:', error);
  });
}

// Apply move from Firebase
function applyMoveFromFirebase(move) {
  // Don't apply moves that we sent ourselves
  if (move.playerId === (playerRole === 'host' ? currentRoom.hostId : currentRoom.guestId)) {
    return;
  }
  
  console.log('📥 Applying move from Firebase:', move);
  
  // Apply the move to the local chess instance
  const result = chess.move({
    from: move.from,
    to: move.to,
    promotion: move.promotion || 'q'
  });
  
  if (result) {
    moveCount++;
    lastMove = result; // Store the last move
    
    // Play move sound
    playMoveSound(result);
    
    updateMoveHistory(result);
    renderBoard();
    updateGameStatus();
    
    // Check for game over
    if (chess.in_checkmate() || chess.in_draw() || chess.in_stalemate()) {
      handleGameOver();
    }
  } else {
    console.error('❌ Failed to apply move from Firebase:', move);
  }
}

// Update game state from Firebase
function updateGameFromFirebase(gameData) {
  console.log('🔄 Updating game state from Firebase:', gameData);
  
  // Update game number if changed
  if (gameData.gameNumber && gameData.gameNumber !== currentRoom.currentGame) {
    currentRoom.currentGame = gameData.gameNumber;
    document.getElementById('game-number').textContent = `Game ${gameData.gameNumber}`;
  }
  
  // Update game status if provided
  if (gameData.status) {
    updateGameStatus();
  }
}

// Handle game events from Firebase (resignation, draw offers, etc.)
function handleGameEventFromFirebase(event) {
  console.log('🎮 Handling game event from Firebase:', event);
  
  // Don't handle events that we sent ourselves
  if (event.playerId === (playerRole === 'host' ? currentRoom.hostId : currentRoom.guestId)) {
    console.log('⏭️ Ignoring our own event');
    return;
  }
  
  if (event.type === 'resignation') {
    console.log('🏳️ Opponent resigned!');
    
    // Determine who won by resignation (the NON-resigning player wins)
    const winnerColor = event.playerId === currentRoom.hostId ? 'Black' : 'White';
    const winner = `${winnerColor} wins`;
    const reason = 'Resignation';
    
    // Show game over modal
    const modal = document.getElementById('game-over-modal');
    const title = document.getElementById('game-over-title');
    const message = document.getElementById('game-over-message');
    const winnerSpan = document.getElementById('winner');
    const endReason = document.getElementById('end-reason');
    
    title.textContent = 'Game Over';
    message.textContent = winner;
    winnerSpan.textContent = winner;
    endReason.textContent = reason;
    
    modal.style.display = 'block';
    
    // Stop timer
    if (gameTimer) {
      clearInterval(gameTimer);
    }
  } else if (event.type === 'draw_offer') {
    console.log('🤝 Draw offer received!');
    // Show draw offer modal
    const modal = document.getElementById('draw-offer-modal');
    modal.style.display = 'block';
  } else if (event.type === 'draw_response') {
    console.log('🤝 Draw response received:', event.response);
    
    if (event.response === 'accepted') {
      // Draw was accepted by opponent
      console.log('🤝 Draw accepted by opponent!');
      
      // Close any open draw offer modal
      const drawModal = document.getElementById('draw-offer-modal');
      drawModal.style.display = 'none';
      
      // Show game over modal with draw result
      const gameOverModal = document.getElementById('game-over-modal');
      const title = document.getElementById('game-over-title');
      const message = document.getElementById('game-over-message');
      const winnerSpan = document.getElementById('winner');
      const endReason = document.getElementById('end-reason');
      
      title.textContent = 'Game Over';
      message.textContent = 'Draw';
      winnerSpan.textContent = 'Draw';
      endReason.textContent = 'Draw by agreement';
      
      gameOverModal.style.display = 'block';
      
      // Stop timer
      if (gameTimer) {
        clearInterval(gameTimer);
      }
    } else if (event.response === 'declined') {
      // Draw was declined by opponent
      console.log('🤝 Draw declined by opponent!');
      alert('Your opponent declined the draw offer.');
    }
  }
}

// Send resignation to Firebase
function sendResignationToFirebase() {
  if (!window.multiplayerServer || !currentRoom) {
    console.error('Cannot send resignation: multiplayer server or room not available');
    return;
  }
  
  const resignationData = {
    type: 'resignation',
    playerId: playerRole === 'host' ? currentRoom.hostId : currentRoom.guestId,
    timestamp: Date.now()
  };
  
  console.log('📤 Sending resignation to Firebase:', resignationData);
  
  const gameRef = window.multiplayerServer.database.ref(`rooms/${currentRoom.id}/gameEvents`);
  gameRef.push(resignationData).then(() => {
    console.log('✅ Resignation sent to Firebase successfully');
  }).catch((error) => {
    console.error('❌ Error sending resignation to Firebase:', error);
  });
}

// Send draw offer to Firebase
function sendDrawOfferToFirebase() {
  if (!window.multiplayerServer || !currentRoom) {
    console.error('Cannot send draw offer: multiplayer server or room not available');
    return;
  }
  
  const drawOfferData = {
    type: 'draw_offer',
    playerId: playerRole === 'host' ? currentRoom.hostId : currentRoom.guestId,
    timestamp: Date.now()
  };
  
  console.log('📤 Sending draw offer to Firebase:', drawOfferData);
  
  const gameRef = window.multiplayerServer.database.ref(`rooms/${currentRoom.id}/gameEvents`);
  gameRef.push(drawOfferData).then(() => {
    console.log('✅ Draw offer sent to Firebase successfully');
    alert('Draw offer sent to your opponent!');
  }).catch((error) => {
    console.error('❌ Error sending draw offer to Firebase:', error);
  });
}

// Send draw response to Firebase
function sendDrawResponseToFirebase(response) {
  if (!window.multiplayerServer || !currentRoom) {
    console.error('Cannot send draw response: multiplayer server or room not available');
    return;
  }
  
  const drawResponseData = {
    type: 'draw_response',
    response: response, // 'accepted' or 'declined'
    playerId: playerRole === 'host' ? currentRoom.hostId : currentRoom.guestId,
    timestamp: Date.now()
  };
  
  console.log('📤 Sending draw response to Firebase:', drawResponseData);
  
  const gameRef = window.multiplayerServer.database.ref(`rooms/${currentRoom.id}/gameEvents`);
  gameRef.push(drawResponseData).then(() => {
    console.log('✅ Draw response sent to Firebase successfully');
  }).catch((error) => {
    console.error('❌ Error sending draw response to Firebase:', error);
  });
}

// Clean up on page unload
window.addEventListener('beforeunload', function() {
  if (gameTimer) {
    clearInterval(gameTimer);
  }
});
