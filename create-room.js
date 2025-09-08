// Create Room functionality
document.addEventListener('DOMContentLoaded', function() {
  const gamesCountSelect = document.getElementById('games-count');
  const firstPlayerSelect = document.getElementById('first-player');
  const sideRotationSelect = document.getElementById('side-rotation');
  const roomTypeRadios = document.querySelectorAll('input[name="room-type"]');
  const roomCodeGroup = document.getElementById('room-code-group');
  const roomCodeInput = document.getElementById('room-code');
  const generateCodeBtn = document.getElementById('generate-code-btn');
  const launchRoomBtn = document.getElementById('launch-room-btn');
  const backBtn = document.getElementById('back-btn');
  const roomInfo = document.getElementById('room-info');
  const displayCode = document.getElementById('display-code');

  // Handle room type change
  roomTypeRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.value === 'private') {
        roomCodeGroup.style.display = 'block';
        roomCodeInput.required = true;
      } else {
        roomCodeGroup.style.display = 'none';
        roomCodeInput.required = false;
      }
    });
  });

  // Generate random room code
  generateCodeBtn.addEventListener('click', function() {
    const code = generateRoomCode();
    roomCodeInput.value = code;
  });

  // Launch room
  launchRoomBtn.addEventListener('click', function() {
    const roomSettings = {
      gamesCount: parseInt(gamesCountSelect.value),
      firstPlayer: firstPlayerSelect.value,
      sideRotation: sideRotationSelect.value,
      roomType: document.querySelector('input[name="room-type"]:checked').value,
      roomCode: roomCodeInput.value || null
    };

    // Validate private room code
    if (roomSettings.roomType === 'private') {
      if (!roomSettings.roomCode || roomSettings.roomCode.length < 4) {
        alert('Please enter a room code with at least 4 characters');
        return;
      }
    }

    // Create room using server
    const room = window.multiplayerServer.createRoom(roomSettings);
    
    // Store current room info for this session
    localStorage.setItem('currentRoom', JSON.stringify(room));
    localStorage.setItem('playerRole', 'host');

    // Show room info for private rooms
    if (room.roomType === 'private') {
      displayCode.textContent = room.roomCode;
      roomInfo.style.display = 'block';
      
      // Auto-redirect after 3 seconds
      setTimeout(() => {
        window.location.href = 'waiting-room.html';
      }, 3000);
    } else {
      // Direct redirect for public rooms
      window.location.href = 'waiting-room.html';
    }
  });

  // Back button
  backBtn.addEventListener('click', function() {
    window.location.href = 'multiplayer.html';
  });

  // Helper functions
  function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function generateRoomId() {
    return 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
});
