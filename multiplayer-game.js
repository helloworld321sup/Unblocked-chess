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

// Apply board color from settings
function applyBoardColor() {
  const boardColor = localStorage.getItem('boardColor') || '#d67959';
  document.documentElement.style.setProperty('--black-square-color', boardColor);
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
}

// Handle square clicks
function handleSquareClick(event) {
  console.log('🎯 Square clicked!', event.target);
  
  const row = parseInt(event.target.dataset.row);
  const col = parseInt(event.target.dataset.col);
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
      updateMoveHistory(result);
      renderBoard();
      updateGameStatus();
      
      // Send move to Firebase
      sendMoveToFirebase(result);
      
      // Check for game over
      if (chess.isGameOver()) {
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
  
  if (squareElement) {
    squareElement.classList.add('selected');
    selectedSquare = square;
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
  const modal = document.getElementById('game-over-modal');
  const title = document.getElementById('game-over-title');
  const message = document.getElementById('game-over-message');
  const winner = document.getElementById('winner');
  const endReason = document.getElementById('end-reason');
  
  let result = '';
  let reason = '';
  
  if (chess.isCheckmate()) {
    result = chess.turn() === 'w' ? 'Black wins' : 'White wins';
    reason = 'Checkmate';
  } else if (chess.isDraw()) {
    result = 'Draw';
    reason = 'Draw';
  } else if (chess.isStalemate()) {
    result = 'Draw';
    reason = 'Stalemate';
  }
  
  title.textContent = 'Game Over';
  message.textContent = result;
  winner.textContent = result;
  endReason.textContent = reason;
  
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
  
  // Leave game
  document.getElementById('leave-game-btn').addEventListener('click', leaveGame);
  
  // Offer draw
  document.getElementById('offer-draw-btn').addEventListener('click', offerDraw);
  
  // Undo move
  document.getElementById('undo-move-btn').addEventListener('click', undoMove);
  
  // Game over modal buttons
  document.getElementById('next-game-btn').addEventListener('click', nextGame);
  document.getElementById('finish-match-btn').addEventListener('click', finishMatch);
  document.getElementById('rematch-btn').addEventListener('click', rematch);
}

// Flip board
function flipBoard() {
  boardFlipped = !boardFlipped;
  
  // Rotate the board 180 degrees
  if (boardFlipped) {
    board.style.transform = 'rotate(180deg)';
  } else {
    board.style.transform = 'rotate(0deg)';
  }
}

// Resign
function resign() {
  if (confirm('Are you sure you want to resign?')) {
    // Set the game as resigned
    const winner = chess.turn() === 'w' ? 'Black wins' : 'White wins';
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
  // This would send a draw offer to the opponent
  console.log('Offer draw');
}

// Undo move
function undoMove() {
  // This would undo the last move (if allowed)
  console.log('Undo move');
}

// Next game
function nextGame() {
  // This would start the next game in the match
  console.log('Next game');
}

// Finish match
function finishMatch() {
  // This would end the match and show results
  console.log('Finish match');
}

// Rematch
function rematch() {
  // This would start a new match with the same opponent
  console.log('Rematch');
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
    updateMoveHistory(result);
    renderBoard();
    updateGameStatus();
    
    // Check for game over
    if (chess.isGameOver()) {
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

// Clean up on page unload
window.addEventListener('beforeunload', function() {
  if (gameTimer) {
    clearInterval(gameTimer);
  }
});
