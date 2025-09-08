// Firebase-based multiplayer server
// This provides real cross-computer multiplayer functionality

class FirebaseMultiplayer {
  constructor() {
    this.database = window.firebaseDatabase;
    this.roomsRef = this.database.ref('rooms');
    this.setupListeners();
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
    
    // Save to Firebase
    return this.roomsRef.child(roomId).set(room).then(() => {
      console.log('Room created in Firebase:', room);
      return room;
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
window.multiplayerServer = new FirebaseMultiplayer();

// Clean up old rooms every 5 minutes
setInterval(() => {
  window.multiplayerServer.cleanupOldRooms();
}, 5 * 60 * 1000);
