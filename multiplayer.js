// Multiplayer navigation
document.addEventListener('DOMContentLoaded', function() {
  const createRoomBtn = document.getElementById('create-room-btn');
  const joinRoomBtn = document.getElementById('join-room-btn');
  const backBtn = document.getElementById('back-btn');

  createRoomBtn.addEventListener('click', function() {
    window.location.href = 'create-room.html';
  });

  joinRoomBtn.addEventListener('click', function() {
    window.location.href = 'join-room.html';
  });

  backBtn.addEventListener('click', function() {
    window.location.href = 'index.html';
  });
});
