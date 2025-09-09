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

  // Set up real-time listener for room changes
  if (window.multiplayerServer && window.multiplayerServer.roomsRef) {
    console.log('🔔 Setting up real-time room listener...');
    window.multiplayerServer.roomsRef.on('value', (snapshot) => {
      console.log('🔄 Rooms changed, refreshing display...');
      loadPublicRooms();
    });
  }

  // Refresh public rooms
  refreshPublicBtn.addEventListener('click', loadPublicRooms);

  // Join private room
  joinPrivateBtn.addEventListener('click', function() {
    const roomCode = privateRoomCodeInput.value.trim().toUpperCase();
    if (!roomCode) {
      alert('Please enter a room code');
      return;
    }

    window.multiplayerServer.findRoomByCode(roomCode).then((room) => {
      if (room) {
        selectedRoom = room;
        showRoomDetails(room);
      } else {
        alert('Room not found or already full. Please check the code and try again.');
      }
    }).catch((error) => {
      console.error('Error finding room:', error);
      alert('Error finding room. Please try again.');
    });
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
    console.log('🔍 Loading public rooms...');
    console.log('📊 publicRoomsList element:', publicRoomsList);
    console.log('📊 noPublicRooms element:', noPublicRooms);
    
    window.multiplayerServer.getPublicRooms().then((publicRooms) => {
      console.log('📋 Public rooms received:', publicRooms);
      console.log('📊 Number of rooms:', publicRooms.length);
      
      // Clear the rooms list
      publicRoomsList.innerHTML = '';
      console.log('🧹 Cleared publicRoomsList');

      if (publicRooms.length === 0) {
        console.log('❌ No public rooms available');
        noPublicRooms.style.display = 'block';
        console.log('📊 noPublicRooms display set to block');
      } else {
        console.log(`✅ Found ${publicRooms.length} public rooms`);
        noPublicRooms.style.display = 'none';
        console.log('📊 noPublicRooms display set to none');
        
        publicRooms.forEach((room, index) => {
          console.log(`🏠 Adding room ${index + 1} to list:`, room);
          const roomElement = createRoomElement(room);
          publicRoomsList.appendChild(roomElement);
          console.log(`📊 Room ${index + 1} added to DOM`);
        });
        
        console.log('📊 Final publicRoomsList children count:', publicRoomsList.children.length);
        console.log('📊 Final publicRoomsList innerHTML length:', publicRoomsList.innerHTML.length);
      }
    }).catch((error) => {
      console.error('❌ Error loading public rooms:', error);
      noPublicRooms.style.display = 'block';
      noPublicRooms.innerHTML = '<p class="error">Error loading rooms</p>';
    });
  }

  // Create room element for display
  function createRoomElement(room) {
    console.log('🏗️ Creating room element for:', room);
    const roomDiv = document.createElement('div');
    roomDiv.className = 'room-item';
    roomDiv.innerHTML = `
      <div class="room-info">
        <h4>Room ${room.id.slice(-6)}</h4>
        <p>${room.gamesCount} game${room.gamesCount > 1 ? 's' : ''} • ${room.firstPlayer} plays white first</p>
        <p>Side rotation: ${room.sideRotation}</p>
      </div>
      <button class="join-room-btn" data-room-id="${room.id}">Join</button>
    `;

    // Add click handler
    const joinBtn = roomDiv.querySelector('.join-room-btn');
    joinBtn.addEventListener('click', function() {
      console.log('🎯 Join button clicked for room:', room.id);
      selectedRoom = room;
      showRoomDetails(room);
    });

    console.log('✅ Room element created:', roomDiv);
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

    // Join room using Firebase server
    const playerId = generatePlayerId();
    window.multiplayerServer.joinRoom(selectedRoom.id, playerId).then((updatedRoom) => {
      if (updatedRoom) {
        // Store current room info for this session
        localStorage.setItem('currentRoom', JSON.stringify(updatedRoom));
        localStorage.setItem('playerRole', 'guest');
        
        // Redirect to waiting room
        window.location.href = 'waiting-room.html';
      } else {
        alert('Room no longer available');
      }
    }).catch((error) => {
      console.error('Error joining room:', error);
      alert('Failed to join room. Please try again.');
    });
  }

  // Helper function
  function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Auto-refresh public rooms every 5 seconds
  setInterval(loadPublicRooms, 5000);
});
