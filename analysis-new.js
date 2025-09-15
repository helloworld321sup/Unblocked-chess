// Analysis Page JavaScript - WintrChess Style
// Based on WintrCat/freechess implementation

let analysis = null;
let currentReport = null;

// Classification colors
const classificationColors = {
    'brilliant': '#ffd700',
    'great': '#ff6b35',
    'best': '#4a90e2',
    'excellent': '#4a90e2',
    'good': '#2ecc71',
    'inaccuracy': '#f39c12',
    'mistake': '#e74c3c',
    'blunder': '#e74c3c',
    'book': '#9b59b6',
    'forced': '#95a5a6'
};

// Classification icons
const classificationIcons = {
    'brilliant': '💎',
    'great': '⭐',
    'best': '✅',
    'excellent': '✅',
    'good': '👍',
    'inaccuracy': '⚠️',
    'mistake': '❌',
    'blunder': '💥',
    'book': '📖',
    'forced': '🔒'
};

document.addEventListener('DOMContentLoaded', function() {
    // Initialize analysis system
    analysis = new ChessAnalysis();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update depth display
    updateDepthDisplay();
});

function setupEventListeners() {
    // Depth slider
    const depthSlider = document.getElementById('depth-slider');
    const depthValue = document.getElementById('depth-value');
    
    depthSlider.addEventListener('input', function() {
        depthValue.textContent = this.value;
    });
    
    // Analyze button
    const analyzeBtn = document.getElementById('analyze-btn');
    analyzeBtn.addEventListener('click', analyzeGame);
}

function updateDepthDisplay() {
    const depthSlider = document.getElementById('depth-slider');
    const depthValue = document.getElementById('depth-value');
    depthValue.textContent = depthSlider.value;
}

async function analyzeGame() {
    const pgnInput = document.getElementById('pgn-input');
    const depthSlider = document.getElementById('depth-slider');
    const analyzeBtn = document.getElementById('analyze-btn');
    const progressSection = document.getElementById('progress-section');
    const resultsSection = document.getElementById('results-section');
    
    const pgn = pgnInput.value.trim();
    const depth = parseInt(depthSlider.value);
    
    // Validate input
    if (!pgn) {
        showError('Please enter a PGN to analyze.');
        return;
    }
    
    // Disable button and show progress
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';
    progressSection.style.display = 'block';
    resultsSection.style.display = 'none';
    
    try {
        // Update progress
        updateProgress(0, 'Parsing PGN...');
        
        // Analyze the game
        currentReport = await analysis.analyzeGame(pgn, depth);
        
        // Show results
        displayResults(currentReport);
        
        // Hide progress and show results
        progressSection.style.display = 'none';
        resultsSection.style.display = 'block';
        
    } catch (error) {
        console.error('Analysis error:', error);
        showError('Analysis failed. Please check your PGN and try again.');
    } finally {
        // Re-enable button
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze Game';
    }
}

function updateProgress(percentage, message) {
    const progressFill = document.getElementById('progress-fill');
    const statusMessage = document.getElementById('status-message');
    
    progressFill.style.width = `${percentage}%`;
    statusMessage.textContent = message;
}

function displayResults(report) {
    // Update accuracy display
    document.getElementById('white-accuracy').textContent = `${report.accuracies.white.toFixed(1)}%`;
    document.getElementById('black-accuracy').textContent = `${report.accuracies.black.toFixed(1)}%`;
    
    // Update classification stats
    displayClassificationStats(report.classifications);
}

function displayClassificationStats(classifications) {
    const container = document.getElementById('classification-stats');
    container.innerHTML = '';
    
    // Get classification types (excluding book and forced for display)
    const displayTypes = ['brilliant', 'great', 'best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder'];
    
    displayTypes.forEach(type => {
        const whiteCount = classifications.white[type] || 0;
        const blackCount = classifications.black[type] || 0;
        
        if (whiteCount > 0 || blackCount > 0) {
            const item = document.createElement('div');
            item.className = 'classification-item';
            
            item.innerHTML = `
                <div class="classification-name" style="color: ${classificationColors[type]}">
                    ${classificationIcons[type]} ${type.charAt(0).toUpperCase() + type.slice(1)}
                </div>
                <div class="classification-counts">
                    <span class="count-white">${whiteCount}</span>
                    <span class="count-black">${blackCount}</span>
                </div>
            `;
            
            container.appendChild(item);
        }
    });
}

function showError(message) {
    const statusMessage = document.getElementById('status-message');
    statusMessage.textContent = message;
    statusMessage.style.color = '#e74c3c';
    
    // Reset after 3 seconds
    setTimeout(() => {
        statusMessage.style.color = '#fff';
        statusMessage.textContent = 'Ready to analyze';
    }, 3000);
}

// Sample PGN for testing
function loadSampleGame() {
    const samplePGN = `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. c4 c6 12. cxb5 axb5 13. Nc3 Bb7 14. Bg5 b4 15. Nb1 h6 16. Bh4 c5 17. dxc5 Nxc5 18. Bxf6 Qxf6 19. Nbd2 Nxd3 20. cxd3 Bc5 21. Nc4 Bb6 22. a3 bxa3 23. Rxa3 Rxa3 24. bxa3 Qe6 25. Qd2 Qxa2 26. Nxd6 Qa1+ 27. Kh2 Qxe1 28. Qxd8+ Rxd8 29. Nxd8 Qxe4 30. Nc6 Qxf3 31. Nxb8 Qxf2+ 32. Kh1 Qf1+ 33. Kh2 Qf2+ 34. Kh1 Qf1+ 35. Kh2 Qf2+ 36. Kh1 1/2-1/2`;
    
    document.getElementById('pgn-input').value = samplePGN;
}

// Add sample game button (optional)
function addSampleButton() {
    const controls = document.querySelector('.controls');
    const sampleBtn = document.createElement('button');
    sampleBtn.textContent = 'Load Sample';
    sampleBtn.className = 'btn';
    sampleBtn.style.background = 'linear-gradient(145deg, #6c757d, #5a6268)';
    sampleBtn.style.color = 'white';
    sampleBtn.onclick = loadSampleGame;
    controls.appendChild(sampleBtn);
}

// Initialize with sample button
document.addEventListener('DOMContentLoaded', function() {
    addSampleButton();
});
