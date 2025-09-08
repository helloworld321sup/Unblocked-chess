// Join Room functionality
document.addEventListener('DOMContentLoaded', function() {
  const publicRoomsList = document.getElementById('public-rooms');
  const noPublicRooms = document.getElementById('no-public-rooms');
  const refreshPublicBtn = document.getElementById('refresh-public-btn');
  const privateRoomCodeInput = document.getElementById('private-room-code');
  const joinPrivateBtn = document.getElementById('join-private-btn');
  const backBtn = document.getElementById('back-btn');
  const roomDetailsModal = document.getElementById('room-details-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const confirmJoinBtn = document.getElementById('confirm-join-btn');
  const cancelJoinBtn = document.getElementById('cancel-join-btn');

  let selectedRoom = null;

  // Load public rooms on page load
  loadPublicRooms();

  // Refresh public rooms
  refreshPublicBtn.addEventListener('click', loadPublicRooms);

  // Join private room
  joinPrivateBtn.addEventListener('click', function() {
    const roomCode = privateRoomCodeInput.value.trim().toUpperCase();
    if (!roomCode) {
      alert('Please enter a room code');
      return;
    }

    const rooms = JSON.parse(localStorage.getItem('multiplayerRooms') || '[]');
    const room = rooms.find(r => r.roomCode === roomCode && r.roomType === 'private' && r.status === 'waiting');
    
    if (room) {
      selectedRoom = room;
      showRoomDetails(room);
    } else {
      alert('Room not found or already full. Please check the code and try again.');
    }
  });

  // Modal controls
  closeModalBtn.addEventListener('click', closeModal);
  cancelJoinBtn.addEventListener('click', closeModal);
  confirmJoinBtn.addEventListener('click', joinSelectedRoom);

  // Back button
  backBtn.addEventListener('click', function() {
    window.location.href = 'multiplayer.html';
  });

  // Load and display public rooms
  function loadPublicRooms() {
    const rooms = JSON.parse(localStorage.getItem('multiplayerRooms') || '[]');
    const publicRooms = rooms.filter(room => 
      room.roomType === 'public' && 
      room.status === 'waiting' &&
      !room.guestId // Room is not full
    );

    publicRoomsList.innerHTML = '';

    if (publicRooms.length === 0) {
      noPublicRooms.style.display = 'block';
    } else {
      noPublicRooms.style.display = 'none';
      
      publicRooms.forEach(room => {
        const roomElement = createRoomElement(room);
        publicRoomsList.appendChild(roomElement);
      });
    }
  }

  // Create room element for display
  function createRoomElement(room) {
    const roomDiv = document.createElement('div');
    roomDiv.className = 'room-item';
    roomDiv.innerHTML = `
      <div class="room-info">
        <h4>Room ${room.roomId.slice(-6)}</h4>
        <p>${room.gamesCount} game${room.gamesCount > 1 ? 's' : ''} • ${room.firstPlayer} plays white first</p>
        <p>Side rotation: ${room.sideRotation}</p>
      </div>
      <button class="join-room-btn" data-room-id="${room.roomId}">Join</button>
    `;

    // Add click handler
    const joinBtn = roomDiv.querySelector('.join-room-btn');
    joinBtn.addEventListener('click', function() {
      selectedRoom = room;
      showRoomDetails(room);
    });

    return roomDiv;
  }

  // Show room details modal
  function showRoomDetails(room) {
    document.getElementById('modal-games-count').textContent = `${room.gamesCount} game${room.gamesCount > 1 ? 's' : ''}`;
    document.getElementById('modal-first-player').textContent = room.firstPlayer;
    document.getElementById('modal-side-rotation').textContent = room.sideRotation;
    document.getElementById('modal-room-type').textContent = room.roomType;
    
    roomDetailsModal.style.display = 'block';
  }

  // Close modal
  function closeModal() {
    roomDetailsModal.style.display = 'none';
    selectedRoom = null;
  }

  // Join the selected room
  function joinSelectedRoom() {
    if (!selectedRoom) return;

    // Add guest to room
    const rooms = JSON.parse(localStorage.getItem('multiplayerRooms') || '[]');
    const roomIndex = rooms.findIndex(r => r.roomId === selectedRoom.roomId);
    
    if (roomIndex !== -1) {
      rooms[roomIndex].guestId = generatePlayerId();
      rooms[roomIndex].status = 'ready';
      localStorage.setItem('multiplayerRooms', JSON.stringify(rooms));
      
      // Store current room info for this session
      localStorage.setItem('currentRoom', JSON.stringify(rooms[roomIndex]));
      localStorage.setItem('playerRole', 'guest');
      
      // Redirect to waiting room
      window.location.href = 'waiting-room.html';
    } else {
      alert('Room no longer available');
    }
  }

  // Helper function
  function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Auto-refresh public rooms every 5 seconds
  setInterval(loadPublicRooms, 5000);
});
