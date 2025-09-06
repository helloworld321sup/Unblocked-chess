// Settings management
document.addEventListener('DOMContentLoaded', function() {
  // Get elements
  const colorOptions = document.querySelectorAll('.color-option');
  const soundToggle = document.getElementById('sound-toggle');
  const pieceOptions = document.querySelectorAll('.piece-option');
  const difficultyOptions = document.querySelectorAll('.difficulty-option');
  const resetBtn = document.getElementById('reset-settings');
  const backBtn = document.getElementById('back-to-home');

  // Load saved settings
  loadSettings();

  // Color selection
  colorOptions.forEach(option => {
    option.addEventListener('click', function() {
      // Remove active class from all options
      colorOptions.forEach(opt => opt.classList.remove('active'));
      // Add active class to selected option
      this.classList.add('active');
      // Save setting
      localStorage.setItem('boardColor', this.dataset.color);
      // Apply setting immediately
      applyBoardColor(this.dataset.color);
    });
  });

  // Sound toggle
  soundToggle.addEventListener('change', function() {
    localStorage.setItem('soundEnabled', this.checked);
    // Apply setting immediately
    applySoundSetting(this.checked);
  });

  // Piece style selection
  pieceOptions.forEach(option => {
    option.addEventListener('click', function() {
      // Remove active class from all options
      pieceOptions.forEach(opt => opt.classList.remove('active'));
      // Add active class to selected option
      this.classList.add('active');
      // Save setting
      localStorage.setItem('pieceStyle', this.dataset.style);
      // Apply setting immediately
      applyPieceStyle(this.dataset.style);
    });
  });

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

  // Reset settings
  resetBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetToDefaults();
    }
  });

  // Back to home
  backBtn.addEventListener('click', function() {
    window.location.href = 'index.html';
  });

  // Load settings from localStorage
  function loadSettings() {
    // Load board color
    const savedColor = localStorage.getItem('boardColor') || '#4800ff';
    const colorOption = document.querySelector(`[data-color="${savedColor}"]`);
    if (colorOption) {
      colorOption.classList.add('active');
      applyBoardColor(savedColor);
    }

    // Load sound setting
    const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    soundToggle.checked = soundEnabled;
    applySoundSetting(soundEnabled);

    // Load piece style
    const pieceStyle = localStorage.getItem('pieceStyle') || 'classic';
    const pieceOption = document.querySelector(`[data-style="${pieceStyle}"]`);
    if (pieceOption) {
      pieceOption.classList.add('active');
      applyPieceStyle(pieceStyle);
    }

    // Load difficulty
    const difficulty = localStorage.getItem('botDifficulty') || 'medium';
    const difficultyOption = document.querySelector(`[data-difficulty="${difficulty}"]`);
    if (difficultyOption) {
      difficultyOption.classList.add('active');
      applyDifficulty(difficulty);
    }
  }

  // Apply board color setting
  function applyBoardColor(color) {
    document.documentElement.style.setProperty('--black-square-color', color);
  }

  // Apply sound setting
  function applySoundSetting(enabled) {
    // This will be used by the game pages to enable/disable sounds
    window.soundEnabled = enabled;
  }

  // Apply piece style setting
  function applyPieceStyle(style) {
    // This will be used by the game pages to load the correct piece images
    window.pieceStyle = style;
  }

  // Apply difficulty setting
  function applyDifficulty(difficulty) {
    // This will be used by the bot-play page to set AI difficulty
    window.botDifficulty = difficulty;
  }

  // Reset all settings to defaults
  function resetToDefaults() {
    localStorage.removeItem('boardColor');
    localStorage.removeItem('soundEnabled');
    localStorage.removeItem('pieceStyle');
    localStorage.removeItem('botDifficulty');
    
    // Reload the page to apply defaults
    location.reload();
  }
});

// Export functions for use by other pages
window.getBoardColor = function() {
  return localStorage.getItem('boardColor') || '#4800ff';
};

window.getSoundEnabled = function() {
  return localStorage.getItem('soundEnabled') !== 'false';
};

window.getPieceStyle = function() {
  return localStorage.getItem('pieceStyle') || 'classic';
};

window.getBotDifficulty = function() {
  return localStorage.getItem('botDifficulty') || 'medium';
};

window.getPieceImages = function() {
  const style = getPieceStyle();
  
  if (style === 'modern') {
    return {
      wP: "https://assets-themes.chess.com/image/ejgfv/150/wp.png",
      wR: "https://assets-themes.chess.com/image/ejgfv/150/wr.png",
      wN: "https://assets-themes.chess.com/image/ejgfv/150/wn.png",
      wB: "https://assets-themes.chess.com/image/ejgfv/150/wb.png",
      wQ: "https://assets-themes.chess.com/image/ejgfv/150/wq.png",
      wK: "https://assets-themes.chess.com/image/ejgfv/150/wk.png",
      bP: "https://assets-themes.chess.com/image/ejgfv/150/bp.png",
      bR: "https://assets-themes.chess.com/image/ejgfv/150/br.png",
      bN: "https://assets-themes.chess.com/image/ejgfv/150/bn.png",
      bB: "https://assets-themes.chess.com/image/ejgfv/150/bb.png",
      bQ: "https://assets-themes.chess.com/image/ejgfv/150/bq.png",
      bK: "https://assets-themes.chess.com/image/ejgfv/150/bk.png",
    };
  } else {
    // Classic pieces (default)
    return {
      wP: "https://static.stands4.com/images/symbol/3409_white-pawn.png",
      wR: "https://static.stands4.com/images/symbol/3406_white-rook.png",
      wN: "https://static.stands4.com/images/symbol/3408_white-knight.png",
      wB: "https://static.stands4.com/images/symbol/3407_white-bishop.png",
      wQ: "https://static.stands4.com/images/symbol/3405_white-queen.png",
      wK: "https://static.stands4.com/images/symbol/3404_white-king.png",
      bP: "https://static.stands4.com/images/symbol/3403_black-pawn.png",
      bR: "https://static.stands4.com/images/symbol/3400_black-rook.png",
      bN: "https://static.stands4.com/images/symbol/3402_black-knight.png",
      bB: "https://static.stands4.com/images/symbol/3401_black-bishop.png",
      bQ: "https://static.stands4.com/images/symbol/3399_black-queen.png",
      bK: "https://static.stands4.com/images/symbol/3398_black-king.png",
    };
  }
};
