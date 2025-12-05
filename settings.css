// Settings management
document.addEventListener('DOMContentLoaded', function() {
  // Get elements
  const colorOptions = document.querySelectorAll('.color-option');
  const soundToggle = document.getElementById('sound-toggle');
  const pieceOptions = document.querySelectorAll('.piece-option');
  // Updated: Selects the new button as well
  const difficultyOptions = document.querySelectorAll('.difficulty-option'); 
  const resetBtn = document.getElementById('reset-settings');
  const backBtn = document.getElementById('back-to-home');

  // Load saved settings
  loadSettings();

  // ... (Color selection, Sound toggle, Piece style selection logic remains the same) ...

  // Difficulty selection
  difficultyOptions.forEach(option => {
    option.addEventListener('click', function() {
      // Remove active class from all options
      difficultyOptions.forEach(opt => opt.classList.remove('active'));
      // Add active class to selected option
      this.classList.add('active');
      // Save setting
      localStorage.setItem('botDifficulty', this.dataset.difficulty);
      // Apply setting immediately
      applyDifficulty(this.dataset.difficulty);
    });
  });

  // ... (Reset settings and Back to home logic remains the same) ...

  // Load settings from localStorage
  function loadSettings() {
    // ... (Load board color, sound, and piece style logic remains the same) ...

    // Load difficulty
    // Changed default from 'medium' to 'idiot'
    const difficulty = localStorage.getItem('botDifficulty') || 'idiot'; 
    const difficultyOption = document.querySelector(`[data-difficulty="${difficulty}"]`);
    if (difficultyOption) {
      difficultyOption.classList.add('active');
      applyDifficulty(difficulty);
    }
  }

  // ... (applyBoardColor, applySoundSetting, applyPieceStyle functions remain the same) ...

  // Apply difficulty setting
  function applyDifficulty(difficulty) {
    // This will be used by the bot-play page to set AI difficulty
    window.botDifficulty = difficulty;
  }

  // ... (resetToDefaults function remains the same) ...
});

// Export functions for use by other pages
// ... (getBoardColor, getSoundEnabled, getPieceStyle functions remain the same) ...

window.getBotDifficulty = function() {
  // Changed default from 'medium' to 'idiot'
  return localStorage.getItem('botDifficulty') || 'idiot'; 
};

// ... (getPieceImages function remains the same) ...
