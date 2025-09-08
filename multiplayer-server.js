// Mock multiplayer server using localStorage with shared keys
// This simulates a real server for testing purposes

class MultiplayerServer {
  constructor() {
    this.rooms = [];
    this.loadRooms();
  }

  // Load rooms from localStorage
  loadRooms() {
    const stored = localStorage.getItem('sharedMultiplayerRooms');
    if (stored) {
      this.rooms = JSON.parse(stored);
    }
  }

  // Save rooms to localStorage
  saveRooms() {
    localStorage.setItem('sharedMultiplayerRooms', JSON.stringify(this.rooms));
  }

  // Create a new room
  createRoom(roomData) {
    const room = {
      ...roomData,
      id: this.generateRoomId(),
      createdAt: Date.now(),
      status: 'waiting',
      hostId: this.generatePlayerId(),
      guestId: null
    };
    
    this.rooms.push(room);
    this.saveRooms();
    return room;
  }

  // Get all public rooms
  getPublicRooms() {
    return this.rooms.filter(room => 
      room.roomType === 'public' && 
      room.status === 'waiting' && 
      !room.guestId
    );
  }

  // Find room by code
  findRoomByCode(code) {
    return this.rooms.find(room => 
      room.roomCode === code && 
      room.roomType === 'private' && 
      room.status === 'waiting'
    );
  }

  // Join a room
  joinRoom(roomId, playerId) {
    const room = this.rooms.find(r => r.id === roomId);
    if (room && !room.guestId) {
      room.guestId = playerId;
      room.status = 'ready';
      this.saveRooms();
      return room;
    }
    return null;
  }

  // Get room by ID
  getRoom(roomId) {
    return this.rooms.find(r => r.id === roomId);
  }

  // Update room status
  updateRoomStatus(roomId, status) {
    const room = this.rooms.find(r => r.id === roomId);
    if (room) {
      room.status = status;
      this.saveRooms();
      return room;
    }
    return null;
  }

  // Remove room
  removeRoom(roomId) {
    this.rooms = this.rooms.filter(r => r.id !== roomId);
    this.saveRooms();
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
    this.rooms = this.rooms.filter(room => room.createdAt > oneHourAgo);
    this.saveRooms();
  }
}

// Create global server instance
window.multiplayerServer = new MultiplayerServer();

// Clean up old rooms every 5 minutes
setInterval(() => {
  window.multiplayerServer.cleanupOldRooms();
}, 5 * 60 * 1000);
