// Firebase-based multiplayer server
// This provides real cross-computer multiplayer functionality

class FirebaseMultiplayer {
  constructor() {
    console.log('FirebaseMultiplayer constructor called');
    console.log('window.firebaseDatabase:', window.firebaseDatabase);
    
    if (!window.firebaseDatabase) {
      throw new Error('Firebase database not available');
    }
    
    this.database = window.firebaseDatabase;
    this.roomsRef = this.database.ref('rooms');
    console.log('roomsRef created:', this.roomsRef);
    
    // Don't set up listeners immediately - do it after a delay
    setTimeout(() => {
      this.setupListeners();
    }, 100);
  }

  // Set up Firebase listeners
  setupListeners() {
    // Listen for room changes
    this.roomsRef.on('value', (snapshot) => {
      const rooms = snapshot.val() || {};
      console.log('Rooms updated from Firebase:', rooms);
    });
  }

  // Create a new room
  createRoom(roomData) {
    console.log('createRoom called with data:', roomData);
    console.log('this.roomsRef:', this.roomsRef);
    
    if (!this.roomsRef) {
      return Promise.reject(new Error('Rooms reference not initialized'));
    }
    
    const roomId = this.generateRoomId();
    const room = {
      ...roomData,
      id: roomId,
      createdAt: Date.now(),
      status: 'waiting',
      hostId: this.generatePlayerId(),
      guestId: null,
      gameData: null
    };
    
    console.log('Room object to save:', room);
    
    // Save to Firebase
    return this.roomsRef.child(roomId).set(room).then(() => {
      console.log('Room created in Firebase successfully:', room);
      return room;
    }).catch((error) => {
      console.error('Error saving room to Firebase:', error);
      throw error;
    });
  }

  // Get all public rooms
  getPublicRooms() {
    return this.roomsRef.once('value').then((snapshot) => {
      const rooms = snapshot.val() || {};
      const publicRooms = Object.values(rooms).filter(room => 
        room.roomType === 'public' && 
        room.status === 'waiting' && 
        !room.guestId
      );
      console.log('Getting public rooms from Firebase:', publicRooms);
      return publicRooms;
    });
  }

  // Find room by code
  findRoomByCode(code) {
    return this.roomsRef.once('value').then((snapshot) => {
      const rooms = snapshot.val() || {};
      const room = Object.values(rooms).find(room => 
        room.roomCode === code && 
        room.roomType === 'private' && 
        room.status === 'waiting'
      );
      return room || null;
    });
  }

  // Join a room
  joinRoom(roomId, playerId) {
    const roomRef = this.roomsRef.child(roomId);
    return roomRef.once('value').then((snapshot) => {
      const room = snapshot.val();
      if (room && !room.guestId) {
        room.guestId = playerId;
        room.status = 'ready';
        return roomRef.update({
          guestId: playerId,
          status: 'ready'
        }).then(() => {
          console.log('Player joined room:', roomId);
          return room;
        });
      }
      return null;
    });
  }

  // Get room by ID
  getRoom(roomId) {
    return this.roomsRef.child(roomId).once('value').then((snapshot) => {
      return snapshot.val();
    });
  }

  // Update room status
  updateRoomStatus(roomId, status) {
    const roomRef = this.roomsRef.child(roomId);
    return roomRef.update({ status }).then(() => {
      console.log('Room status updated:', roomId, status);
      return this.getRoom(roomId);
    });
  }

  // Remove room
  removeRoom(roomId) {
    return this.roomsRef.child(roomId).remove().then(() => {
      console.log('Room removed:', roomId);
    });
  }

  // Update game data
  updateGameData(roomId, gameData) {
    const roomRef = this.roomsRef.child(roomId);
    return roomRef.update({ gameData }).then(() => {
      console.log('Game data updated:', roomId);
    });
  }

  // Listen for room changes
  listenToRoom(roomId, callback) {
    const roomRef = this.roomsRef.child(roomId);
    roomRef.on('value', (snapshot) => {
      const room = snapshot.val();
      if (room) {
        callback(room);
      }
    });
    
    // Return unsubscribe function
    return () => roomRef.off('value');
  }

  // Listen for public rooms changes
  listenToPublicRooms(callback) {
    const publicRoomsRef = this.roomsRef.orderByChild('roomType').equalTo('public');
    publicRoomsRef.on('value', (snapshot) => {
      const rooms = snapshot.val() || {};
      const publicRooms = Object.values(rooms).filter(room => 
        room.status === 'waiting' && !room.guestId
      );
      callback(publicRooms);
    });
    
    // Return unsubscribe function
    return () => publicRoomsRef.off('value');
  }

  // Generate unique room ID
  generateRoomId() {
    return 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Generate unique player ID
  generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Clean up old rooms (older than 1 hour)
  cleanupOldRooms() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return this.roomsRef.once('value').then((snapshot) => {
      const rooms = snapshot.val() || {};
      const updates = {};
      
      Object.keys(rooms).forEach(roomId => {
        if (rooms[roomId].createdAt < oneHourAgo) {
          updates[roomId] = null; // Mark for deletion
        }
      });
      
      if (Object.keys(updates).length > 0) {
        return this.roomsRef.update(updates);
      }
    });
  }
}

// Create global server instance
function initializeMultiplayerServer() {
  console.log('Attempting to initialize multiplayer server...');
  console.log('Firebase database available:', typeof window.firebaseDatabase);
  console.log('Firebase available:', typeof firebase);
  console.log('window.firebaseDatabase:', window.firebaseDatabase);
  
  if (window.firebaseDatabase && typeof window.firebaseDatabase.ref === 'function') {
    try {
      console.log('Creating FirebaseMultiplayer instance...');
      window.multiplayerServer = new FirebaseMultiplayer();
      console.log('Multiplayer server initialized successfully');
      console.log('window.multiplayerServer:', window.multiplayerServer);
    } catch (error) {
      console.error('Error initializing multiplayer server:', error);
      console.error('Error stack:', error.stack);
      setTimeout(initializeMultiplayerServer, 200);
    }
  } else {
    console.error('Firebase database not available or not properly initialized');
    console.error('window.firebaseDatabase type:', typeof window.firebaseDatabase);
    console.error('window.firebaseDatabase value:', window.firebaseDatabase);
    if (window.firebaseDatabase) {
      console.error('window.firebaseDatabase.ref type:', typeof window.firebaseDatabase.ref);
    }
    // Try again after a short delay
    setTimeout(initializeMultiplayerServer, 200);
  }
}

// Wait for all scripts to load, then initialize
window.addEventListener('load', function() {
  console.log('Window loaded, initializing multiplayer server...');
  setTimeout(initializeMultiplayerServer, 100);
});

// Clean up old rooms every 5 minutes
setInterval(() => {
  if (window.multiplayerServer) {
    window.multiplayerServer.cleanupOldRooms();
  }
}, 5 * 60 * 1000);

