// Color selection navigation
document.addEventListener('DOMContentLoaded', function() {
  const playWhiteBtn = document.getElementById('play-white-btn');
  const playBlackBtn = document.getElementById('play-black-btn');
  const backBtn = document.getElementById('back-btn');

  playWhiteBtn.addEventListener('click', function() {
    // Store the player color choice and redirect to bot play
    localStorage.setItem('playerColor', 'white');
    window.location.href = 'bot-play.html';
  });

  playBlackBtn.addEventListener('click', function() {
    // Store the player color choice and redirect to bot play
    localStorage.setItem('playerColor', 'black');
    window.location.href = 'bot-play.html';
  });

  backBtn.addEventListener('click', function() {
    window.location.href = 'index.html';
  });
});
