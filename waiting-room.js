// Waiting Room functionality
document.addEventListener('DOMContentLoaded', function() {
  const roomTitle = document.getElementById('room-title');
  const gamesCount = document.getElementById('games-count');
  const firstPlayer = document.getElementById('first-player');
  const sideRotation = document.getElementById('side-rotation');
  const roomType = document.getElementById('room-type');
  const roomCodeDisplay = document.getElementById('room-code-display');
  const roomCode = document.getElementById('room-code');
  const guestPlayer = document.getElementById('guest-player');
  const hostWaiting = document.getElementById('host-waiting');
  const guestWaiting = document.getElementById('guest-waiting');
  const readyToStart = document.getElementById('ready-to-start');
  const shareSection = document.getElementById('share-section');
  const shareCode = document.getElementById('share-code');
  const copyCodeBtn = document.getElementById('copy-code-btn');
  const startGameBtn = document.getElementById('start-game-btn');
  const leaveRoomBtn = document.getElementById('leave-room-btn');

  let currentRoom = null;
  let playerRole = null;
  let checkInterval = null;

  // Load room data
  loadRoomData();

  // Event listeners
  copyCodeBtn.addEventListener('click', copyRoomCode);
  startGameBtn.addEventListener('click', startGame);
  leaveRoomBtn.addEventListener('click', leaveRoom);

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

    // Display room information
    displayRoomInfo();
    
    // Set up waiting screen based on role
    setupWaitingScreen();
    
    // Start checking for room updates
    startRoomCheck();
  }

  // Display room information
  function displayRoomInfo() {
    roomTitle.textContent = `Room ${currentRoom.id.slice(-6)}`;
    gamesCount.textContent = `${currentRoom.gamesCount} game${currentRoom.gamesCount > 1 ? 's' : ''}`;
    firstPlayer.textContent = currentRoom.firstPlayer;
    sideRotation.textContent = currentRoom.sideRotation;
    roomType.textContent = currentRoom.roomType;

    // Show room code for private rooms
    if (currentRoom.roomType === 'private' && currentRoom.roomCode) {
      roomCodeDisplay.style.display = 'block';
      roomCode.textContent = currentRoom.roomCode;
      shareCode.textContent = currentRoom.roomCode;
    }
  }

  // Set up waiting screen based on player role
  function setupWaitingScreen() {
    if (playerRole === 'host') {
      hostWaiting.style.display = 'block';
      guestWaiting.style.display = 'none';
      readyToStart.style.display = 'none';
      
      if (currentRoom.roomType === 'private') {
        shareSection.style.display = 'block';
      }
    } else {
      hostWaiting.style.display = 'none';
      guestWaiting.style.display = 'block';
      readyToStart.style.display = 'none';
      shareSection.style.display = 'none';
    }
  }

  // Start checking for room updates
  function startRoomCheck() {
    checkInterval = setInterval(checkRoomStatus, 2000);
  }

  // Check room status for updates
  function checkRoomStatus() {
    window.multiplayerServer.getRoom(currentRoom.id).then((room) => {
      if (!room) {
        // Room was deleted
        alert('Room no longer exists. Redirecting to multiplayer.');
        window.location.href = 'multiplayer.html';
        return;
      }

      // Update current room data
      currentRoom = room;
      localStorage.setItem('currentRoom', JSON.stringify(currentRoom));

    // Check if guest joined
    if (room.guestId && !guestPlayer.style.display || guestPlayer.style.display === 'none') {
      guestPlayer.style.display = 'block';
      guestPlayer.querySelector('.player-status').className = 'player-status online';
      
      if (playerRole === 'host') {
        // Host sees ready to start
        hostWaiting.style.display = 'none';
        readyToStart.style.display = 'block';
        startGameBtn.style.display = 'inline-block';
      } else {
        // Guest sees waiting for host
        guestWaiting.style.display = 'block';
      }
    }

      // Check if game started
      if (room.status === 'playing') {
        clearInterval(checkInterval);
        window.location.href = 'multiplayer-game.html';
      }
    }).catch((error) => {
      console.error('Error checking room status:', error);
    });
  }

  // Copy room code to clipboard
  function copyRoomCode() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentRoom.roomCode).then(() => {
        copyCodeBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyCodeBtn.textContent = 'Copy Code';
        }, 2000);
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = currentRoom.roomCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      copyCodeBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyCodeBtn.textContent = 'Copy Code';
      }, 2000);
    }
  }

  // Start the game
  function startGame() {
    if (playerRole !== 'host') return;

    // Check if there's a guest in the room (currentRoom is already updated by checkRoomStatus)
    if (!currentRoom.guestId) {
      alert('Please wait for an opponent to join before starting the game.');
      return;
    }

      // Update room status to playing
      window.multiplayerServer.updateRoomStatus(currentRoom.id, 'playing').then((updatedRoom) => {
        if (updatedRoom) {
          updatedRoom.currentGame = 1;
          updatedRoom.gameHistory = [];
          
          // Update current room
          currentRoom = updatedRoom;
          localStorage.setItem('currentRoom', JSON.stringify(currentRoom));
        
          // Redirect to game
          window.location.href = 'multiplayer-game.html';
        }
      }).catch((error) => {
        console.error('Error starting game:', error);
        alert('Failed to start game. Please try again.');
      });
    }).catch((error) => {
      console.error('Error getting room data:', error);
      alert('Failed to get room data. Please try again.');
    });
  }

  // Leave the room
  function leaveRoom() {
    if (confirm('Are you sure you want to leave the room?')) {
      // Clean up room if host leaves
      if (playerRole === 'host') {
        window.multiplayerServer.removeRoom(currentRoom.id).then(() => {
          console.log('Room removed successfully');
        }).catch((error) => {
          console.error('Error removing room:', error);
        });
      }
      
      // Clear session data
      localStorage.removeItem('currentRoom');
      localStorage.removeItem('playerRole');
      
      // Stop checking
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      
      // Redirect to multiplayer
      window.location.href = 'multiplayer.html';
    }
  }

  // Clean up on page unload
  window.addEventListener('beforeunload', function() {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
  });
});
