// Navigation for home page
document.addEventListener('DOMContentLoaded', function() {
  const twoPlayerBtn = document.getElementById('two-player-btn');
  const botPlayBtn = document.getElementById('bot-play-btn');
  const setupPositionBtn = document.getElementById('setup-position-btn');
  const settingsBtn = document.getElementById('settings-btn');

  twoPlayerBtn.addEventListener('click', function() {
    window.location.href = 'two-player.html';
  });

  botPlayBtn.addEventListener('click', function() {
    window.location.href = 'choose-color.html';
  });

  setupPositionBtn.addEventListener('click', function() {
    window.location.href = 'setup-position.html';
  });

  settingsBtn.addEventListener('click', function() {
    window.location.href = 'settings.html';
  });
});
